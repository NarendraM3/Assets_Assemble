import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.EMPLOYEES_TABLE || 'Assets_Employees';
const JWT_SECRET = process.env.JWT_SECRET;
const corsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://assets-management-frontend.s3.us-east-1.amazonaws.com',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
});

// NEW: Normalize RequiredHardwareCategory (array support + dedup + validation)
const normalizeRequiredHardwareCategory = (input) => {
  let categories = [];
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed) categories = [trimmed];
  } else if (Array.isArray(input)) {
    categories = input
      .map(cat => (typeof cat === 'string' ? cat.trim() : ''))
      .filter(cat => cat.length > 0);
    // Remove duplicates
    categories = [...new Set(categories)];
  }
  if (categories.length === 0) {
    throw new Error('At least one RequiredHardwareCategory is required for employees');
  }
  return categories;
};

// NEW: Backward compatibility normalizer for responses (string -> array)
const normalizeEmployeeForResponse = (item) => {
  if (!item) return null;
  const { Password, TempPassword, ...cleanEmployee } = item;
  if (cleanEmployee.RequiredHardwareCategory !== undefined) {
    if (typeof cleanEmployee.RequiredHardwareCategory === 'string') {
      const trimmed = cleanEmployee.RequiredHardwareCategory.trim();
      cleanEmployee.RequiredHardwareCategory = trimmed ? [trimmed] : [];
    } else if (!Array.isArray(cleanEmployee.RequiredHardwareCategory)) {
      cleanEmployee.RequiredHardwareCategory = [];
    }
  } else {
    cleanEmployee.RequiredHardwareCategory = [];
  }
  return cleanEmployee;
};

// Generate Employee ID (unchanged)
const generateEmployeeId = async () => {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    ProjectionExpression: 'EmployeeId',
  }));
  const items = result.Items || [];
  if (items.length === 0) return 'EMP1001';
  let maxNum = 0;
  for (const item of items) {
    if (item.EmployeeId) {
      const match = item.EmployeeId.match(/^EMP(\d+)$/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  }
  return `EMP${(maxNum + 1).toString().padStart(4, '0')}`;
};

// Secure random password generator
const generateSecureTempPassword = () => {
  const length = 12;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
 
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
 
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
 
  for (let i = 4; i < length; i++) {
    password += chars[crypto.randomInt(chars.length)];
  }
 
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Enhanced role normalization (unchanged)
const normalizeAndValidateRole = (roleInput) => {
  if (!roleInput || typeof roleInput !== 'string') {
    throw new Error('Role is required');
  }
  const raw = roleInput.trim();
  const normalizedForCompare = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  const roleMap = {
    'employee': 'Employee',
    'it_support_team': 'IT Support Team',
    'it support team': 'IT Support Team',
    'it support': 'IT Support Team',
    'it': 'IT Support Team',
    'asset_manager': 'Asset Manager',
    'assetmanager': 'Asset Manager',
    'asset manager': 'Asset Manager',
    'admin': 'Admin'
  };
  const normalizedRole = roleMap[normalizedForCompare];
  if (!normalizedRole) {
    throw new Error(`Invalid Role: ${raw}`);
  }
  return normalizedRole;
};

const validateEmployeeInput = (data) => {
  const required = ['FirstName', 'LastName', 'Email', 'Role', 'Department'];
  for (const field of required) {
    if (!data[field] || typeof data[field] !== 'string' || !data[field].trim()) {
      throw new Error(`Missing field: ${field}`);
    }
  }
  data.Role = normalizeAndValidateRole(data.Role);
  data.Email = data.Email.toLowerCase().trim();
};

const normalizePath = (path) => path ? path.replace(/^\/[^/]+(?=\/)/, '') || path : '';

// Send welcome email (unchanged)
const sendWelcomeEmail = async (firstName, email, tempPassword) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Welcome to Acme ITSM',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Acme ITSM</h2>
        <p>Hello ${firstName},</p>
        <p>Welcome to Acme ITSM.</p>
        <p><strong>Your account has been created successfully.</strong></p>
        <h3>Login Details</h3>
        <p><strong>Username:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p><strong>Login URL:</strong> <a href="https://your-domain/login">https://your-domain/login</a></p>
        <p>This password is temporary. For security reasons you will be required to change your password during your first login.</p>
        <p>Regards,<br>Acme IT Team</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
};

// GET /profile Handler (updated to use normalizer)
const getProfileHandler = async (event) => {
  console.log("PROFILE REQUEST");
 
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("No valid Authorization header");
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "Unauthorized" })
    };
  }
  const token = authHeader.split(' ')[1];
 
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded JWT:", { EmployeeId: decoded.EmployeeId, Email: decoded.Email, Role: decoded.Role });
   
    const employeeId = decoded.EmployeeId;
    if (!employeeId) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, message: "Invalid token" })
      };
    }
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { EmployeeId: employeeId }
    }));
    if (!result.Item) {
      console.log("Employee not found for ID:", employeeId);
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, message: "Employee not found" })
      };
    }
    console.log("Employee found:", employeeId);
    const cleanEmployee = normalizeEmployeeForResponse(result.Item);
    console.log("Profile returned successfully");
   
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        employee: cleanEmployee
      })
    };
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "Invalid or expired token" })
    };
  }
};

// UPDATED: POST /auth/change-password - Now uses JWT from header
const changePasswordHandler = async (event) => {
  console.log("CHANGE PASSWORD REQUEST");
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "Unauthorized" })
    };
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "Invalid or expired token" })
    };
  }
  const employeeId = decoded.EmployeeId;
  if (!employeeId) {
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "Invalid token" })
    };
  }
  const { oldPassword, newPassword } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  if (!oldPassword || !newPassword) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "oldPassword and newPassword are required" })
    };
  }
  // Fetch employee
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { EmployeeId: employeeId }
  }));
  const employee = result.Item;
  if (!employee) {
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, message: "Employee not found" })
    };
  }
  // Verify old password
  const isOldPasswordValid = await bcrypt.compare(oldPassword, employee.Password);
  if (!isOldPasswordValid) {
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: false,
        message: "Current password is incorrect."
      })
    };
  }
  // Hash new password
  const saltRounds = 12;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
  // Update only password-related fields using UpdateCommand
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { EmployeeId: employeeId },
    UpdateExpression: "SET Password = :password, ForcePasswordChange = :forceChange, PasswordChangedAt = :changedAt, UpdatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":password": hashedNewPassword,
      ":forceChange": false,
      ":changedAt": new Date().toISOString(),
      ":updatedAt": new Date().toISOString()
    }
  }));
  console.log("Password updated successfully for EmployeeId:", employeeId);
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      success: true,
      message: "Password changed successfully."
    })
  };
};

// Main Handler
export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.rawPath || "";
  const normalizedPath = normalizePath(path);
  const employeeIdParam = event.pathParameters?.employeeId || event.pathParameters?.id;
  console.log("Request Path:", path);
  let body = {};
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch (e) {
    console.error("Failed to parse request body");
  }
  try {
    // GET /profile
    if (method === 'GET' && normalizedPath.includes('/profile')) {
      return await getProfileHandler(event);
    }
    // POST /auth/change-password (UPDATED)
    if (method === 'POST' && normalizedPath.includes('/change-password')) {
      return await changePasswordHandler(event);
    }
    // POST /auth/login (unchanged)
    if (method === 'POST' && normalizedPath.includes('/login')) {
      console.log("Login request received");
      const { email, password } = body;
      if (!email || !password) {
        return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ success: false, message: "Email and password required" }) };
      }
      const normalizedEmail = email.toLowerCase().trim();
      let result;
      try {
        result = await docClient.send(new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "EmailIndex",
          KeyConditionExpression: "Email = :email",
          ExpressionAttributeValues: { ":email": normalizedEmail }
        }));
      } catch (e) {
        console.warn("EmailIndex failed, using Scan");
        result = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "Email = :email",
          ExpressionAttributeValues: { ":email": normalizedEmail }
        }));
      }
      const employee = result.Items?.[0];
      if (!employee) {
        return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ success: false, message: "Invalid credentials" }) };
      }
      const isPasswordValid = await bcrypt.compare(password, employee.Password);
      if (!isPasswordValid) {
        return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ success: false, message: "Invalid credentials" }) };
      }
      if (!employee.Role) {
        return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ success: false, message: "Invalid credentials" }) };
      }
      const token = jwt.sign(
        { EmployeeId: employee.EmployeeId, Email: employee.Email, Role: employee.Role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      const cleanEmployee = normalizeEmployeeForResponse(employee);
      const response = {
        success: true,
        token,
        employee: cleanEmployee
      };
      if (employee.ForcePasswordChange === true) {
        response.forcePasswordChange = true;
      }
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify(response)
      };
    }
    // POST /register (updated for array support)
    if (method === 'POST' && normalizedPath.includes('/register')) {
      console.log("=== EMPLOYEE REGISTRATION START ===");
      console.log("Incoming request body:", JSON.stringify(body, null, 2));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!body.Email || !emailRegex.test(body.Email)) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({
            success: false,
            message: "Invalid email address"
          })
        };
      }
      validateEmployeeInput(body);
      const role = body.Role;
      const isEmployee = role === 'Employee';
      if (isEmployee) {
        // Updated validation for array/string
        const hwInput = body.RequiredHardwareCategory;
        if (!hwInput || 
            (Array.isArray(hwInput) && hwInput.length === 0) || 
            (typeof hwInput === 'string' && !hwInput.trim())) {
          return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({
              success: false,
              message: "RequiredHardwareCategory is required"
            })
          };
        }
        const mandatoryFields = ['AllocationDate', 'AllocationTime'];
        for (const field of mandatoryFields) {
          if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
            return {
              statusCode: 400,
              headers: corsHeaders(),
              body: JSON.stringify({
                success: false,
                message: `${field} is required`
              })
            };
          }
        }
      }
      const normalizedEmail = body.Email;
      let duplicateCheck;
      try {
        duplicateCheck = await docClient.send(new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "EmailIndex",
          KeyConditionExpression: "Email = :email",
          ExpressionAttributeValues: { ":email": normalizedEmail }
        }));
      } catch (e) {
        console.warn("EmailIndex failed, falling back to Scan");
        duplicateCheck = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "Email = :email",
          ExpressionAttributeValues: { ":email": normalizedEmail }
        }));
      }
      if (duplicateCheck.Items && duplicateCheck.Items.length > 0) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({
            success: false,
            message: "Email already registered. Please use another email."
          })
        };
      }
      const empId = await generateEmployeeId();
      const tempPassword = generateSecureTempPassword();
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);
      const today = new Date().toISOString().split("T")[0];
      const employee = {
        EmployeeId: empId,
        FirstName: body.FirstName.trim(),
        LastName: body.LastName.trim(),
        Email: normalizedEmail,
        Username: normalizedEmail,
        Password: hashedPassword,
        ForcePasswordChange: true,
        PasswordCreatedAt: new Date().toISOString(),
        Role: body.Role,
        Department: body.Department.trim(),
        Designation: body.Designation?.trim() || "",
        JoiningDate: body.JoiningDate || today,
        RequiredHardwareCategory: normalizeRequiredHardwareCategory(body.RequiredHardwareCategory),
        AllocationDate: body.AllocationDate || "",
        AllocationTime: body.AllocationTime || "",
        Status: "Active",
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
        CreatedBy: "Admin"
      };
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: employee,
        ConditionExpression: 'attribute_not_exists(EmployeeId)'
      }));
      console.log("Employee registered successfully with ID:", empId);
      const emailSent = await sendWelcomeEmail(body.FirstName, normalizedEmail, tempPassword);
      const responseData = {
        EmployeeId: empId,
        normalizedRole: employee.Role
      };
      let message = "Employee registered successfully";
      if (!emailSent) {
        message = "Employee created successfully, but email could not be sent.";
      }
      return {
        statusCode: 201,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: true,
          message,
          data: responseData,
          emailSent
        })
      };
    }
    // GET /employees (updated to use normalizer)
    if (method === 'GET' && normalizedPath.includes('/employees') && !employeeIdParam) {
      const allItems = await getAllEmployees();
      const employees = allItems.map(item => normalizeEmployeeForResponse(item));
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true, employees }) };
    }
    // GET /employees/{employeeId} (updated to use normalizer)
    if (method === 'GET' && employeeIdParam) {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { EmployeeId: employeeIdParam }
      }));
      if (!result.Item) return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: 'Employee not found' }) };
      const employee = normalizeEmployeeForResponse(result.Item);
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(employee) };
    }
    // PATCH /employees/{employeeId} (updated to support RequiredHardwareCategory array)
    if (method === 'PATCH' && employeeIdParam) {
      if (!body || Object.keys(body).length === 0) return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ message: 'No data' }) };
      
      const updateExpressions = [];
      const expressionValues = {};
      let attrIndex = 0;

      // Support RequiredHardwareCategory as array (per requirements)
      if (body.RequiredHardwareCategory !== undefined) {
        const normalizedHw = normalizeRequiredHardwareCategory(body.RequiredHardwareCategory);
        updateExpressions.push(`RequiredHardwareCategory = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = normalizedHw;
        attrIndex++;
      }

      // Keep existing update capability for other fields (backward compatible)
      if (body.FirstName) {
        updateExpressions.push(`FirstName = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.FirstName.trim();
        attrIndex++;
      }
      if (body.LastName) {
        updateExpressions.push(`LastName = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.LastName.trim();
        attrIndex++;
      }
      if (body.Department) {
        updateExpressions.push(`Department = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.Department.trim();
        attrIndex++;
      }
      if (body.Designation !== undefined) {
        updateExpressions.push(`Designation = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = (body.Designation || "").trim();
        attrIndex++;
      }
      if (body.JoiningDate) {
        updateExpressions.push(`JoiningDate = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.JoiningDate;
        attrIndex++;
      }
      if (body.AllocationDate) {
        updateExpressions.push(`AllocationDate = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.AllocationDate;
        attrIndex++;
      }
      if (body.AllocationTime) {
        updateExpressions.push(`AllocationTime = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.AllocationTime;
        attrIndex++;
      }
      if (body.Status) {
        updateExpressions.push(`Status = :val${attrIndex}`);
        expressionValues[`:val${attrIndex}`] = body.Status;
        attrIndex++;
      }

      if (updateExpressions.length === 0) {
        return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ message: 'No valid fields to update' }) };
      }

      const updateExpression = 'SET ' + updateExpressions.join(', ') + ', UpdatedAt = :updatedAt';
      expressionValues[':updatedAt'] = new Date().toISOString();

      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { EmployeeId: employeeIdParam },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW'
      }));

      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ message: 'Updated' }) };
    }
    // DELETE /employees/{employeeId} (unchanged)
    if (method === 'DELETE' && employeeIdParam) {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { EmployeeId: employeeIdParam }
      }));
      return { statusCode: 204, headers: corsHeaders(), body: '' };
    }
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ message: 'Invalid endpoint' }) };
  } catch (error) {
    console.error("========== EMPLOYEE LAMBDA ERROR ==========");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Stack Trace:", error.stack);
    console.error("Request Body:", JSON.stringify(body, null, 2));
    console.error("================================================");
    if (error.message.includes('Invalid Role') || error.message.includes('Missing field') || error.message.includes('RequiredHardwareCategory')) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: false,
          message: error.message,
          errorType: error.name
        })
      };
    }
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: false,
          message: "Email or EmployeeId already exists",
          errorType: error.name
        })
      };
    }
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: false,
        message: error.message || "Internal Server Error",
        errorType: error.name
      })
    };
  }
};

const getAllEmployees = async () => {
  let allItems = [];
  let lastEvaluatedKey = undefined;
  do {
    const params = { TableName: TABLE_NAME, ExclusiveStartKey: lastEvaluatedKey };
    const result = await docClient.send(new ScanCommand(params));
    allItems = allItems.concat(result.Items || []);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return allItems;
};
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const TABLES = {
  EMPLOYEES: 'Assets_Employees',
  TICKETS: 'Assets_Tickets',
  ATTACHMENTS: 'Assets_Attachments',
  COMMENTS: 'Assets_TicketComments',
  ASSETS: 'Assets_Asset',
  ASSET_ASSIGNMENTS: 'Asset_Assignments'
};

const BUCKET = 'assets-attachment';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, employee-id, x-employee-id, role',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

function createSuccessResponse(data = {}, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, ...data })
  };
}

function createErrorResponse(message, statusCode = 400) {
  console.error(`Error ${statusCode}:`, message);
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, message })
  };
}

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT Decode Error:', e.message);
    return null;
  }
}

async function getEmployeeId(event) {
  console.log('=== AUTH AUDIT START ===');
  console.log('Path:', event.path || event.requestContext?.http?.path);
  console.log('Method:', event.httpMethod || event.requestContext?.http?.method);
  console.log('Full Headers:', JSON.stringify(event.headers || {}, null, 2));

  const authorizer = event.requestContext?.authorizer;
  let employeeId = null;

  if (authorizer?.jwt?.claims) {
    const claims = authorizer.jwt.claims;
    employeeId = claims.sub || claims['cognito:username'] || claims.email || claims.employeeId || claims.EmployeeId;
  } else if (authorizer?.claims) {
    const claims = authorizer.claims;
    employeeId = claims.sub || claims['cognito:username'] || claims.email || claims.employeeId || claims.EmployeeId;
  }

  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!employeeId && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = decodeJWT(token);
    if (decoded) employeeId = decoded.sub || decoded.employeeId || decoded.EmployeeId;
  }

  if (!employeeId) {
    employeeId = event.headers?.['employee-id'] || event.headers?.['x-employee-id'] || event.headers?.employeeId;
  }

  console.log('FINAL EmployeeId:', employeeId || 'NULL');
  console.log('=== AUTH AUDIT END ===');
  return employeeId;
}

function generateTicketId() {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TKT-${randomPart}`;
}

function parseMultipartFormData(body, boundary) {
  console.log('=== MULTIPART PARSER START ===');
  const parts = body.split(`--${boundary}`);
  const result = {};

  for (let part of parts) {
    part = part.trim();
    if (!part || part === '--') continue;

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.substring(0, headerEnd).trim();
    let content = part.substring(headerEnd + 4).trim();
    if (content.endsWith('--')) content = content.slice(0, -2);

    const nameMatch = headers.match(/name="([^"]+)"/i);
    const filenameMatch = headers.match(/filename="([^"]+)"/i);

    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        result[name] = {
          filename: filenameMatch[1],
          data: content,
          contentType: headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream'
        };
      } else {
        result[name] = content;
      }
    }
  }
  console.log('Parsed multipart fields:', Object.keys(result));
  console.log('=== MULTIPART PARSER END ===');
  return result;
}

// ==================== FIXED: GET EMPLOYEE ASSIGNED ASSETS ====================
async function getEmployeeAssignedAssets(event) {
  try {
    console.log('=== GET EMPLOYEE ASSIGNED ASSETS START ===');
    const employeeId = await getEmployeeId(event);
    if (!employeeId) {
      return createErrorResponse('Authentication required', 401);
    }

    console.log("EmployeeId:", employeeId);

    // 1. Check direct assignment in employee record (keep existing logic)
    const empResult = await docClient.send(new GetCommand({
      TableName: TABLES.EMPLOYEES,
      Key: { EmployeeId: employeeId }
    }));

    let assignedAssetIds = new Set();

    if (empResult.Item) {
      const employee = empResult.Item;
      if (employee.AssignedAssetId) assignedAssetIds.add(employee.AssignedAssetId);
      if (employee.AssignedAssetIds && Array.isArray(employee.AssignedAssetIds)) {
        employee.AssignedAssetIds.forEach(id => assignedAssetIds.add(id));
      }
      if (employee.assignedAssetIds && Array.isArray(employee.assignedAssetIds)) {
        employee.assignedAssetIds.forEach(id => assignedAssetIds.add(id));
      }
    }

    // 2. Scan Asset_Assignments table (as requested)
    try {
      const assignmentsResult = await docClient.send(
        new ScanCommand({
          TableName: TABLES.ASSET_ASSIGNMENTS,
          FilterExpression: "EmployeeId = :empId",
          ExpressionAttributeValues: {
            ":empId": employeeId
          }
        })
      );

      console.log("Assignments:", JSON.stringify(assignmentsResult.Items, null, 2));

      if (assignmentsResult.Items && assignmentsResult.Items.length > 0) {
        assignmentsResult.Items.forEach(assignment => {
          if (
            assignment.Status === "Assigned" ||
            assignment.AssignmentStatus === "Assigned"
          ) {
            if (assignment.AssetId) {
              assignedAssetIds.add(assignment.AssetId);
            }
          }
        });
      }
    } catch (scanErr) {
      console.error("Error scanning Asset_Assignments:", scanErr.message);
    }

    console.log("Assigned Asset IDs:", Array.from(assignedAssetIds));

    if (assignedAssetIds.size === 0) {
      console.log("No assigned assets found for employee");
      return createSuccessResponse({ assets: [] });
    }

    // 3. Fetch full asset details
    const assets = [];
    for (const assetId of assignedAssetIds) {
      try {
        console.log("Fetching Asset:", assetId);

        const assetResult = await docClient.send(new GetCommand({
          TableName: TABLES.ASSETS,
          Key: { AssetId: assetId }
        }));

        console.log("Asset Result:", JSON.stringify(assetResult.Item, null, 2));

        if (assetResult.Item) {
          const a = assetResult.Item;
          assets.push({
            assetId: a.AssetId,
            assetName: a.AssetName,
            category: a.Category,
            brand: a.Brand,
            model: a.Model,
            serialNumber: a.SerialNumber,
            status: a.Status
          });
        } else {
          console.warn(`Warning: Asset record not found for AssetId: ${assetId}`);
        }
      } catch (assetErr) {
        console.error(`Error fetching asset ${assetId}:`, assetErr.message);
      }
    }

    console.log(`Returning ${assets.length} assigned assets`);
    return createSuccessResponse({ assets });

  } catch (error) {
    console.error('Get employee assigned assets error:', error);
    return createErrorResponse('Failed to fetch assigned assets', 500);
  }
}

// ==================== UNCHANGED BUSINESS FUNCTIONS ====================
async function createTicket(event) { 
  try {
    console.log('=== CREATE TICKET START ===');
    const employeeId = await getEmployeeId(event);
    if (!employeeId) return createErrorResponse('Authentication required', 401);

    const body = JSON.parse(event.body || '{}');
    const empResult = await docClient.send(new GetCommand({
      TableName: TABLES.EMPLOYEES,
      Key: { EmployeeId: employeeId }
    }));

    if (!empResult.Item) return createErrorResponse('Employee not found', 404);

    const now = new Date().toISOString();
    const ticketId = generateTicketId();

    const ticket = {
      TicketId: ticketId,
      EmployeeId: employeeId,
      CreatedBy: employeeId,
      EmployeeName: empResult.Item.Name || empResult.Item.EmployeeName || '',
      Department: body.department || '',
      Title: body.title || body.Title || '',
      Category: body.category || body.Category || '',
      RelatedAssetId: body.asset_id || null,
      Description: body.description || body.Description || '',
      Priority: body.priority || 'Medium',
      Status: 'Open',
      AssignedTo: '',
      Resolution: '',
      Attachments: [],
      Comments: [],
      CreatedAt: now,
      UpdatedAt: now
    };

    await docClient.send(new PutCommand({ TableName: TABLES.TICKETS, Item: ticket }));

    console.log(`Ticket created: ${ticketId}`);
    return createSuccessResponse({ message: "Ticket created successfully", ticketId, ticket }, 201);
  } catch (error) {
    console.error('Create ticket error:', error);
    return createErrorResponse('Failed to create ticket', 500);
  }
}

async function getEmployeeTickets(event) { 
  try {
    console.log('=== GET EMPLOYEE TICKETS START ===');
    const employeeId = await getEmployeeId(event);
    if (!employeeId) return createErrorResponse('Authentication required', 401);

    let result = await docClient.send(new QueryCommand({
      TableName: TABLES.TICKETS,
      IndexName: 'EmployeeIdIndex',
      KeyConditionExpression: 'EmployeeId = :eid',
      ExpressionAttributeValues: { ':eid': employeeId }
    })).catch(() => docClient.send(new ScanCommand({
      TableName: TABLES.TICKETS,
      FilterExpression: 'EmployeeId = :eid',
      ExpressionAttributeValues: { ':eid': employeeId }
    })));

    let tickets = result.Items || [];
    tickets = await Promise.all(tickets.map(async (t) => {
      const atts = await docClient.send(new QueryCommand({
        TableName: TABLES.ATTACHMENTS,
        IndexName: 'TicketIdIndex',
        KeyConditionExpression: 'TicketId = :tid',
        ExpressionAttributeValues: { ':tid': t.TicketId }
      }));
      return { ...t, attachments: atts.Items || [] };
    }));

    tickets.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    return createSuccessResponse({ tickets });
  } catch (error) {
    console.error('Get employee tickets error:', error);
    return createErrorResponse('Failed to fetch tickets', 500);
  }
}

async function getITTickets(event) {
  try {
    console.log('=== GET IT SUPPORT TICKETS START ===');
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.TICKETS }));
    let tickets = result.Items || [];

    tickets = await Promise.all(tickets.map(async (t) => {
      const atts = await docClient.send(new QueryCommand({
        TableName: TABLES.ATTACHMENTS,
        IndexName: 'TicketIdIndex',
        KeyConditionExpression: 'TicketId = :tid',
        ExpressionAttributeValues: { ':tid': t.TicketId }
      }));
      return { ...t, attachments: atts.Items || [] };
    }));

    tickets.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

    const formattedTickets = tickets.map(t => ({
      ticketId: t.TicketId,
      employeeId: t.EmployeeId,
      title: t.Title,
      category: t.Category,
      priority: t.Priority,
      status: t.Status,
      assignedTo: t.AssignedTo || '',
      createdAt: t.CreatedAt,
      updatedAt: t.UpdatedAt,
      description: t.Description,
      employeeName: t.EmployeeName,
      EstimatedResolutionTime: t.EstimatedResolutionTime || "",
      estimatedResolutionTime: t.EstimatedResolutionTime || "",
      estimatedTime: t.EstimatedResolutionTime || "",
      attachments: t.attachments || []
    }));

    return createSuccessResponse({ tickets: formattedTickets });
  } catch (error) {
    console.error('Get IT Tickets Error:', error);
    return createErrorResponse('Failed to fetch IT tickets', 500);
  }
}

async function uploadAttachment(event) { 
  console.log('=== UPLOAD ATTACHMENT START ===');
  const employeeId = await getEmployeeId(event);
  if (!employeeId) return createErrorResponse('Authentication required', 401);

  try {
    return createSuccessResponse({ message: "Attachment uploaded" });
  } catch (e) {
    return createErrorResponse('Upload failed', 500);
  }
}

// ==================== HANDLER ====================
export const handler = async (event) => {
  console.log('=== REQUEST RECEIVED ===');
  console.log('event.path:', event.path);
  console.log('event.rawPath:', event.rawPath);
  console.log('event.requestContext.http.path:', event.requestContext?.http?.path);
  console.log('event.httpMethod:', event.httpMethod);
  console.log('event.requestContext.http.method:', event.requestContext?.http?.method);

  const rawPath = event.rawPath || event.path || event.requestContext?.http?.path || '';
  const method = event.requestContext?.http?.method || event.httpMethod || '';

  let normalizedPath = rawPath.replace(/^\/(prod|dev|stage|default)/, '').replace(/^\/+/, '/');
  if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;

  console.log("Resolved Path:", normalizedPath);
  console.log("Resolved Method:", method);

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (method === 'POST' && normalizedPath === '/create-ticket') {
    return await createTicket(event);
  }
  if (method === 'GET' && normalizedPath === '/employee-tickets') {
    return await getEmployeeTickets(event);
  }
  if (method === 'GET' && (normalizedPath === '/it-support/tickets' || normalizedPath === '/it-tickets')) {
    return await getITTickets(event);
  }
  if (method === 'POST' && normalizedPath === '/upload-attachment') {
    return await uploadAttachment(event);
  }
  if (method === 'GET' && normalizedPath === '/employee/assigned-assets') {
    return await getEmployeeAssignedAssets(event);
  }
  if (method === 'GET' && normalizedPath === '/profile') {
    // return await getProfile(event);
  }

  console.warn(`No route matched for ${method} ${normalizedPath}`);
  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      message: "Route not found",
      path: normalizedPath,
      method: method,
      rawPath: rawPath
    })
  };
};
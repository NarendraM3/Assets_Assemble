// index.mjs - ASSET MANAGER LAMBDA (PARTIAL + RE-ALLOCATION SUPPORT) - UPDATED
import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const ASSETS_TABLE = 'Assets_Asset';
const EMPLOYEES_TABLE = 'Assets_Employees';
const ASSIGNMENTS_TABLE = 'Asset_Assignments';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
};

const createResponse = (statusCode, body) => {
  const response = {
    statusCode,
    headers: { ...corsHeaders },
    body: JSON.stringify(body)
  };
  console.log(`[RESPONSE] Status: ${statusCode} | Success: ${body?.success}`);
  return response;
};

const handleOptions = () => {
  console.log('[CORS] OPTIONS preflight handled');
  return {
    statusCode: 200,
    headers: { ...corsHeaders },
    body: ''
  };
};

const getCurrentUser = (event) => {
  return event.requestContext?.authorizer?.claims?.sub ||
         event.requestContext?.authorizer?.claims?.username ||
         'system';
};

const getPath = (event) => {
  const path = event.rawPath || event.requestContext?.http?.path || event.path || "";
  console.log(`[DEBUG] Resolved Path: "${path}"`);
  return path;
};

const getMethod = (event) => {
  return event.requestContext?.http?.method || event.httpMethod || "";
};

// ==================== HELPER: Parse Required Hardware Categories ====================
const parseRequiredCategories = (rawCategory) => {
  if (!rawCategory) return [];
  return rawCategory.toString()
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
};

// ==================== MAIN HANDLER ====================
export const handler = async (event) => {
  console.log("FULL EVENT:", JSON.stringify(event, null, 2));

  const method = getMethod(event);
  const path = getPath(event);
  const routeKey = `${method} ${path}`;
  console.log(`[INCOMING REQUEST] ${routeKey}`);

  try {
    if (method === 'OPTIONS') return handleOptions();

    if (method === 'POST' && path.match(/^\/asset-manager\/onboarding\/[^/]+\/verify$/)) {
      console.log("Matched Route: postOnboardingVerifyWithEmployeeId");
      return await postOnboardingVerifyWithEmployeeId(event);
    }

    if (method === 'POST' && path === '/asset-manager/onboarding/verify') {
      console.log("Matched Route: postOnboardingVerify");
      return await postOnboardingVerify(event);
    }
    if (method === 'POST' && path === '/asset-manager/onboarding/out-of-stock') {
      console.log("Matched Route: postOnboardingOutOfStock");
      return await postOnboardingOutOfStock(event);
    }

    if (method === 'GET') {
      if (path.startsWith('/asset-manager/onboarding/check-inventory/') || 
          (path.startsWith('/asset-manager/onboarding/') && path.includes('/inventory'))) {
        console.log("Matched Route: getOnboardingInventoryCheck");
        return await getOnboardingInventoryCheck(event);
      }
      if (path === '/asset-manager/pending' || path === '/asset-manager/onboarding/pending') {
        console.log("Matched Route: getPendingOnboarding");
        return await getPendingOnboarding(event);
      }
      if (path.startsWith('/asset-manager/onboarding/') && 
          !path.includes('/check-inventory/') && 
          !path.includes('/inventory') && 
          !path.endsWith('/pending')) {
        console.log("Matched Route: getOnboardingEmployee");
        return await getOnboardingEmployee(event);
      }
      if (path === '/asset-manager' || path === '/asset-manager/' || path === '/asset-manager/assets') {
        console.log("Matched Route: getAssetManager");
        return await getAssetManager(event);
      }
      if (path === '/asset-manager/dashboard') {
        console.log("Matched Route: getDashboard");
        return await getDashboard(event);
      }
      if (path === '/asset-manager/employees') {
        console.log("Matched Route: getEmployees");
        return await getEmployees(event);
      }
      if (path === '/asset-manager/assignments') {
        console.log("Matched Route: getAssignments");
        return await getAssignments(event);
      }
      if (path.includes('/employee/assets/')) {
        console.log("Matched Route: getEmployeeAssets");
        return await getEmployeeAssets(event);
      }
    }

    if (method === 'POST') {
      if (path === '/asset-manager' || path === '/asset-manager/assets') {
        console.log("Matched Route: createAsset");
        return await createAsset(event);
      }
      if (path === '/asset-manager/assign-assets') {
        console.log("Matched Route: assignAssets");
        return await assignAssets(event);
      }
    }

    if (method === 'PATCH') {
      if (path === '/asset-manager/approve' || path.startsWith('/asset-manager/approve/')) {
        console.log("Matched Route: approveAsset");
        return await approveAsset(event);
      }
      if (path === '/asset-manager/reject' || path.startsWith('/asset-manager/reject/')) {
        console.log("Matched Route: rejectAsset");
        return await rejectAsset(event);
      }
    }

    console.log("Matched Route: 404 - Not Found");
    return createResponse(404, { success: false, error: 'Route not found' });
  } catch (error) {
    console.error(`[GLOBAL ERROR]`, error);
    return createResponse(500, {
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};

// ==================== INVENTORY CHECK (unchanged from previous) ====================
const checkOnboardingInventory = async (employeeId) => {
  console.log(`[checkOnboardingInventory] START for EmployeeId: ${employeeId}`);
  try {
    const empRes = await dynamoDB.send(new GetCommand({
      TableName: EMPLOYEES_TABLE,
      Key: { EmployeeId: employeeId }
    }));

    if (!empRes.Item) {
      return { success: true, employeeId, inventory: [], inventoryAvailable: false, missingCategories: [] };
    }

    const employee = empRes.Item;
    const requiredRaw = employee.RequiredHardwareCategory || employee.requiredHardwareCategory || '';
    const employeeLocationRaw = employee.OfficeLocation || employee.Location || employee.location || '';

    const requiredCategories = parseRequiredCategories(requiredRaw);
    const employeeLocation = employeeLocationRaw.trim();

    console.log("Required Categories:", requiredCategories);
    console.log("Employee Location:", employeeLocation || "(empty)");

    if (requiredCategories.length === 0) {
      return { success: true, employeeId, inventory: [], inventoryAvailable: true, missingCategories: [] };
    }

    const assetsRes = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE }));
    const allAssets = assetsRes.Items || [];

    const inventory = [];
    const missingCategories = [];

    for (const category of requiredCategories) {
      const normalizedCategory = category.toLowerCase();
      let availableAssets = [];

      allAssets.forEach(asset => {
        if (!asset) return;
        const assetCategoryRaw = asset.Category || asset.category || '';
        const assetStatusRaw = asset.Status || asset.status || '';
        const assetLocationRaw = asset.Location || asset.location || '';

        const assetCategory = assetCategoryRaw.trim().toLowerCase();
        const assetStatus = assetStatusRaw.trim().toLowerCase();
        const assetLocation = assetLocationRaw.trim();

        if (assetCategory === normalizedCategory && assetStatus === 'available') {
          if (!employeeLocation || assetLocation.toLowerCase() === employeeLocation.toLowerCase()) {
            availableAssets.push({
              AssetId: asset.AssetId || asset.assetId,
              AssetName: asset.AssetName || asset.assetName || 'Unnamed Asset',
              Category: assetCategoryRaw,
              ...asset
            });
          }
        }
      });

      const availableCount = availableAssets.length;
      const selectedAsset = availableAssets.length > 0 ? availableAssets[0] : null;

      inventory.push({
        category: category,
        available: availableCount > 0,
        availableCount,
        selectedAsset
      });

      if (availableCount === 0) {
        missingCategories.push(category);
      }
    }

    return {
      success: true,
      employeeId,
      inventory,
      inventoryAvailable: missingCategories.length === 0,
      missingCategories
    };
  } catch (error) {
    console.error("[checkOnboardingInventory] ERROR", error);
    return { success: false, employeeId, inventory: [], inventoryAvailable: false, missingCategories: [], error: error.message };
  }
};

const getOnboardingInventoryCheck = async (event) => {
  try {
    const path = getPath(event);
    let employeeId = event.pathParameters?.employeeId;
    if (!employeeId) {
      const pathParts = path.split('/').filter(Boolean);
      employeeId = pathParts[pathParts.length - 1];
    }
    const result = await checkOnboardingInventory(employeeId);
    return createResponse(200, result);
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

// ==================== UPDATED VERIFY HANDLER - SUPPORTS RE-ALLOCATION ====================
const postOnboardingVerifyWithEmployeeId = async (event) => {
  console.log("[postOnboardingVerifyWithEmployeeId] START - RE-ALLOCATION SUPPORT");
  try {
    const body = JSON.parse(event.body || '{}');
    const employeeId = event.pathParameters?.employeeId || body.employeeId;
    const { verificationStatus, remarks = "" } = body;

    const verifiedBy = getCurrentUser(event);
    const now = new Date().toISOString();

    if (!employeeId || !verificationStatus || verificationStatus !== "Verified") {
      return createResponse(400, { success: false, error: 'Missing or invalid verificationStatus' });
    }

    const empRes = await dynamoDB.send(new GetCommand({
      TableName: EMPLOYEES_TABLE,
      Key: { EmployeeId: employeeId }
    }));

    if (!empRes.Item) {
      return createResponse(404, { success: false, error: `Employee ${employeeId} not found` });
    }

    const employee = empRes.Item;

    // Get current state
    const existingAssigned = employee.AssignedAssets || [];
    const existingPending = employee.PendingAssets || [];
    const requiredRaw = employee.RequiredHardwareCategory || employee.requiredHardwareCategory || '';
    const requiredCategoriesSet = new Set(parseRequiredCategories(requiredRaw));

    // Fresh inventory check
    const inventoryCheck = await checkOnboardingInventory(employeeId);

    const newlyAllocated = [];
    const stillPending = [];

    // Process each required category
    for (const invItem of inventoryCheck.inventory) {
      const cat = invItem.category;

      // Already allocated previously → keep it
      if (existingAssigned.some(a => a.Category === cat)) {
        continue;
      }

      // Check if now available
      if (invItem.available && invItem.selectedAsset) {
        newlyAllocated.push({
          AssetId: invItem.selectedAsset.AssetId,
          Category: cat,
          Status: "Allocated"
        });
      } else {
        stillPending.push({
          Category: cat,
          Status: "Pending"
        });
      }
    }

    // Combine with previous allocations
    const finalAssigned = [...existingAssigned, ...newlyAllocated];
    const finalPending = stillPending;

    const hasAnyAllocation = finalAssigned.length > 0;
    const allCategoriesAllocated = finalPending.length === 0 && finalAssigned.length === requiredCategoriesSet.size;

    let verificationStatusFinal = "Verified";
    let workflowState = "PENDING_IT_SUPPORT";
    let onboardingStatus = "Pending IT Support";

    if (!hasAnyAllocation) {
      verificationStatusFinal = "Out of Stock";
      workflowState = "WAITING_FOR_PROCUREMENT";
      onboardingStatus = "Waiting for Procurement";
    } else if (!allCategoriesAllocated) {
      workflowState = "PENDING_REMAINING_ASSETS";
      onboardingStatus = "Waiting for Remaining Hardware";
    }

    // Update allocated assets in Asset table
    for (const alloc of newlyAllocated) {
      await updateAssetForVerification(alloc.AssetId, employeeId, now);
    }

    // Update Employee record
    const employeeFields = {
      InventoryVerified: true,
      InventoryAvailable: hasAnyAllocation,
      VerificationStatus: verificationStatusFinal,
      OnboardingStatus: onboardingStatus,
      CurrentWorkflowState: workflowState,
      AssignedAssets: finalAssigned,
      PendingAssets: finalPending,
      AssignedAssetId: finalAssigned[0]?.AssetId || null, // Backward compatibility
      VerificationRemarks: remarks || employee.VerificationRemarks,
      InventoryVerifiedAt: now,
      VerifiedBy: verifiedBy,
      UpdatedAt: now
    };

    await updateEmployeeOnboarding(employeeId, employeeFields);

    // Create new assignment records
    if (newlyAllocated.length > 0) {
      await createAssignmentRecords(employeeId, newlyAllocated, verifiedBy, now);
    }

    return createResponse(200, { 
      success: true, 
      employeeId,
      newlyAllocated,
      finalAssigned,
      finalPending,
      message: allCategoriesAllocated 
        ? "All assets allocated successfully" 
        : (newlyAllocated.length > 0 ? "Partial re-allocation completed" : "Still waiting for some assets")
    });

  } catch (error) {
    console.error("[postOnboardingVerifyWithEmployeeId] FAILED", error);
    return createResponse(500, {
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};

// ==================== HELPERS ====================
const updateAssetForVerification = async (assetId, employeeId, timestamp = null) => {
  const now = timestamp || new Date().toISOString();
  try {
    const params = {
      TableName: ASSETS_TABLE,
      Key: { AssetId: assetId },
      UpdateExpression: "SET #status = :status, #assignedTo = :assignedTo, #assignedAt = :assignedAt, #updated = :updated",
      ExpressionAttributeNames: {
        "#status": "Status",
        "#assignedTo": "AssignedTo",
        "#assignedAt": "AssignedAt",
        "#updated": "UpdatedAt"
      },
      ExpressionAttributeValues: {
        ":status": "Allocated",
        ":assignedTo": employeeId,
        ":assignedAt": now,
        ":updated": now
      }
    };

    await dynamoDB.send(new UpdateCommand(params));
    console.log(`Asset ${assetId} allocated`);
  } catch (err) {
    console.error(`Asset update failed ${assetId}:`, err.message);
    throw err;
  }
};

const createAssignmentRecords = async (employeeId, allocatedAssets, verifiedBy, timestamp) => {
  for (const alloc of allocatedAssets) {
    const assignment = {
      AssignmentId: `ASSIGN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      EmployeeId: employeeId,
      AssetId: alloc.AssetId,
      Category: alloc.Category,
      AssignedBy: verifiedBy,
      AssignedAt: timestamp,
      Status: "Active",
      CreatedAt: timestamp
    };

    await dynamoDB.send(new PutCommand({
      TableName: ASSIGNMENTS_TABLE,
      Item: assignment
    }));
  }
};

const updateEmployeeOnboarding = async (employeeId, fields) => {
  try {
    const now = new Date().toISOString();
    const updateExpressionParts = [];
    const expressionValues = {};
    const expressionNames = {};

    Object.keys(fields).forEach((key, index) => {
      if (fields[key] !== undefined && fields[key] !== null) {
        const nameKey = `#f${index}`;
        const valKey = `:v${index}`;
        updateExpressionParts.push(`${nameKey} = ${valKey}`);
        expressionNames[nameKey] = key;
        expressionValues[valKey] = fields[key];
      }
    });

    if (!Object.keys(fields).some(k => k === 'UpdatedAt')) {
      expressionValues[':updated'] = now;
      updateExpressionParts.push('#updated = :updated');
      expressionNames['#updated'] = 'UpdatedAt';
    }

    const params = {
      TableName: EMPLOYEES_TABLE,
      Key: { EmployeeId: employeeId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    };

    await dynamoDB.send(new UpdateCommand(params));
  } catch (err) {
    console.error("Employee Update FAILED:", err);
    throw err;
  }
};

// ==================== REMAINING HANDLERS (UNCHANGED) ====================
const postOnboardingOutOfStock = async (event) => {
  console.log("OUT OF STOCK HANDLER CALLED");
  try {
    const body = JSON.parse(event.body || '{}');
    const { employeeId, remarks = "" } = body;
    if (!employeeId) return createResponse(400, { success: false, error: 'employeeId is required' });

    const now = new Date().toISOString();
    const verifiedBy = getCurrentUser(event);

    const updateFields = {
      InventoryVerified: true,
      InventoryAvailable: false,
      VerificationStatus: "Out of Stock",
      OnboardingStatus: "Waiting for Procurement",
      CurrentWorkflowState: "WAITING_FOR_PROCUREMENT",
      VerificationRemarks: remarks,
      InventoryVerifiedAt: now,
      VerifiedBy: verifiedBy,
      UpdatedAt: now
    };

    await updateEmployeeOnboarding(employeeId, updateFields);
    return createResponse(200, { success: true, message: "Out of stock updated successfully", employeeId });
  } catch (error) {
    console.error("[postOnboardingOutOfStock] ERROR", error);
    return createResponse(500, { success: false, message: error.message, stack: error.stack });
  }
};

const postOnboardingVerify = async (event) => createResponse(200, { success: true, message: "Use new path with employeeId" });

const getDashboard = async (event) => { 
  try {
    const [assetsRes, employeesRes] = await Promise.all([
      dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE })),
      dynamoDB.send(new ScanCommand({ TableName: EMPLOYEES_TABLE }))
    ]);
    const assets = assetsRes.Items || [];
    const employees = employeesRes.Items || [];
    const totalAssets = assets.length;
    const availableAssets = assets.filter(a => String(a.Status || a.status || '').toLowerCase() === 'available').length;
    const assignedAssets = assets.filter(a => ['assigned', 'reserved', 'allocated'].includes(String(a.Status || a.status || '').toLowerCase())).length;
    const pendingOnboarding = employees.filter(e =>
      e.CurrentWorkflowState?.includes('Pending') || e.OnboardingStatus?.includes('Pending')
    ).length;
    return createResponse(200, {
      success: true,
      dashboard: { totalAssets, availableAssets, assignedAssets, pendingOnboarding, totalEmployees: employees.length }
    });
  } catch (error) {
    return createResponse(200, { success: true, dashboard: { totalAssets: 0, availableAssets: 0, assignedAssets: 0, pendingOnboarding: 0, totalEmployees: 0 } });
  }
};

const getAssetManager = async (event) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE }));
    const assets = (result.Items || []).map(asset => ({
      ...asset,
      Status: asset.Status || asset.status || 'Available',
      AssetName: asset.AssetName || asset.assetName || 'Unnamed Asset'
    }));
    return createResponse(200, { success: true, assets, count: assets.length });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const getPendingOnboarding = async (event) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: EMPLOYEES_TABLE }));
    return createResponse(200, { success: true, employees: result.Items || [] });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const getEmployees = async (event) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: EMPLOYEES_TABLE }));
    return createResponse(200, { success: true, data: result.Items || [] });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const getOnboardingEmployee = async (event) => {
  try {
    const employeeId = getPath(event).split('/').pop();
    const result = await dynamoDB.send(new GetCommand({ TableName: EMPLOYEES_TABLE, Key: { EmployeeId: employeeId } }));
    return result.Item ? createResponse(200, { success: true, data: result.Item }) : createResponse(404, { success: false, error: "Employee not found" });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const getEmployeeAssets = async (event) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE }));
    return createResponse(200, { success: true, assets: result.Items || [] });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const getAssignments = async (event) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: ASSIGNMENTS_TABLE }));
    return createResponse(200, { success: true, assignments: result.Items || [] });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const createAsset = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();
    const assetId = await generateSequentialAssetId();
    const newAsset = { AssetId: assetId, ...body, Status: "Available", CreatedAt: now, UpdatedAt: now };
    await dynamoDB.send(new PutCommand({ TableName: ASSETS_TABLE, Item: newAsset }));
    return createResponse(201, { success: true, asset: newAsset });
  } catch (error) {
    return createResponse(500, { success: false, message: error.message });
  }
};

const generateSequentialAssetId = async () => {
  try {
    const scanRes = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE, ProjectionExpression: "AssetId" }));
    const items = scanRes.Items || [];
    let maxNum = 0;
    items.forEach(item => {
      const aid = item.AssetId || '';
      if (aid.startsWith('AST')) {
        const numPart = parseInt(aid.substring(3), 10);
        if (!isNaN(numPart)) maxNum = Math.max(maxNum, numPart);
      }
    });
    return `AST${String(maxNum + 1).padStart(3, '0')}`;
  } catch {
    return `AST${String(Date.now()).slice(-6)}`;
  }
};

const assignAssets = async (event) => createResponse(200, { success: true, message: "Assigned" });
const approveAsset = async (event) => createResponse(200, { success: true, message: "Approve endpoint" });
const rejectAsset = async (event) => createResponse(200, { success: true, message: "Reject endpoint" });
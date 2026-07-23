// index.mjs - ASSET MANAGER LAMBDA - FULL FIXES APPLIED
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

// ==================== NORMALIZE HELPER ====================
const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

// ==================== HELPER: Parse Required Hardware Categories ====================
const parseRequiredCategories = (rawCategory) => {
  if (!rawCategory) return [];
  return rawCategory.toString()
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
};

// ==================== GET ASSET CATEGORY (MULTI-FIELD SUPPORT) ====================
const getAssetCategory = (asset) => {
  return asset.Category ||
         asset.AssetCategory ||
         asset.category ||
         asset.assetCategory ||
         '';
};

const getAssetStatus = (asset) => {
  return asset.Status ||
         asset.status ||
         '';
};

const getAssetLocation = (asset) => {
  return asset.Location ||
         asset.location ||
         asset.OfficeLocation ||
         '';
};

// ==================== DYNAMIC EMPLOYEE ALLOCATION STATUS CALCULATOR (CORE FIX) ====================
const calculateEmployeeAllocationStatus = async (employee) => {
  if (!employee) return null;

  const requiredRaw = employee.RequiredHardwareCategory || employee.requiredHardwareCategory || '';
  const requiredCategories = parseRequiredCategories(requiredRaw);

  if (requiredCategories.length === 0) {
    return {
      AssignedAssets: [],
      PendingAssets: [],
      RemainingAssets: [],
      AllocationProgress: 100,
      CanAllocate: false,
      CurrentWorkflowState: "PENDING_IT_SUPPORT",
      VerificationStatus: "Verified"
    };
  }

  // Get fresh inventory
  const assetsRes = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE }));
  const allAssets = assetsRes.Items || [];

  const assignedMap = new Map();
  const existingAssigned = employee.AssignedAssets || [];

  existingAssigned.forEach(ass => {
    if (ass?.Category) {
      assignedMap.set(normalize(ass.Category), ass);
    }
  });

  const pendingCategories = [];
  const newlyAvailableForAllocation = [];

  for (const category of requiredCategories) {
    const normCat = normalize(category);
    const alreadyAssigned = assignedMap.has(normCat);
    if (alreadyAssigned) continue;

    let hasAvailable = false;
    let selectedAsset = null;
    for (const asset of allAssets) {
      const assetCatNorm = normalize(getAssetCategory(asset));
      const assetStatNorm = normalize(getAssetStatus(asset));
      const assetLocNorm = normalize(getAssetLocation(asset));
      const empLocNorm = normalize(employee.OfficeLocation || employee.Location || employee.location || '');

      if (assetCatNorm === normCat &&
          assetStatNorm === 'available' &&
          (!empLocNorm || assetLocNorm === empLocNorm)) {
        hasAvailable = true;
        selectedAsset = asset;
        break;
      }
    }

    if (hasAvailable) {
      newlyAvailableForAllocation.push({
        Category: category,
        availableAsset: selectedAsset
      });
    } else {
      pendingCategories.push({ Category: category, Status: "Pending" });
    }
  }

  const finalAssigned = [...existingAssigned];
  const finalPending = pendingCategories;
  const totalRequired = requiredCategories.length;
  const allocatedCount = finalAssigned.length;
  const progress = totalRequired > 0 ? Math.round((allocatedCount / totalRequired) * 100) : 100;

  const canAllocate = newlyAvailableForAllocation.length > 0;

  let workflowState = employee.CurrentWorkflowState || "PENDING_IT_SUPPORT";
  let verificationStatus = employee.VerificationStatus || "Pending";

  if (finalPending.length === 0) {
    workflowState = "PENDING_IT_SUPPORT";
    verificationStatus = "Verified";
  } else if (allocatedCount > 0) {
    workflowState = "PENDING_REMAINING_ASSETS";
    verificationStatus = "Partial Allocation";
  } else {
    workflowState = "WAITING_FOR_PROCUREMENT";
    verificationStatus = "Out of Stock";
  }

  return {
    AssignedAssets: finalAssigned,
    PendingAssets: finalPending,
    RemainingAssets: finalPending,
    AllocationProgress: progress,
    CanAllocate: canAllocate,
    CurrentWorkflowState: workflowState,
    VerificationStatus: verificationStatus,
    newlyAvailableForAllocation
  };
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
      if (path === '/asset-manager/employees' || path === '/admin/employees') {
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
      if (path === '/asset-manager/bulk') {
        console.log("Matched Route: bulkUploadAssets");
        return await bulkUploadAssets(event);
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
    console.error("[GLOBAL ERROR]", error);
    return createResponse(500, {
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};

// ==================== INVENTORY CHECK ====================
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

    console.log("[Allocation Check] EmployeeId:", employeeId);
    console.log("[Allocation Check] Required Categories:", requiredCategories);
    console.log("[Allocation Check] Employee Location:", employeeLocation || "(empty)");

    if (requiredCategories.length === 0) {
      return { success: true, employeeId, inventory: [], inventoryAvailable: true, missingCategories: [] };
    }

    const assetsRes = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE }));
    const allAssets = assetsRes.Items || [];

    const inventory = [];
    const missingCategories = [];

    for (const category of requiredCategories) {
      const normalizedCategory = normalize(category);
      let availableAssets = [];
      const rejected = [];

      allAssets.forEach((asset) => {
        if (!asset) return;
        const assetCategoryRaw = getAssetCategory(asset);
        const assetStatusRaw = getAssetStatus(asset);
        const assetLocationRaw = getAssetLocation(asset);
        const assetCategoryNorm = normalize(assetCategoryRaw);
        const assetStatusNorm = normalize(assetStatusRaw);
        const assetLocationNorm = normalize(assetLocationRaw);

        let rejectReason = null;
        if (assetCategoryNorm !== normalizedCategory) rejectReason = "Category mismatch";
        else if (assetStatusNorm !== "available") rejectReason = "Status not Available";
        else if (employeeLocation && assetLocationNorm !== normalize(employeeLocation)) rejectReason = "Location mismatch";

        if (rejectReason) {
          rejected.push({ AssetId: asset.AssetId || asset.assetId, Reason: rejectReason });
          return;
        }

        availableAssets.push({
          AssetId: asset.AssetId || asset.assetId,
          AssetName: asset.AssetName || asset.assetName || 'Unnamed Asset',
          Category: assetCategoryRaw,
          Status: assetStatusRaw,
          Location: assetLocationRaw,
          ...asset
        });
      });

      const selectedAsset = availableAssets.length > 0 ? availableAssets[0] : null;

      console.log(`[Allocation Check] Matched Assets for ${category}:`, availableAssets.map(a => a.AssetId));

      if (availableAssets.length === 0) {
        missingCategories.push(category);
      }

      inventory.push({
        category: category,
        available: availableAssets.length > 0,
        availableCount: availableAssets.length,
        selectedAsset
      });
    }

    const result = {
      success: true,
      employeeId,
      inventory,
      inventoryAvailable: missingCategories.length === 0,
      missingCategories
    };

    console.log("[checkOnboardingInventory] FINAL RESULT:", result);
    return result;
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

// ==================== VERIFY HANDLER ====================
const postOnboardingVerifyWithEmployeeId = async (event) => {
  console.log("[postOnboardingVerifyWithEmployeeId] START");
  try {
    const body = JSON.parse(event.body || '{}');
    const employeeId = event.pathParameters?.employeeId || body.employeeId;
    const { verificationStatus, remarks = "" } = body;
    const verifiedBy = getCurrentUser(event);
    const now = new Date().toISOString();

    if (!employeeId || verificationStatus !== "Verified") {
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
    const inventoryCheck = await checkOnboardingInventory(employeeId);
    const dynamicStatus = await calculateEmployeeAllocationStatus(employee);

    const newlyAllocated = [];
    for (const invItem of inventoryCheck.inventory) {
      const cat = invItem.category;
      const normCat = normalize(cat);
      const alreadyAssigned = (employee.AssignedAssets || []).some(a => normalize(a.Category) === normCat);
      if (alreadyAssigned) continue;

      if (invItem.available && invItem.selectedAsset) {
        newlyAllocated.push({
          AssetId: invItem.selectedAsset.AssetId,
          Category: cat,
          Status: "Allocated",
          AllocatedAt: now
        });
      }
    }

    const assignedMap = new Map();
    [...(employee.AssignedAssets || []), ...newlyAllocated].forEach(ass => {
      if (ass?.Category) assignedMap.set(normalize(ass.Category), ass);
    });

    const finalAssigned = Array.from(assignedMap.values());
    const stillPending = dynamicStatus.PendingAssets || [];
    const hasAnyAllocation = finalAssigned.length > 0;
    const allCategoriesAllocated = stillPending.length === 0;

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

    for (const alloc of newlyAllocated) {
      await updateAssetForVerification(alloc.AssetId, employeeId, now);
    }

    const employeeFields = {
      InventoryVerified: true,
      InventoryAvailable: hasAnyAllocation,
      VerificationStatus: verificationStatusFinal,
      OnboardingStatus: onboardingStatus,
      CurrentWorkflowState: workflowState,
      AssignedAssets: finalAssigned,
      PendingAssets: stillPending,
      AssignedAssetId: finalAssigned[0]?.AssetId || null,
      VerificationRemarks: remarks || employee.VerificationRemarks,
      InventoryVerifiedAt: now,
      VerifiedBy: verifiedBy,
      UpdatedAt: now,
      AllocationProgress: dynamicStatus.AllocationProgress
    };

    await updateEmployeeOnboarding(employeeId, employeeFields);

    if (newlyAllocated.length > 0) {
      await createAssignmentRecords(employeeId, newlyAllocated, verifiedBy, now);
    }

    console.log(`[Allocation Check] CanAllocate: ${dynamicStatus.CanAllocate}`);

    return createResponse(200, {
      success: true,
      employeeId,
      newlyAllocated,
      finalAssigned,
      finalPending: stillPending,
      inventoryAvailable: hasAnyAllocation,
      missingCategories: inventoryCheck.missingCategories,
      canAllocate: dynamicStatus.CanAllocate,
      availableAssets: newlyAllocated.map(a => ({ AssetId: a.AssetId, Category: a.Category })),
      message: allCategoriesAllocated ? "All assets allocated successfully" : (newlyAllocated.length > 0 ? "Partial allocation completed" : "Still waiting for some assets")
    });
  } catch (error) {
    console.error("[postOnboardingVerifyWithEmployeeId] FAILED", error);
    return createResponse(500, { success: false, message: error.message });
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
    console.log(`Asset ${assetId} allocated to ${employeeId}`);
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

    const result = await dynamoDB.send(new UpdateCommand(params));
    console.log(`Employee ${employeeId} updated successfully`);
    return result;
  } catch (err) {
    console.error("Employee Update FAILED:", err);
    throw err;
  }
};

// ==================== ASSET CREATION ====================
const createAsset = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();
    const assetId = await generateSequentialAssetId();

    const categoryValue = body.Category ||
                         body.AssetCategory ||
                         body.category ||
                         body.assetCategory ||
                         '';

    const newAsset = {
      AssetId: assetId,
      AssetName: body.AssetName || body.assetName || '',
      Category: categoryValue,
      AssetCategory: categoryValue,
      Brand: body.Brand || body.brand || '',
      Model: body.Model || body.model || '',
      SerialNumber: body.SerialNumber || body.serialNumber || '',
      Location: body.Location || body.location || body.OfficeLocation || '',
      Status: "Available",
      ...body,
      CreatedAt: now,
      UpdatedAt: now
    };

    Object.keys(newAsset).forEach(key => {
      if (newAsset[key] === undefined || newAsset[key] === null) {
        delete newAsset[key];
      }
    });

    await dynamoDB.send(new PutCommand({
      TableName: ASSETS_TABLE,
      Item: newAsset
    }));

    console.log(`[createAsset] Saved with Category=${categoryValue}, Status=Available`);
    return createResponse(201, { success: true, asset: newAsset });
  } catch (error) {
    console.error("[createAsset] ERROR", error);
    return createResponse(500, { success: false, message: error.message });
  }
};

const bulkUploadAssets = async (event) => {
  console.log("[bulkUploadAssets] START");
  let body;
  try {
    let rawBody = event.body;
    if (event.isBase64Encoded === true && typeof rawBody === 'string') {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
    }
    body = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody || {};
  } catch (parseError) {
    return createResponse(400, { success: false, error: "Invalid JSON body" });
  }

  let assetsData = Array.isArray(body) ? body : (body.assets || body || []);
  if (!Array.isArray(assetsData)) assetsData = [];

  if (assetsData.length === 0) {
    return createResponse(400, { success: false, error: "No assets found in request." });
  }

  const now = new Date().toISOString();
  const insertedAssets = [];
  const failedRows = [];
  let insertedCount = 0;

  for (let i = 0; i < assetsData.length; i++) {
    const row = assetsData[i];
    try {
      const categoryValue = row.Category ?? row["Asset Category"] ?? row.AssetCategory ?? row.category ?? row.assetCategory ?? "";
      const asset = {
        AssetName: row.AssetName ?? row["Asset Name"] ?? row.Name ?? "",
        Category: categoryValue,
        AssetCategory: categoryValue,
        Brand: row.Brand ?? row.Manufacturer ?? "",
        Model: row.Model ?? "",
        SerialNumber: row.SerialNumber ?? "",
        Location: row.Location ?? row["Office Location"] ?? "",
        Status: "Available",
        PurchaseDate: row.PurchaseDate ?? "",
        WarrantyExpiry: row.WarrantyExpiry ?? ""
      };

      if (!asset.AssetName?.trim() || !asset.Category?.trim()) {
        throw new Error("Missing required fields: AssetName or Category");
      }

      const assetId = await generateSequentialAssetId();
      const newAsset = { AssetId: assetId, ...asset, CreatedAt: now, UpdatedAt: now };
      await dynamoDB.send(new PutCommand({ TableName: ASSETS_TABLE, Item: newAsset }));
      insertedAssets.push(newAsset);
      insertedCount++;
    } catch (rowError) {
      failedRows.push({ rowIndex: i + 1, error: rowError.message });
    }
  }

  return createResponse(200, {
    success: true,
    insertedCount,
    failedCount: failedRows.length,
    insertedAssets,
    failedRows
  });
};

// ==================== GET PENDING ONBOARDING ====================
const getPendingOnboarding = async (event) => {
  try {
    const employeesRes = await dynamoDB.send(new ScanCommand({ TableName: EMPLOYEES_TABLE }));
    const rawEmployees = employeesRes.Items || [];
    const enrichedEmployees = [];

    for (const emp of rawEmployees) {
      const dynamic = await calculateEmployeeAllocationStatus(emp);
      enrichedEmployees.push({
        ...emp,
        ...dynamic,
        RequiredHardwareCategory: parseRequiredCategories(emp.RequiredHardwareCategory || emp.requiredHardwareCategory || '')
      });
    }

    return createResponse(200, {
      success: true,
      employees: enrichedEmployees,
      count: enrichedEmployees.length
    });
  } catch (error) {
    console.error("[getPendingOnboarding] ERROR", error);
    return createResponse(500, { success: false, error: error.message });
  }
};

const getEmployees = async (event) => getPendingOnboarding(event);

// ==================== GET ONBOARDING EMPLOYEE ====================
const getOnboardingEmployee = async (event) => {
  try {
    const employeeId = getPath(event).split('/').pop();
    const result = await dynamoDB.send(new GetCommand({
      TableName: EMPLOYEES_TABLE,
      Key: { EmployeeId: employeeId }
    }));

    if (!result.Item) return createResponse(404, { success: false, error: "Employee not found" });

    const emp = result.Item;
    const dynamic = await calculateEmployeeAllocationStatus(emp);

    let required = emp.RequiredHardwareCategory || emp.requiredHardwareCategory || '';
    if (typeof required === 'string') {
      required = required.split(',').map(item => item.trim()).filter(Boolean);
    }

    return createResponse(200, {
      success: true,
      data: {
        ...emp,
        ...dynamic,
        RequiredHardwareCategory: Array.isArray(required) ? required : []
      }
    });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

// ==================== OTHER HELPERS ====================
const getAssetManager = async (event) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE }));
    const assets = (result.Items || []).map(asset => ({
      ...asset,
      Status: getAssetStatus(asset) || 'Available',
      Category: getAssetCategory(asset),
      AssetName: asset.AssetName || asset.assetName || 'Unnamed Asset'
    }));
    return createResponse(200, { success: true, assets, count: assets.length });
  } catch (error) {
    return createResponse(500, { success: false, error: error.message });
  }
};

const getDashboard = async (event) => {
  try {
    const [assetsRes, employeesRes] = await Promise.all([
      dynamoDB.send(new ScanCommand({ TableName: ASSETS_TABLE })),
      dynamoDB.send(new ScanCommand({ TableName: EMPLOYEES_TABLE }))
    ]);
    const assets = assetsRes.Items || [];
    const employees = employeesRes.Items || [];

    const totalAssets = assets.length;
    const availableAssets = assets.filter(a => normalize(getAssetStatus(a)) === 'available').length;
    const assignedAssets = assets.filter(a => ['allocated', 'assigned'].includes(normalize(getAssetStatus(a)))).length;

    let pendingOnboarding = 0;
    for (const emp of employees) {
      const dyn = await calculateEmployeeAllocationStatus(emp);
      if (dyn.PendingAssets && dyn.PendingAssets.length > 0) pendingOnboarding++;
    }

    return createResponse(200, {
      success: true,
      dashboard: {
        totalAssets,
        availableAssets,
        assignedAssets,
        pendingOnboarding,
        totalEmployees: employees.length
      }
    });
  } catch (error) {
    console.error("[getDashboard] ERROR", error);
    return createResponse(200, { success: true, dashboard: { totalAssets: 0, availableAssets: 0, assignedAssets: 0, pendingOnboarding: 0, totalEmployees: 0 } });
  }
};

const postOnboardingOutOfStock = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { employeeId, remarks = "" } = body;
    if (!employeeId) return createResponse(400, { success: false, error: 'employeeId is required' });

    const now = new Date().toISOString();
    const verifiedBy = getCurrentUser(event);

    await updateEmployeeOnboarding(employeeId, {
      InventoryVerified: true,
      InventoryAvailable: false,
      VerificationStatus: "Out of Stock",
      OnboardingStatus: "Waiting for Procurement",
      CurrentWorkflowState: "WAITING_FOR_PROCUREMENT",
      VerificationRemarks: remarks,
      InventoryVerifiedAt: now,
      VerifiedBy: verifiedBy,
      UpdatedAt: now
    });

    return createResponse(200, { success: true, message: "Out of stock updated successfully", employeeId });
  } catch (error) {
    return createResponse(500, { success: false, message: error.message });
  }
};

const postOnboardingVerify = async (event) => createResponse(200, { success: true, message: "Use new path with employeeId" });

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
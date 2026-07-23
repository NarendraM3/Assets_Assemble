// index.mjs - Complete Asset Allocation Backend (ES Module) - FIXED per requirements
import {
  DynamoDBClient,
  TransactWriteItemsCommand,
  GetItemCommand,
  UpdateItemCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1"
});

// Table Names
const EMPLOYEES_TABLE = process.env.EMPLOYEES_TABLE || "Assets_Employees";
const ASSETS_TABLE = process.env.ASSETS_TABLE || "Assets_Asset";
const ASSIGNMENTS_TABLE = process.env.ASSIGNMENTS_TABLE || "Asset_Assignments";
const COUNTER_TABLE = process.env.COUNTER_TABLE || "Counters";

// CORS Headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://assets-management-frontend.s3.us-east-1.amazonaws.com',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
  'Access-Control-Allow-Credentials': 'true'
};

// Helper to add CORS to all responses
const withCORS = (response) => ({
  ...response,
  headers: {
    ...(response.headers || {}),
    ...CORS_HEADERS
  }
});

// ====================== HELPER FUNCTIONS ======================
async function getNextAssignmentId() {
  try {
    const updateCmd = {
      TableName: COUNTER_TABLE,
      Key: marshall({ CounterName: "assignmentId" }),
      UpdateExpression: "ADD #val :incr",
      ExpressionAttributeNames: { "#val": "CurrentValue" },
      ExpressionAttributeValues: marshall({ ":incr": 1 }),
      ReturnValues: "UPDATED_NEW"
    };
    const result = await client.send(new UpdateItemCommand(updateCmd));
    const count = parseInt(result.Attributes?.CurrentValue?.N) || 1001;
    return `ASN${count.toString().padStart(4, '0')}`;
  } catch (e) {
    console.error("Counter error:", e);
    return `ASN${Date.now().toString().slice(-6)}`;
  }
}

async function getEmployee(employeeId) {
  try {
    const cmd = new GetItemCommand({
      TableName: EMPLOYEES_TABLE,
      Key: marshall({ EmployeeId: employeeId })
    });
    const result = await client.send(cmd);
    return result.Item ? unmarshall(result.Item) : null;
  } catch (e) {
    console.error("Get employee error:", e);
    return null;
  }
}

async function getAsset(assetId) {
  try {
    const cmd = new GetItemCommand({
      TableName: ASSETS_TABLE,
      Key: marshall({ AssetId: assetId })
    });
    const result = await client.send(cmd);
    return result.Item ? unmarshall(result.Item) : null;
  } catch (e) {
    console.error("Get asset error:", e);
    return null;
  }
}

async function enrichAllocatedAssets(allocatedAssets = []) {
  const enriched = [];
  for (const alloc of allocatedAssets) {
    let assetData = { ...alloc };
    if (!assetData.AssetName || !assetData.Category) {
      const asset = await getAsset(assetData.AssetId);
      if (asset) {
        assetData.AssetName = asset.AssetName || assetData.AssetName || "";
        assetData.Category = asset.AssetCategory || asset.Category || assetData.Category || "";
        assetData.Status = asset.Status || assetData.Status || "Allocated";
      }
    }
    enriched.push({
      AssetId: assetData.AssetId,
      AssetName: assetData.AssetName || "",
      Category: assetData.Category || "",
      Status: assetData.Status || "Allocated"
    });
  }
  return enriched;
}

async function employeeHasActiveAssignment(employeeId) {
  try {
    const cmd = new ScanCommand({
      TableName: ASSIGNMENTS_TABLE,
      FilterExpression: "#empId = :empId AND #status = :assigned",
      ExpressionAttributeNames: { "#empId": "EmployeeId", "#status": "Status" },
      ExpressionAttributeValues: marshall({ ":empId": employeeId, ":assigned": "Assigned" })
    });
    const result = await client.send(cmd);
    return (result.Items && result.Items.length > 0);
  } catch (e) {
    console.error("Check active assignment error:", e);
    return false;
  }
}

// Updated helper to calculate pending assets - respects missing Category by fetching
async function calculatePendingAssets(requiredCategories, allocatedAssets) {
  if (!requiredCategories || !Array.isArray(requiredCategories) || requiredCategories.length === 0) {
    return { pendingAssets: [], pendingCount: 0 };
  }

  // Enrich allocated assets first to ensure we have accurate Categories
  const enrichedAllocated = await enrichAllocatedAssets(allocatedAssets || []);
  const allocatedCategories = new Set(
    enrichedAllocated.map(a => a.Category).filter(Boolean)
  );

  const pending = requiredCategories
    .filter(cat => !allocatedCategories.has(cat))
    .map(cat => ({
      Category: cat,
      Status: "Pending"
    }));

  return {
    pendingAssets: pending,
    pendingCount: pending.length
  };
}

// Helper to build employee status update parameters based on pending count
function buildEmployeeStatusUpdate(pendingCount, pendingAssetsList, now) {
  const isFullyCompleted = pendingCount === 0;
  
  const baseUpdate = {
    UpdateExpression: "SET #updatedAt = :updatedAt",
    ExpressionAttributeNames: { "#updatedAt": "UpdatedAt" },
    ExpressionAttributeValues: { ":updatedAt": now }
  };

  if (isFullyCompleted) {
    baseUpdate.UpdateExpression += ", #currentWorkflowState = :completedState, #onboardingStatus = :completed, #verificationStatus = :verifiedCompleted, #workflow = :w, #itStatus = :its";
    baseUpdate.ExpressionAttributeNames["#currentWorkflowState"] = "CurrentWorkflowState";
    baseUpdate.ExpressionAttributeNames["#onboardingStatus"] = "OnboardingStatus";
    baseUpdate.ExpressionAttributeNames["#verificationStatus"] = "VerificationStatus";
    baseUpdate.ExpressionAttributeNames["#workflow"] = "Workflow";
    baseUpdate.ExpressionAttributeNames["#itStatus"] = "ITStatus";
    
    baseUpdate.ExpressionAttributeValues[":completedState"] = "COMPLETED";
    baseUpdate.ExpressionAttributeValues[":completed"] = "Completed";
    baseUpdate.ExpressionAttributeValues[":verifiedCompleted"] = "Completed";
    baseUpdate.ExpressionAttributeValues[":w"] = "Completed";
    baseUpdate.ExpressionAttributeValues[":its"] = "Completed";
  } else {
    baseUpdate.UpdateExpression += ", #currentWorkflowState = :partialState, #onboardingStatus = :pendingStatus, #workflow = :w, #itStatus = :its, #pendingAssets = :pendingAssetsList, #pendingAssetsCount = :pendingCount";
    baseUpdate.ExpressionAttributeNames["#currentWorkflowState"] = "CurrentWorkflowState";
    baseUpdate.ExpressionAttributeNames["#onboardingStatus"] = "OnboardingStatus";
    baseUpdate.ExpressionAttributeNames["#workflow"] = "Workflow";
    baseUpdate.ExpressionAttributeNames["#itStatus"] = "ITStatus";
    baseUpdate.ExpressionAttributeNames["#pendingAssets"] = "PendingAssets";
    baseUpdate.ExpressionAttributeNames["#pendingAssetsCount"] = "PendingAssetsCount";
    
    baseUpdate.ExpressionAttributeValues[":partialState"] = "PARTIALLY_ASSIGNED";
    baseUpdate.ExpressionAttributeValues[":pendingStatus"] = "Pending Assets";
    baseUpdate.ExpressionAttributeValues[":w"] = "Partial";
    baseUpdate.ExpressionAttributeValues[":its"] = "Partial";
    baseUpdate.ExpressionAttributeValues[":pendingAssetsList"] = pendingAssetsList;
    baseUpdate.ExpressionAttributeValues[":pendingCount"] = pendingCount;
  }

  return baseUpdate;
}

// ====================== ASSET MANAGER HANDLERS ======================
const getAssetsHandler = async () => {
  try {
    const cmd = new ScanCommand({
      TableName: ASSETS_TABLE,
      ProjectionExpression: "#assetId, #assetName, #assetCategory, #status, #assignedTo, #assignedAt, #updatedAt, #createdAt",
      ExpressionAttributeNames: {
        "#assetId": "AssetId", "#assetName": "AssetName", "#assetCategory": "AssetCategory",
        "#status": "Status", "#assignedTo": "AssignedTo", "#assignedAt": "AssignedAt",
        "#updatedAt": "UpdatedAt", "#createdAt": "CreatedAt"
      }
    });
    const result = await client.send(cmd);
    const assets = result.Items ? result.Items.map(item => unmarshall(item)) : [];
    return { statusCode: 200, body: JSON.stringify({ success: true, assets }) };
  } catch (error) {
    console.error("Get Assets Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Failed to fetch assets" }) };
  }
};

// ====================== IT SUPPORT HANDLERS ======================
const getPendingOnboardingHandler = async () => {
  try {
    console.log("IT Support request: Fetching pending onboarding");
    const cmd = new ScanCommand({
      TableName: EMPLOYEES_TABLE,
      ProjectionExpression: "EmployeeId, EmployeeName, FirstName, LastName, JoiningDate, Department, Designation, RequiredHardwareCategory, VerificationStatus, AssignedAssetId, AllocatedAssets, AssignedAssets, PendingAssets, Workflow, ITStatus, OnboardingStatus, CurrentWorkflowState, UpdatedAt, ApprovedBy, ApprovalDate"
    });
    const result = await client.send(cmd);
    let employees = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    employees = await Promise.all(employees.map(async (emp) => {
      let employeeName = emp.EmployeeName;
      if (!employeeName && emp.FirstName) {
        employeeName = `${emp.FirstName || ''} ${emp.LastName || ''}`.trim();
      }

      // 1. Use AssignedAssets (new) with fallback to AllocatedAssets (old) for backward compatibility
      let allocatedAssets = emp.AssignedAssets || emp.AllocatedAssets || [];
      if (!allocatedAssets.length && emp.AssignedAssetId) {
        allocatedAssets = [{
          AssetId: emp.AssignedAssetId,
          Category: emp.AssignedAssetCategory || "",
          Status: "Allocated"
        }];
      }

      // Enrich Assigned/AllocatedAssets with full details from Assets_Asset
      const enrichedAllocated = await enrichAllocatedAssets(allocatedAssets);

      // 2. Respect PendingAssets stored by Asset Manager. Only calculate if not present (backward compat)
      let pendingAssets = [];
      let pendingCount = 0;
      if (emp.PendingAssets && Array.isArray(emp.PendingAssets)) {
        pendingAssets = emp.PendingAssets;
        pendingCount = pendingAssets.length;
      } else {
        const calcResult = await calculatePendingAssets(
          emp.RequiredHardwareCategory || [],
          allocatedAssets
        );
        pendingAssets = calcResult.pendingAssets;
        pendingCount = calcResult.pendingCount;
      }

      return {
        EmployeeId: emp.EmployeeId,
        EmployeeName: employeeName || "-",
        FirstName: emp.FirstName || "",
        LastName: emp.LastName || "",
        JoiningDate: emp.JoiningDate || "-",
        Department: emp.Department || "",
        Designation: emp.Designation || "",
        RequiredHardwareCategory: emp.RequiredHardwareCategory || [],
        VerificationStatus: emp.VerificationStatus || "",
        AssignedAssetId: emp.AssignedAssetId || "", // legacy
        AllocatedAssets: enrichedAllocated, // response field expected by frontend (enriched)
        AllocatedAssetsCount: enrichedAllocated.length,
        PendingAssets: pendingAssets,        // exactly as stored by Asset Manager
        PendingAssetsCount: pendingCount,
        Workflow: emp.Workflow || "",
        ITStatus: emp.ITStatus || "",
        OnboardingStatus: emp.OnboardingStatus || "",
        CurrentWorkflowState: emp.CurrentWorkflowState || "",
        UpdatedAt: emp.UpdatedAt || "",
        ApprovedBy: emp.ApprovedBy || "",
        ApprovalDate: emp.ApprovalDate || ""
      };
    }));

    console.log(`Total pending employees returned: ${employees.length}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, employees }) };
  } catch (error) {
    console.error("Get Pending Onboarding Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Failed to fetch pending onboarding" }) };
  }
};

const getAssignmentsHandler = async () => {
  try {
    console.log("Fetching IT Assignments");
    const cmd = new ScanCommand({
      TableName: ASSIGNMENTS_TABLE,
      FilterExpression: "#status = :assigned",
      ExpressionAttributeNames: { "#status": "Status" },
      ExpressionAttributeValues: marshall({ ":assigned": "Assigned" })
    });
    const result = await client.send(cmd);
    let rawAssignments = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    // Enrich each assignment (one record per asset - no grouping)
    const assignments = await Promise.all(rawAssignments.map(async (a) => {
      let assetName = a.AssetName;
      let category = a.Category || a.AssetCategory;

      if (!assetName || !category) {
        const asset = await getAsset(a.AssetId);
        if (asset) {
          assetName = asset.AssetName || assetName || "";
          category = asset.AssetCategory || asset.Category || category || "";
        }
      }

      return {
        EmployeeId: a.EmployeeId,
        EmployeeName: a.EmployeeName || "",
        Department: a.Department || "",
        AssetId: a.AssetId,
        AssetName: assetName || "",
        Category: category || "",
        AssignedBy: a.AssignedBy || "",
        AssignedDate: a.AssignedDate || "",
        AssignmentStatus: a.AssignmentStatus || a.Status || "Assigned",
        AssignedRole: a.AssignedRole || "IT Support Team", // default + stored value
        AssignmentId: a.AssignmentId // for reference
      };
    }));

    console.log(`Total assigned asset records returned: ${assignments.length}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, assignments }) };
  } catch (error) {
    console.error("Get IT Assignments Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Failed to fetch assignments" }) };
  }
};

const deliverOnboardingHandler = async (event) => {
  try {
    console.log("IT Support request: Deliver onboarding");
    const employeeId = event.pathParameters?.employeeId || (event.path || '').split('/').pop();
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { ITComment = "", DeliveredBy = "IT Admin", AssignedRole = "IT Support Team" } = body;

    if (!employeeId) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "EmployeeId is required" }) };
    }

    const employee = await getEmployee(employeeId);
    if (!employee) return { statusCode: 404, body: JSON.stringify({ success: false, message: "Employee not found" }) };

    // Use new AssignedAssets with fallback
    const allocatedAssets = employee.AssignedAssets || employee.AllocatedAssets || [];
    if (allocatedAssets.length === 0 && !employee.AssignedAssetId) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "No assets allocated to this employee" }) };
    }

    const now = new Date().toISOString();
    const transactItems = [];

    const assetsToProcess = allocatedAssets.length > 0
      ? allocatedAssets
      : (employee.AssignedAssetId ? [{ AssetId: employee.AssignedAssetId, Category: "" }] : []);

    for (const alloc of assetsToProcess) {
      const assetId = alloc.AssetId;
      if (!assetId) continue;

      const asset = await getAsset(assetId);
      if (!asset) continue;

      const assignmentId = await getNextAssignmentId();

      // Check for existing assignment
      const existingCmd = new ScanCommand({
        TableName: ASSIGNMENTS_TABLE,
        FilterExpression: "#emp = :emp AND #ast = :ast AND #status = :st",
        ExpressionAttributeNames: { "#emp": "EmployeeId", "#ast": "AssetId", "#status": "Status" },
        ExpressionAttributeValues: marshall({ ":emp": employeeId, ":ast": assetId, ":st": "Assigned" })
      });
      const existingResult = await client.send(existingCmd);
      if (existingResult.Items && existingResult.Items.length > 0) {
        console.log(`Assignment already exists for ${assetId}, skipping.`);
        continue;
      }

      transactItems.push({
        Put: {
          TableName: ASSIGNMENTS_TABLE,
          Item: marshall({
            AssignmentId: assignmentId,
            EmployeeId: employeeId,
            EmployeeName: employee.EmployeeName || `${employee.FirstName || ''} ${employee.LastName || ''}`.trim() || "Unknown",
            AssetId: assetId,
            AssetName: asset.AssetName || "",
            AssetTag: asset.AssetTag || asset.Tag || "",
            Category: alloc.Category || asset.AssetCategory || asset.Category || "",
            Department: employee.Department || "",
            Designation: employee.Designation || "",
            AssignedBy: DeliveredBy,
            AssignedDate: now.split("T")[0],
            Status: "Assigned",
            AssignmentStatus: "Assigned",
            AssignedRole: AssignedRole,
            Workflow: "Completed",
            ITComment,
            CreatedAt: now,
            UpdatedAt: now
          }),
          ConditionExpression: "attribute_not_exists(AssignmentId)"
        }
      });

      // Update Asset
      transactItems.push({
        Update: {
          TableName: ASSETS_TABLE,
          Key: marshall({ AssetId: assetId }),
          UpdateExpression: "SET #status = :status, #assignedTo = :assignedTo, #assignedAt = :assignedAt, #updatedAt = :updatedAt",
          ExpressionAttributeNames: { "#status": "Status", "#assignedTo": "AssignedTo", "#assignedAt": "AssignedAt", "#updatedAt": "UpdatedAt" },
          ExpressionAttributeValues: marshall({ ":status": "Assigned", ":assignedTo": employeeId, ":assignedAt": now, ":updatedAt": now }),
          ConditionExpression: "attribute_exists(AssetId)"
        }
      });
    }

    if (transactItems.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "No valid assets to deliver" }) };
    }

    // 2. Respect PendingAssets if present, else calculate (preserves Asset Manager data)
    let pendingAssets = [];
    let pendingCount = 0;
    if (employee.PendingAssets && Array.isArray(employee.PendingAssets)) {
      pendingAssets = employee.PendingAssets;
      pendingCount = pendingAssets.length;
    } else {
      const calcResult = await calculatePendingAssets(
        employee.RequiredHardwareCategory || [],
        allocatedAssets
      );
      pendingAssets = calcResult.pendingAssets;
      pendingCount = calcResult.pendingCount;
    }

    console.log(`Employee ${employeeId} - Pending assets after delivery: ${pendingCount}`);

    // Build conditional employee status update
    const statusUpdate = buildEmployeeStatusUpdate(pendingCount, pendingAssets, now);

    transactItems.push({
      Update: {
        TableName: EMPLOYEES_TABLE,
        Key: marshall({ EmployeeId: employeeId }),
        UpdateExpression: statusUpdate.UpdateExpression,
        ExpressionAttributeNames: statusUpdate.ExpressionAttributeNames,
        ExpressionAttributeValues: marshall(statusUpdate.ExpressionAttributeValues),
        ConditionExpression: "attribute_exists(EmployeeId)"
      }
    });

    await client.send(new TransactWriteItemsCommand({ TransactItems: transactItems }));
    console.log(`✅ Delivered ${assetsToProcess.length} asset(s) for employee ${employeeId}. Final state: ${pendingCount === 0 ? 'COMPLETED' : 'PARTIALLY_ASSIGNED'}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Onboarding delivered successfully. ${pendingCount} pending asset(s) remaining.`,
        pendingCount
      })
    };
  } catch (error) {
    console.error("Deliver Onboarding Error:", error);
    if (error.name === "TransactionCanceledException") {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Transaction failed. Asset/Employee state may be inconsistent." }) };
    }
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Internal server error" }) };
  }
};

const approveHandler = async (event) => {
  try {
    console.log("Approve & Allocate handler");
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const EmployeeId = body.EmployeeId || body.employeeId;
    const AssignedAssetId = body.AssignedAssetId || body.assetId;
    const AssignedBy = body.AssignedBy || body.approvedBy;
    const AssignedRole = body.AssignedRole || "IT Support Team";
    const ITComment = body.Comment || body.comment || body.ITComment || "";

    if (!EmployeeId || !AssignedAssetId || !AssignedBy) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing required fields" }) };
    }

    const employee = await getEmployee(EmployeeId);
    const asset = await getAsset(AssignedAssetId);

    if (!employee) return { statusCode: 404, body: JSON.stringify({ success: false, message: "Employee not found" }) };
    if (!asset) return { statusCode: 404, body: JSON.stringify({ success: false, message: "Asset not found" }) };
    if (asset.Status !== "Available" && asset.Status !== "available") {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Asset not available" }) };
    }

    const now = new Date().toISOString();

    const newAlloc = {
      AssetId: AssignedAssetId,
      AssetName: asset.AssetName || "",
      Category: asset.AssetCategory || asset.Category || "",
      Status: "Allocated",
      AllocatedAt: now,
      AllocatedBy: AssignedBy
    };

    // Use new field with fallback
    const currentAllocated = employee.AssignedAssets || employee.AllocatedAssets || [];
    const updatedAllocated = [...currentAllocated, newAlloc];

    // 2. Respect existing PendingAssets if present, else recalculate
    let pendingAssets = [];
    let pendingCount = 0;
    if (employee.PendingAssets && Array.isArray(employee.PendingAssets)) {
      pendingAssets = employee.PendingAssets; // Do not override Asset Manager's stored pending
      pendingCount = pendingAssets.length;
    } else {
      const calcResult = await calculatePendingAssets(
        employee.RequiredHardwareCategory || [],
        updatedAllocated
      );
      pendingAssets = calcResult.pendingAssets;
      pendingCount = calcResult.pendingCount;
    }

    const statusUpdate = buildEmployeeStatusUpdate(pendingCount, pendingAssets, now);

    const transactItems = [
      {
        Update: {
          TableName: EMPLOYEES_TABLE,
          Key: marshall({ EmployeeId }),
          UpdateExpression: `SET #allocatedAssets = :allocs, #assignedAssets = :assignedAssets, #assignedAssetId = :assetId, #approvedBy = :appr, #approvalDate = :appDate, #updatedAt = :uat ${statusUpdate.UpdateExpression.replace("SET ", ", ")}`,
          ExpressionAttributeNames: {
            "#allocatedAssets": "AllocatedAssets",   // keep for backward compat
            "#assignedAssets": "AssignedAssets",     // new field
            "#assignedAssetId": "AssignedAssetId",
            "#approvedBy": "ApprovedBy",
            "#approvalDate": "ApprovalDate",
            ...statusUpdate.ExpressionAttributeNames
          },
          ExpressionAttributeValues: marshall({
            ":allocs": updatedAllocated,
            ":assignedAssets": updatedAllocated,     // sync both for compat
            ":assetId": AssignedAssetId,
            ":appr": AssignedBy,
            ":appDate": now,
            ":uat": now,
            ...statusUpdate.ExpressionAttributeValues
          }),
          ConditionExpression: "attribute_exists(EmployeeId)"
        }
      },
      {
        Update: {
          TableName: ASSETS_TABLE,
          Key: marshall({ AssetId: AssignedAssetId }),
          UpdateExpression: "SET #status = :status, #assignedTo = :assignedTo, #assignedAt = :assignedAt, #updatedAt = :updatedAt",
          ExpressionAttributeNames: { "#status": "Status", "#assignedTo": "AssignedTo", "#assignedAt": "AssignedAt", "#updatedAt": "UpdatedAt" },
          ExpressionAttributeValues: marshall({ ":status": "Allocated", ":assignedTo": EmployeeId, ":assignedAt": now, ":updatedAt": now }),
          ConditionExpression: "attribute_exists(AssetId)"
        }
      }
    ];

    await client.send(new TransactWriteItemsCommand({ TransactItems: transactItems }));
    console.log(`✅ Asset ${AssignedAssetId} allocated for Employee ${EmployeeId}. Total allocated: ${updatedAllocated.length}, Pending: ${pendingCount}`);
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        message: "Asset allocated successfully",
        pendingCount 
      }) 
    };
  } catch (error) {
    console.error("Approve & Allot Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Internal server error" }) };
  }
};

// Other handlers remain unchanged (Prepare, Ready, Reject)
const prepareOnboardingHandler = async (event) => {
  try {
    console.log("IT Support request: Prepare onboarding");
    const employeeId = event.pathParameters?.employeeId || (event.path || '').split('/').pop();
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { ITComment = "", PreparedBy } = body;
    if (!employeeId) return { statusCode: 400, body: JSON.stringify({ success: false, message: "EmployeeId is required" }) };
    const now = new Date().toISOString();
    await client.send(new UpdateItemCommand({
      TableName: EMPLOYEES_TABLE,
      Key: marshall({ EmployeeId: employeeId }),
      UpdateExpression: "SET #workflow = :w, #itStatus = :its, #prepareStatus = :ps, #preparedBy = :pb, #preparedAt = :pat, #itComment = :ic, #updatedAt = :uat",
      ExpressionAttributeNames: { "#workflow": "Workflow", "#itStatus": "ITStatus", "#prepareStatus": "PrepareStatus", "#preparedBy": "PreparedBy", "#preparedAt": "PreparedAt", "#itComment": "ITComment", "#updatedAt": "UpdatedAt" },
      ExpressionAttributeValues: marshall({ ":w": "Prepared", ":its": "Prepared", ":ps": "Prepared", ":pb": PreparedBy || "IT Admin", ":pat": now, ":ic": ITComment, ":uat": now }),
      ConditionExpression: "attribute_exists(EmployeeId)"
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Onboarding prepared successfully." }) };
  } catch (error) {
    console.error("Prepare Onboarding Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Internal server error" }) };
  }
};

const readyOnboardingHandler = async (event) => {
  try {
    console.log("IT Support request: Ready onboarding");
    const employeeId = event.pathParameters?.employeeId || (event.path || '').split('/').pop();
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { ITComment = "", ReadyBy } = body;
    if (!employeeId) return { statusCode: 400, body: JSON.stringify({ success: false, message: "EmployeeId is required" }) };
    const now = new Date().toISOString();
    await client.send(new UpdateItemCommand({
      TableName: EMPLOYEES_TABLE,
      Key: marshall({ EmployeeId: employeeId }),
      UpdateExpression: "SET #workflow = :w, #itStatus = :its, #readyStatus = :rs, #readyBy = :rb, #readyAt = :rat, #itComment = :ic, #updatedAt = :uat",
      ExpressionAttributeNames: { "#workflow": "Workflow", "#itStatus": "ITStatus", "#readyStatus": "ReadyStatus", "#readyBy": "ReadyBy", "#readyAt": "ReadyAt", "#itComment": "ITComment", "#updatedAt": "UpdatedAt" },
      ExpressionAttributeValues: marshall({ ":w": "Ready for Delivery", ":its": "Ready", ":rs": "Ready", ":rb": ReadyBy || "IT Admin", ":rat": now, ":ic": ITComment, ":uat": now }),
      ConditionExpression: "attribute_exists(EmployeeId)"
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Onboarding marked as ready." }) };
  } catch (error) {
    console.error("Ready Onboarding Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Internal server error" }) };
  }
};

const rejectHandler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { EmployeeId, RejectReason = "", ITComment = "", RejectedBy } = body;
    if (!EmployeeId || !RejectedBy) return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing required fields" }) };
    const now = new Date().toISOString();
    await client.send(new UpdateItemCommand({
      TableName: EMPLOYEES_TABLE,
      Key: marshall({ EmployeeId }),
      UpdateExpression: "SET #workflow = :w, #itStatus = :its, #rejectReason = :rr, #itComment = :ic, #rejectedBy = :rb, #rejectedAt = :rat, #updatedAt = :uat",
      ExpressionAttributeNames: { "#workflow": "Workflow", "#itStatus": "ITStatus", "#rejectReason": "RejectReason", "#itComment": "ITComment", "#rejectedBy": "RejectedBy", "#rejectedAt": "RejectedAt", "#updatedAt": "UpdatedAt" },
      ExpressionAttributeValues: marshall({ ":w": "Rejected by IT", ":its": "Rejected", ":rr": RejectReason, ":ic": ITComment, ":rb": RejectedBy, ":rat": now, ":uat": now }),
      ConditionExpression: "attribute_exists(EmployeeId)"
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Employee onboarding rejected successfully." }) };
  } catch (error) {
    console.error("Reject Error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message || "Internal server error" }) };
  }
};

const optionsHandler = () => ({ statusCode: 200, headers: CORS_HEADERS, body: '' });

// ====================== MAIN HANDLER ======================
export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const path = (event.path || event.routeKey || event.rawPath || "").toLowerCase().trim();

  if (method === 'OPTIONS') return optionsHandler();

  let response;
  if (path.endsWith('/asset-manager') && method === 'GET') response = await getAssetsHandler();
  else if (path.endsWith('/asset-manager/assignments') && method === 'GET') response = await getAssignmentsHandler();
  else if ((path.includes("approve") || path.includes("allocate")) && (method === 'POST' || method === 'PATCH')) response = await approveHandler(event);
  else if (path.includes("reject") && (method === 'POST' || method === 'PATCH')) response = await rejectHandler(event);
  else if (path.includes('/it-support/onboarding/pending') && method === 'GET') response = await getPendingOnboardingHandler();
  else if (path.includes('/it-support/assignments') && method === 'GET') response = await getAssignmentsHandler();
  else if (path.includes('/it-support/onboarding/') && method === 'PATCH') {
    if (path.includes('/prepare')) response = await prepareOnboardingHandler(event);
    else if (path.includes('/ready')) response = await readyOnboardingHandler(event);
    else if (path.includes('/deliver')) response = await deliverOnboardingHandler(event);
    else response = { statusCode: 400, body: JSON.stringify({ success: false, message: "Unknown IT action" }) };
  } else {
    response = { statusCode: 400, body: JSON.stringify({ success: false, message: `Unknown route: ${path}` }) };
  }

  return withCORS(response);
};
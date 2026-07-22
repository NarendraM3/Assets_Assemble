// index.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = 'Assets_Tickets';
const ALLOWED_STATUSES = new Set([
  'Open',
  'Accepted',
  'In Progress',
  'Waiting for User',
  'Resolved',
  'Closed'
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
  'Access-Control-Allow-Credentials': true
};

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function isValidStatus(status) {
  return typeof status === 'string' && ALLOWED_STATUSES.has(status);
}

function sortTicketsByCreatedAt(tickets) {
  return tickets.sort((a, b) => {
    const timeA = a.CreatedAt || a.createdAt || '';
    const timeB = b.CreatedAt || b.createdAt || '';
    return timeB.localeCompare(timeA);
  });
}

export const handler = async (event) => {
  // === DETAILED LOGGING FOR DEBUGGING ===
  console.log('=== FULL EVENT RECEIVED ===');
  console.log(JSON.stringify(event, null, 2));

  const method = 
    event.httpMethod || 
    event.requestContext?.http?.method || 
    event.requestContext?.method || 
    "";

  const path = 
    event.rawPath || 
    event.path || 
    event.resource || 
    "";

  const routeKey = event.routeKey || event.requestContext?.routeKey || 'unknown';

  console.log(`Detected method: "${method}" | path: "${path}" | routeKey: "${routeKey}"`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    // ========================
    // GET /admin-tickets
    // ========================
    if (method === 'GET' && path.includes('admin-tickets')) {
      console.log('✅ GET /admin-tickets route MATCHED successfully');

      const scanParams = {
        TableName: TABLE_NAME
      };

      const scanResult = await docClient.send(new ScanCommand(scanParams));
      let tickets = scanResult.Items || [];

      tickets = sortTicketsByCreatedAt(tickets);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          tickets: tickets,
          count: tickets.length
        })
      };
    }

    // ========================
    // PATCH /tickets/{ticketId}/status
    // ========================
    if (method === 'PATCH' && (path.includes('/tickets/') && path.endsWith('/status'))) {
      console.log('✅ PATCH /tickets/{ticketId}/status route MATCHED');

      const ticketId = event.pathParameters?.ticketId;
      
      console.log(`Extracted ticketId: ${ticketId}`);

      if (!ticketId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            success: false, 
            message: 'Missing ticketId in path parameters',
            receivedPathParameters: event.pathParameters 
          })
        };
      }

      let requestBody;
      try {
        requestBody = JSON.parse(event.body || '{}');
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, message: 'Invalid JSON in request body' })
        };
      }

      const { status, estimatedTime, EstimatedResolutionTime } = requestBody;

      if (!status || !isValidStatus(status)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            success: false, 
            message: `Invalid status. Allowed values: ${Array.from(ALLOWED_STATUSES).join(', ')}` 
          })
        };
      }

      const employeeId = event.requestContext?.authorizer?.claims?.sub || 
                        event.requestContext?.authorizer?.employeeId || 
                        'SYSTEM';

      const now = getCurrentTimestamp();

      // Determine EstimatedResolutionTime value (prefer new field for backward compatibility)
      const resolutionTimeValue = EstimatedResolutionTime !== undefined 
        ? EstimatedResolutionTime 
        : estimatedTime;

      // Verify ticket exists
      const getParams = {
        TableName: TABLE_NAME,
        Key: { TicketId: ticketId }
      };

      const getResult = await docClient.send(new GetCommand(getParams));
      
      if (!getResult.Item) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, message: 'Ticket not found' })
        };
      }

      // Update using new schema (EstimatedResolutionTime) + existing fields
      const updateParams = {
        TableName: TABLE_NAME,
        Key: { TicketId: ticketId },
        UpdateExpression: 'SET #Status = :status, EstimatedResolutionTime = :estimatedResolutionTime, note = :note, updatedBy = :updatedBy, lastUpdated = :lastUpdated, UpdatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#Status': 'Status'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':estimatedResolutionTime': resolutionTimeValue !== undefined ? resolutionTimeValue : null,
          ':note': requestBody.note || null,
          ':updatedBy': employeeId,
          ':lastUpdated': now,
          ':updatedAt': now
        },
        ReturnValues: 'UPDATED_NEW'
      };

      await docClient.send(new UpdateCommand(updateParams));

      console.log(`Successfully updated ticket ${ticketId} with status: ${status} and EstimatedResolutionTime: ${resolutionTimeValue}`);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Ticket updated successfully'
        })
      };
    }

    // ========================
    // INVALID ENDPOINT
    // ========================
    console.log(`❌ No route matched. Falling back to Invalid endpoint. method="${method}", path="${path}", routeKey="${routeKey}"`);

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'Invalid endpoint'
      })
    };

  } catch (error) {
    console.error('Error in ticket-status-Assetsmanagement Lambda:', error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      })
    };
  }
};
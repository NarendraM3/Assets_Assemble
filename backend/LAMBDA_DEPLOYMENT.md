# AWS Lambda Deployment

This backend is a FastAPI application adapted for AWS Lambda with Mangum.

## Lambda handler

Use this handler value:

```text
lambda_function.handler
```

## Runtime

Use Python 3.11 or newer.

## Required environment variables

```text
SECRET_KEY=replace-with-a-strong-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
AWS_REGION=us-east-1
USERS_TABLE=Assets_Employees
ASSETS_TABLE=Assets_Asset
ASSIGNMENTS_TABLE=Asset-Employee
TICKETS_TABLE=Assets_Tickets
TICKET_COMMENTS_TABLE=Assets_TicketComments
ATTACHMENTS_TABLE=Assets_Attachments
CORS_ORIGINS=*
```

Do not set AWS access keys in Lambda. Attach an IAM role with DynamoDB permissions to the function.

## Build the upload zip

From the `backend` directory:

```powershell
.\build-lambda-package.ps1
```

Upload `asset-management-lambda.zip` to AWS Lambda.

## API Gateway

The app keeps the existing `/api/...` routes, including:

```text
POST /api/auth/login
POST /api/auth/refresh
GET /api/users
GET /api/assets
POST /api/assignments
GET /api/tickets
POST /api/tickets
```

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.middleware.logging import LoggingMiddleware
from app.routers import (
    auth, dashboard, users, assets, tickets, 
    assignments, vendors, maintenance, audit_logs, 
    notifications, knowledge_base
)
import os
import logging

app = FastAPI(
    title="Asset Management Enterprise API",
    description="Backend API supporting all IT operations and React integration.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Ensure static uploads folder exists and is mounted
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    """Run safety migrations to auto-inject the attachments column if missing."""
    from app.database import engine
    from sqlalchemy import text
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachments JSONB;"))
            print("DB Migration: Checked/injected attachments column in tickets table.")
        except Exception as e:
            print(f"DB Migration Error: {e}")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable request logging
app.add_middleware(LoggingMiddleware)

# Custom validation response formatter to match required failure schema
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = {}
    for error in exc.errors():
        # Clean path locator name (e.g. body.email -> email)
        loc = ".".join(str(x) for x in error["loc"][1:]) if len(error["loc"]) > 1 else str(error["loc"][0])
        errors[loc] = error["msg"]
        
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation failed",
            "errors": errors
        }
    )

# Format HTTPExceptions to conform to the standard frontend response schema
from fastapi import HTTPException
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "errors": {}
        }
    )

# Generic exception handler to intercept database errors and unhandled exceptions
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    with open("error.log", "a") as f:
        f.write("\n=== NEW EXCEPTION ===\n")
        traceback.print_exc(file=f)
        
    logger = logging.getLogger("api_monitor")
    logger.error(f"Unhandled server error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred",
            "errors": {"server": str(exc)}
        }
    )

# Register routers under prefix '/api'
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(vendors.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(knowledge_base.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "asset-management-api"}

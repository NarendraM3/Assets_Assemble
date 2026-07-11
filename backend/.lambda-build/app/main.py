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
    notifications, knowledge_base,
)
import os
import logging


def _cors_origins():
    if settings.CORS_ORIGINS.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app = FastAPI(
    title="Asset Management Enterprise API",
    description="Backend API supporting all IT operations and React integration.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=settings.CORS_ORIGINS.strip() != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = {}
    for error in exc.errors():
        loc = ".".join(str(x) for x in error["loc"][1:]) if len(error["loc"]) > 1 else str(error["loc"][0])
        errors[loc] = error["msg"]

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation failed",
            "errors": errors,
        },
    )


from fastapi import HTTPException


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "errors": {},
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    error_log = os.path.join("/tmp", "error.log") if os.getenv("AWS_LAMBDA_FUNCTION_NAME") else "error.log"
    with open(error_log, "a") as f:
        f.write("\n=== NEW EXCEPTION ===\n")
        traceback.print_exc(file=f)

    logger = logging.getLogger("api_monitor")
    logger.error(f"Unhandled server error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred",
            "errors": {"server": str(exc)},
        },
    )


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

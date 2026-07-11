import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("api_monitor")

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring API request rates, response codes, execution times, and exceptions."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        path = request.url.path
        method = request.method
        client_ip = request.client.host if request.client else "unknown"
        
        logger.info(f"--> Request: {method} {path} - IP: {client_ip}")
        
        try:
            response = await call_next(request)
            process_time_ms = (time.time() - start_time) * 1000
            
            # Log auth requests with emphasis
            if "/auth" in path:
                logger.info(f"Security: Authentication request processed at {path}")
                
            logger.info(f"<-- Response: {method} {path} - Status: {response.status_code} - Duration: {process_time_ms:.2f}ms")
            return response
        except Exception as exc:
            process_time_ms = (time.time() - start_time) * 1000
            logger.error(
                f"!!! API Exception: {method} {path} - Error: {str(exc)} - Duration: {process_time_ms:.2f}ms",
                exc_info=True
            )
            raise exc

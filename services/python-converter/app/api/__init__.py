"""
API Router

Central router for all API endpoints
"""

from fastapi import APIRouter

# Create main API router
router = APIRouter()

# Import and include sub-routers (will be added in next tasks)
# from app.api import convert, status

# router.include_router(convert.router, prefix="/convert", tags=["conversion"])
# router.include_router(status.router, prefix="/status", tags=["status"])

@router.get("/")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Script Converter API v1",
        "endpoints": {
            "convert_script": "/api/v1/convert/script (POST)",
            "convert_outline": "/api/v1/convert/outline (POST)",
            "conversion_status": "/api/v1/status/{job_id} (GET)",
            "health": "/health (GET)",
            "docs": "/docs (GET)"
        }
    }

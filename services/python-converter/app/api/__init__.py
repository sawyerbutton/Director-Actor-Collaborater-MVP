"""
API Router

Central router for all API endpoints
"""

from fastapi import APIRouter
from app.api import convert

# Create main API router
router = APIRouter()

# Include sub-routers
router.include_router(convert.router, prefix="/convert", tags=["conversion"])

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

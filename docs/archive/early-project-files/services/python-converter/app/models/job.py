"""
Job Status Models

Models for tracking conversion job status
"""

from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Job status enumeration"""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    """Job status response model"""

    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    file_id: Optional[str] = Field(None, description="ScriptFile ID being processed")
    project_id: Optional[str] = Field(None, description="Project ID for outline conversions")
    progress: int = Field(0, ge=0, le=100, description="Progress percentage (0-100)")
    result: Optional[Dict[str, Any]] = Field(None, description="Conversion result when completed")
    error: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "job_abc123",
                "status": "completed",
                "file_id": "clx1234567890",
                "project_id": None,
                "progress": 100,
                "result": {
                    "json_content": {"scenes": []},
                    "processing_time_ms": 1250
                },
                "error": None,
                "created_at": "2025-11-04T10:30:00Z",
                "updated_at": "2025-11-04T10:30:01Z",
                "completed_at": "2025-11-04T10:30:01Z"
            }
        }

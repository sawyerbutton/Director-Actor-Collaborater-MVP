"""
Conversion Request/Response Models

Pydantic models for script and outline conversion endpoints
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator


class ScriptConversionRequest(BaseModel):
    """Request model for script conversion endpoint"""

    file_id: str = Field(..., description="ScriptFile ID from database")
    raw_content: str = Field(..., min_length=1, description="Raw script content")
    filename: str = Field(..., description="Original filename")
    episode_number: Optional[int] = Field(None, description="Episode number if available")

    @field_validator('raw_content')
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        """Validate content length (max 10MB)"""
        max_bytes = 10 * 1024 * 1024  # 10MB
        content_bytes = len(v.encode('utf-8'))
        if content_bytes > max_bytes:
            raise ValueError(f'Content size {content_bytes} bytes exceeds 10MB limit')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "clx1234567890",
                "raw_content": "场景1：咖啡厅-白天\n\n张三走进咖啡厅...",
                "filename": "第1集.txt",
                "episode_number": 1
            }
        }


class OutlineConversionRequest(BaseModel):
    """Request model for outline conversion endpoint"""

    project_id: str = Field(..., description="Project ID")
    file_ids: List[str] = Field(..., min_length=1, max_length=50, description="List of ScriptFile IDs")

    @field_validator('file_ids')
    @classmethod
    def validate_file_ids(cls, v: List[str]) -> List[str]:
        """Validate file IDs list"""
        if len(v) > 50:
            raise ValueError('Cannot process more than 50 files at once')
        if len(v) == 0:
            raise ValueError('At least one file ID required')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "clx0987654321",
                "file_ids": ["clx1234567890", "clx1234567891"]
            }
        }


class ConversionError(BaseModel):
    """Error details for failed conversions"""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    line_number: Optional[int] = Field(None, description="Line number where error occurred")

    class Config:
        json_schema_extra = {
            "example": {
                "code": "PARSE_ERROR",
                "message": "无法解析场景标记",
                "details": {"line": "场景1咖啡厅-白天"},
                "line_number": 5
            }
        }


class ConversionResponse(BaseModel):
    """Response model for conversion endpoints"""

    success: bool = Field(..., description="Whether conversion succeeded")
    file_id: str = Field(..., description="ScriptFile ID")
    json_content: Optional[Dict[str, Any]] = Field(None, description="Converted JSON content")
    error: Optional[ConversionError] = Field(None, description="Error details if failed")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "file_id": "clx1234567890",
                "json_content": {
                    "scenes": [
                        {
                            "scene_number": 1,
                            "location": "咖啡厅",
                            "time": "白天",
                            "content": "张三走进咖啡厅..."
                        }
                    ],
                    "characters": ["张三", "李四"],
                    "total_scenes": 1
                },
                "error": None,
                "processing_time_ms": 1250,
                "metadata": {
                    "episode_number": 1,
                    "filename": "第1集.txt"
                }
            }
        }

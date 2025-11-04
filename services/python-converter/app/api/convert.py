"""
Script Conversion API Endpoints

Handles script-to-JSON conversion requests
"""

import time
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
import structlog

from app.models.conversion import (
    ScriptConversionRequest,
    OutlineConversionRequest,
    ConversionResponse,
    OutlineConversionResponse,
    ConversionError
)
from app.converters import ScriptParser

# Setup logger
logger = structlog.get_logger()

# Create router
router = APIRouter()

# Initialize parser
script_parser = ScriptParser()


@router.post("/script", response_model=ConversionResponse, status_code=status.HTTP_200_OK)
async def convert_script(request: ScriptConversionRequest) -> ConversionResponse:
    """
    Convert a single script file to structured JSON

    Args:
        request: Script conversion request with raw content

    Returns:
        ConversionResponse with structured JSON or error

    Raises:
        HTTPException: If conversion fails critically
    """
    start_time = time.time()

    logger.info(
        "script_conversion_started",
        file_id=request.file_id,
        filename=request.filename,
        content_length=len(request.raw_content),
        episode_number=request.episode_number
    )

    try:
        # Parse script to JSON
        parsed_data = script_parser.parse_to_dict(
            text=request.raw_content,
            detect_aliases=True,
            filename=request.filename,
            episode_number=request.episode_number
        )

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Build metadata
        metadata: Dict[str, Any] = {
            "filename": request.filename,
            "file_id": request.file_id
        }
        if request.episode_number is not None:
            metadata["episode_number"] = request.episode_number

        # Log success
        logger.info(
            "script_conversion_completed",
            file_id=request.file_id,
            processing_time_ms=processing_time_ms,
            total_scenes=parsed_data.get("total_scenes", 0),
            total_characters=parsed_data.get("total_characters", 0)
        )

        return ConversionResponse(
            success=True,
            file_id=request.file_id,
            json_content=parsed_data,
            error=None,
            processing_time_ms=processing_time_ms,
            metadata=metadata
        )

    except ValueError as e:
        # Handle validation errors (empty script, invalid format, etc.)
        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.warning(
            "script_conversion_validation_error",
            file_id=request.file_id,
            error=str(e),
            processing_time_ms=processing_time_ms
        )

        error_detail = ConversionError(
            code="VALIDATION_ERROR",
            message=str(e),
            details={"file_id": request.file_id, "filename": request.filename},
            line_number=None
        )

        return ConversionResponse(
            success=False,
            file_id=request.file_id,
            json_content=None,
            error=error_detail,
            processing_time_ms=processing_time_ms,
            metadata={"filename": request.filename}
        )

    except Exception as e:
        # Handle unexpected errors
        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.error(
            "script_conversion_unexpected_error",
            file_id=request.file_id,
            error=str(e),
            error_type=type(e).__name__,
            processing_time_ms=processing_time_ms
        )

        error_detail = ConversionError(
            code="INTERNAL_ERROR",
            message=f"An unexpected error occurred: {type(e).__name__}",
            details={"error": str(e)},
            line_number=None
        )

        return ConversionResponse(
            success=False,
            file_id=request.file_id,
            json_content=None,
            error=error_detail,
            processing_time_ms=processing_time_ms,
            metadata={"filename": request.filename}
        )


@router.post("/outline", response_model=OutlineConversionResponse, status_code=status.HTTP_200_OK)
async def convert_outline(request: OutlineConversionRequest) -> OutlineConversionResponse:
    """
    Convert multiple script files to structured JSON (batch processing)

    Args:
        request: Outline conversion request with project ID and file list

    Returns:
        OutlineConversionResponse with batch results

    Raises:
        HTTPException: If batch validation fails critically
    """
    batch_start_time = time.time()

    logger.info(
        "outline_conversion_started",
        project_id=request.project_id,
        total_files=len(request.files)
    )

    results = []
    successful = 0
    failed = 0

    # Process each file
    for file in request.files:
        file_start_time = time.time()

        logger.info(
            "file_conversion_started",
            file_id=file.file_id,
            filename=file.filename,
            content_length=len(file.raw_content)
        )

        try:
            # Parse script to JSON
            parsed_data = script_parser.parse_to_dict(
                text=file.raw_content,
                detect_aliases=True,
                filename=file.filename,
                episode_number=file.episode_number
            )

            processing_time_ms = int((time.time() - file_start_time) * 1000)

            # Build metadata
            metadata: Dict[str, Any] = {
                "filename": file.filename,
                "file_id": file.file_id
            }
            if file.episode_number is not None:
                metadata["episode_number"] = file.episode_number

            logger.info(
                "file_conversion_completed",
                file_id=file.file_id,
                processing_time_ms=processing_time_ms,
                total_scenes=parsed_data.get("total_scenes", 0)
            )

            # Append success result
            results.append(ConversionResponse(
                success=True,
                file_id=file.file_id,
                json_content=parsed_data,
                error=None,
                processing_time_ms=processing_time_ms,
                metadata=metadata
            ))
            successful += 1

        except ValueError as e:
            # Handle validation errors
            processing_time_ms = int((time.time() - file_start_time) * 1000)

            logger.warning(
                "file_conversion_validation_error",
                file_id=file.file_id,
                error=str(e),
                processing_time_ms=processing_time_ms
            )

            error_detail = ConversionError(
                code="VALIDATION_ERROR",
                message=str(e),
                details={"file_id": file.file_id, "filename": file.filename},
                line_number=None
            )

            results.append(ConversionResponse(
                success=False,
                file_id=file.file_id,
                json_content=None,
                error=error_detail,
                processing_time_ms=processing_time_ms,
                metadata={"filename": file.filename}
            ))
            failed += 1

        except Exception as e:
            # Handle unexpected errors
            processing_time_ms = int((time.time() - file_start_time) * 1000)

            logger.error(
                "file_conversion_unexpected_error",
                file_id=file.file_id,
                error=str(e),
                error_type=type(e).__name__,
                processing_time_ms=processing_time_ms
            )

            error_detail = ConversionError(
                code="INTERNAL_ERROR",
                message=f"An unexpected error occurred: {type(e).__name__}",
                details={"error": str(e)},
                line_number=None
            )

            results.append(ConversionResponse(
                success=False,
                file_id=file.file_id,
                json_content=None,
                error=error_detail,
                processing_time_ms=processing_time_ms,
                metadata={"filename": file.filename}
            ))
            failed += 1

    # Calculate total processing time
    total_processing_time_ms = int((time.time() - batch_start_time) * 1000)

    logger.info(
        "outline_conversion_completed",
        project_id=request.project_id,
        total_files=len(request.files),
        successful=successful,
        failed=failed,
        total_processing_time_ms=total_processing_time_ms
    )

    return OutlineConversionResponse(
        project_id=request.project_id,
        total_files=len(request.files),
        successful=successful,
        failed=failed,
        results=results,
        total_processing_time_ms=total_processing_time_ms
    )


@router.get("/health")
async def conversion_health():
    """Health check for conversion service"""
    return {
        "status": "healthy",
        "service": "conversion",
        "parser_ready": script_parser is not None
    }

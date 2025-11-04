"""
Configuration Settings

Loads environment variables and provides application configuration
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server Configuration
    PORT: int = 8001
    HOST: str = "0.0.0.0"
    WORKERS: int = 4
    LOG_LEVEL: str = "info"

    # Next.js Backend URL
    NEXTJS_API_URL: str = "http://localhost:3000"

    # Processing Configuration
    MAX_SCRIPT_SIZE_MB: int = 10
    CONVERSION_TIMEOUT_SECONDS: int = 300
    MAX_CONCURRENT_CONVERSIONS: int = 10

    # Development
    DEBUG: bool = False
    RELOAD: bool = False

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8001"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

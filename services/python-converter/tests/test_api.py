"""
API Endpoint Tests

Test FastAPI endpoints for health, conversion, and status
"""

import pytest
from fastapi import status


class TestHealthEndpoint:
    """Test health check endpoint"""

    def test_health_check_returns_200(self, client):
        """Health check should return 200 OK"""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK

    def test_health_check_response_structure(self, client):
        """Health check should return correct structure"""
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert "service" in data
        assert "version" in data
        assert data["status"] == "healthy"
        assert data["service"] == "python-converter"


class TestRootEndpoint:
    """Test root endpoint"""

    def test_root_returns_200(self, client):
        """Root endpoint should return 200 OK"""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK

    def test_root_response_structure(self, client):
        """Root endpoint should return service info"""
        response = client.get("/")
        data = response.json()

        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["service"] == "Python Script Converter"


class TestAPIRouter:
    """Test API router base endpoint"""

    def test_api_root_returns_200(self, client):
        """API root should return 200 OK"""
        response = client.get("/api/v1/")
        assert response.status_code == status.HTTP_200_OK

    def test_api_root_shows_endpoints(self, client):
        """API root should list available endpoints"""
        response = client.get("/api/v1/")
        data = response.json()

        assert "message" in data
        assert "endpoints" in data
        assert "convert_script" in data["endpoints"]
        assert "convert_outline" in data["endpoints"]


# Placeholder tests for conversion endpoints (will be implemented in T2.3-T2.4)
class TestScriptConversionEndpoint:
    """Test script conversion endpoint (placeholder)"""

    @pytest.mark.skip(reason="Endpoint not yet implemented (T2.3)")
    def test_convert_script_endpoint_exists(self, client):
        """Conversion endpoint should exist"""
        pass


class TestOutlineConversionEndpoint:
    """Test outline conversion endpoint (placeholder)"""

    @pytest.mark.skip(reason="Endpoint not yet implemented (T2.4)")
    def test_convert_outline_endpoint_exists(self, client):
        """Outline endpoint should exist"""
        pass

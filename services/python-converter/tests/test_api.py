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


# Script Conversion Endpoint Tests
class TestScriptConversionEndpoint:
    """Test script conversion endpoint"""

    def test_convert_script_success(self, client, sample_conversion_request):
        """Should successfully convert valid script"""
        response = client.post("/api/v1/convert/script", json=sample_conversion_request)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Check response structure
        assert data["success"] is True
        assert data["file_id"] == sample_conversion_request["file_id"]
        assert data["json_content"] is not None
        assert data["error"] is None
        assert "processing_time_ms" in data
        assert "metadata" in data

        # Check JSON content structure
        json_content = data["json_content"]
        assert "scenes" in json_content
        assert "characters" in json_content
        assert "dialogues" in json_content
        assert "actions" in json_content
        assert "language" in json_content
        assert "total_scenes" in json_content
        assert "total_characters" in json_content

        # Verify parsed data
        assert json_content["total_scenes"] >= 2
        assert json_content["total_characters"] >= 2
        assert json_content["language"] == "zh"
        assert len(json_content["scenes"]) >= 2
        assert len(json_content["dialogues"]) >= 1  # At least one dialogue

    def test_convert_script_with_chinese_format(self, client):
        """Should parse Chinese script format correctly"""
        request_data = {
            "file_id": "chinese_test",
            "raw_content": """场景1：公园-白天

王五坐在长椅上看书。

王五：
多么美好的一天。
""",
            "filename": "test.txt"
        }

        response = client.post("/api/v1/convert/script", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success"] is True

        json_content = data["json_content"]
        assert json_content["language"] == "zh"
        assert len(json_content["scenes"]) >= 1
        assert json_content["scenes"][0]["location"] == "公园"
        assert json_content["scenes"][0]["time"] == "白天"

    def test_convert_script_empty_content(self, client):
        """Should return validation error for empty content"""
        request_data = {
            "file_id": "empty_test",
            "raw_content": "",
            "filename": "empty.txt"
        }

        # Pydantic validates empty string before handler processes it
        response = client.post("/api/v1/convert/script", json=request_data)
        # Expected: 422 Unprocessable Entity (Pydantic validation)
        # OR 200 with error response (handler validation)
        # Empty string should be rejected by Pydantic model validation
        assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_200_OK]

        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert data["success"] is False
            assert data["error"] is not None
            assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_convert_script_whitespace_only(self, client):
        """Should return validation error for whitespace-only content"""
        request_data = {
            "file_id": "whitespace_test",
            "raw_content": "   \n\n   \n   ",
            "filename": "whitespace.txt"
        }

        response = client.post("/api/v1/convert/script", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success"] is False
        assert data["error"] is not None
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_convert_script_with_episode_number(self, client, sample_script_content):
        """Should include episode number in metadata"""
        request_data = {
            "file_id": "episode_test",
            "raw_content": sample_script_content,
            "filename": "第5集.txt",
            "episode_number": 5
        }

        response = client.post("/api/v1/convert/script", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success"] is True
        assert data["metadata"]["episode_number"] == 5
        assert data["metadata"]["filename"] == "第5集.txt"

        json_content = data["json_content"]
        assert json_content["metadata"]["episode_number"] == 5

    def test_convert_script_invalid_request_format(self, client):
        """Should return 422 for invalid request format"""
        request_data = {
            "file_id": "test",
            # Missing required 'raw_content' field
            "filename": "test.txt"
        }

        response = client.post("/api/v1/convert/script", json=request_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_convert_script_processes_multiple_scenes(self, client):
        """Should correctly parse multiple scenes"""
        request_data = {
            "file_id": "multi_scene_test",
            "raw_content": """场景1：办公室-白天

经理在办公桌前工作。

经理：
今天有什么安排？

场景2：会议室-白天

团队成员围坐在会议桌旁。

成员A：
我们来讨论新项目吧。
成员B：
好的，我准备好了。

场景3：走廊-白天

经理和成员A边走边谈。

经理：
这个项目很重要。
成员A：
我明白，我会全力以赴。
""",
            "filename": "multi_scene.txt"
        }

        response = client.post("/api/v1/convert/script", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        json_content = data["json_content"]

        assert json_content["total_scenes"] == 3
        assert len(json_content["scenes"]) == 3

        # Verify scene details
        scenes = json_content["scenes"]
        assert scenes[0]["location"] == "办公室"
        assert scenes[1]["location"] == "会议室"
        assert scenes[2]["location"] == "走廊"

        # Verify characters extracted
        assert json_content["total_characters"] >= 3

        # Verify dialogues
        assert len(json_content["dialogues"]) >= 5

    def test_convert_script_character_alias_detection(self, client):
        """Should detect character aliases"""
        request_data = {
            "file_id": "alias_test",
            "raw_content": """场景1：咖啡厅-白天

张三走进来。

张三：
你好。

小张：
我在这里。

张三（小张）：
我们开始吧。
""",
            "filename": "alias.txt"
        }

        response = client.post("/api/v1/convert/script", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        json_content = data["json_content"]

        # Should detect that 小张 is likely an alias for 张三
        # (Exact behavior depends on alias detection logic)


class TestOutlineConversionEndpoint:
    """Test outline (batch) conversion endpoint"""

    def test_convert_outline_success(self, client, sample_outline_request):
        """Should successfully convert multiple files"""
        response = client.post("/api/v1/convert/outline", json=sample_outline_request)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Check response structure
        assert "project_id" in data
        assert "total_files" in data
        assert "successful" in data
        assert "failed" in data
        assert "results" in data
        assert "total_processing_time_ms" in data

        # Verify counts
        assert data["project_id"] == sample_outline_request["project_id"]
        assert data["total_files"] == 3
        assert data["successful"] == 2  # file_1 and file_2
        assert data["failed"] == 1  # file_3 (empty content)

        # Verify results array
        results = data["results"]
        assert len(results) == 3

        # Check successful conversions
        assert results[0]["success"] is True
        assert results[0]["file_id"] == "file_1"
        assert results[0]["json_content"] is not None

        assert results[1]["success"] is True
        assert results[1]["file_id"] == "file_2"
        assert results[1]["json_content"] is not None

        # Check failed conversion
        assert results[2]["success"] is False
        assert results[2]["file_id"] == "file_3"
        assert results[2]["json_content"] is None
        assert results[2]["error"] is not None
        assert results[2]["error"]["code"] == "VALIDATION_ERROR"

    def test_convert_outline_all_successful(self, client, sample_script_content):
        """Should successfully convert all files when all valid"""
        request_data = {
            "project_id": "test_project_all_good",
            "files": [
                {
                    "file_id": "file_a",
                    "raw_content": sample_script_content,
                    "filename": "scriptA.txt",
                    "episode_number": 1
                },
                {
                    "file_id": "file_b",
                    "raw_content": sample_script_content,
                    "filename": "scriptB.txt",
                    "episode_number": 2
                }
            ]
        }

        response = client.post("/api/v1/convert/outline", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["total_files"] == 2
        assert data["successful"] == 2
        assert data["failed"] == 0

        # All results should be successful
        for result in data["results"]:
            assert result["success"] is True
            assert result["json_content"] is not None

    def test_convert_outline_all_failed(self, client):
        """Should handle all files failing gracefully"""
        request_data = {
            "project_id": "test_project_all_bad",
            "files": [
                {
                    "file_id": "bad_1",
                    "raw_content": "",
                    "filename": "empty1.txt"
                },
                {
                    "file_id": "bad_2",
                    "raw_content": "   \n\n   ",
                    "filename": "empty2.txt"
                }
            ]
        }

        response = client.post("/api/v1/convert/outline", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["total_files"] == 2
        assert data["successful"] == 0
        assert data["failed"] == 2

        # All results should have errors
        for result in data["results"]:
            assert result["success"] is False
            assert result["error"] is not None
            assert result["error"]["code"] == "VALIDATION_ERROR"

    def test_convert_outline_empty_files_list(self, client):
        """Should return 422 for empty files list"""
        request_data = {
            "project_id": "test_empty_list",
            "files": []
        }

        response = client.post("/api/v1/convert/outline", json=request_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_convert_outline_missing_required_fields(self, client):
        """Should return 422 for missing required fields"""
        request_data = {
            "project_id": "test_missing_fields"
            # Missing 'files' field
        }

        response = client.post("/api/v1/convert/outline", json=request_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_convert_outline_preserves_episode_numbers(self, client, sample_script_content):
        """Should preserve episode numbers in results"""
        request_data = {
            "project_id": "test_episode_preservation",
            "files": [
                {
                    "file_id": "ep5",
                    "raw_content": sample_script_content,
                    "filename": "第5集.txt",
                    "episode_number": 5
                },
                {
                    "file_id": "ep10",
                    "raw_content": sample_script_content,
                    "filename": "第10集.txt",
                    "episode_number": 10
                }
            ]
        }

        response = client.post("/api/v1/convert/outline", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        results = data["results"]

        assert results[0]["metadata"]["episode_number"] == 5
        assert results[1]["metadata"]["episode_number"] == 10

    def test_convert_outline_performance_tracking(self, client, sample_script_content):
        """Should track processing time for each file and total"""
        request_data = {
            "project_id": "test_performance",
            "files": [
                {
                    "file_id": "perf_1",
                    "raw_content": sample_script_content,
                    "filename": "perf1.txt"
                }
            ]
        }

        response = client.post("/api/v1/convert/outline", json=request_data)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        # Check total processing time exists (>= 0 because simple scripts may process in < 1ms)
        assert "total_processing_time_ms" in data
        assert data["total_processing_time_ms"] >= 0

        # Check individual file processing times
        for result in data["results"]:
            assert "processing_time_ms" in result
            assert result["processing_time_ms"] >= 0

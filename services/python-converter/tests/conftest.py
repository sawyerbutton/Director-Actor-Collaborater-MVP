"""
Pytest Configuration and Fixtures

Shared test fixtures and configuration
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client fixture"""
    return TestClient(app)


@pytest.fixture
def sample_script_content():
    """Sample script content for testing"""
    return """场景1：咖啡厅-白天

张三走进咖啡厅，环顾四周。

张三：（自言自语）终于到了。

李四从角落站起来，向张三招手。

李四：张三！这里！

场景2：咖啡厅-白天（稍后）

张三和李四坐在桌前，喝着咖啡。

张三：最近怎么样？
李四：还不错，你呢？
"""


@pytest.fixture
def sample_conversion_request(sample_script_content):
    """Sample conversion request data"""
    return {
        "file_id": "test_file_123",
        "raw_content": sample_script_content,
        "filename": "第1集.txt",
        "episode_number": 1
    }


@pytest.fixture
def sample_outline_request():
    """Sample outline conversion request data"""
    return {
        "project_id": "test_project_123",
        "file_ids": ["file_1", "file_2", "file_3"]
    }

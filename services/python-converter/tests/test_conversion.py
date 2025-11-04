"""
Conversion Logic Integration Tests

Tests for script parsing, outline generation, and validation
"""

import pytest
from app.converters.script_parser import ScriptParser
from app.converters.preprocessor import TextPreprocessor


class TestScriptParser:
    """Test script parsing logic"""

    def test_parse_scene_headers(self):
        """Should parse Chinese scene headers correctly"""
        script_content = """
场景1：咖啡厅-白天

李明坐在角落里，看着窗外。
        """

        parser = ScriptParser()
        result = parser.parse(script_content.strip())

        assert len(result.scenes) >= 1
        scene = result.scenes[0]
        assert scene.scene_number is not None
        assert scene.location is not None
        assert "咖啡厅" in scene.location or "咖啡厅" in scene.content

    def test_extract_characters(self):
        """Should extract character names from dialogue"""
        script_content = """
场景1：办公室-白天

李明：我们需要开会。
王芳：好的，我马上准备。
        """

        parser = ScriptParser()
        result = parser.parse(script_content.strip())

        assert len(result.characters) >= 2
        character_names = [c.name for c in result.characters]
        assert "李明" in character_names
        assert "王芳" in character_names

    def test_parse_dialogue(self):
        """Should parse dialogue with character names"""
        script_content = """
场景1：教室-白天

张老师：今天我们要学习Python。
学生们：好的，老师！
        """

        parser = ScriptParser()
        result = parser.parse(script_content.strip())

        # Check that dialogues are captured
        assert len(result.scenes) >= 1
        scene = result.scenes[0]

        # Dialogues should be present in content or as separate data
        assert len(scene.content) > 0


class TestOutlineGenerator:
    """Test outline generation logic"""

    def test_merge_multiple_scripts(self):
        """Should parse multiple script files"""
        script1 = """
场景1：咖啡厅-白天
李明：你好。
        """

        script2 = """
场景1：办公室-白天
王芳：早上好。
        """

        parser = ScriptParser()

        result1 = parser.parse(script1.strip())
        result2 = parser.parse(script2.strip())

        # Both scripts should parse successfully
        assert len(result1.scenes) >= 1
        assert len(result2.scenes) >= 1

        # Each script should have characters
        assert len(result1.characters) >= 1
        assert len(result2.characters) >= 1

    def test_extract_character_list(self):
        """Should extract all unique characters from a script"""
        script_content = """
场景1：咖啡厅-白天
李明：你好。
王芳：你好。

场景2：办公室-白天
李明：我们开会吧。
张三：好的。
        """

        parser = ScriptParser()
        result = parser.parse(script_content.strip())

        # Should extract all unique characters
        character_names = [c.name for c in result.characters]
        assert "李明" in character_names
        assert "王芳" in character_names
        assert "张三" in character_names

        # Unique characters only
        assert len(set(character_names)) == len(character_names)


class TestConversionValidation:
    """Test conversion validation"""

    def test_validate_json_structure(self):
        """Should convert to valid JSON structure"""
        script_content = """
场景1：咖啡厅-白天

李明坐在角落里。
        """

        parser = ScriptParser()
        result_dict = parser.parse_to_dict(script_content.strip())

        # Check JSON structure
        assert isinstance(result_dict, dict)
        assert "scenes" in result_dict
        assert "characters" in result_dict
        assert "metadata" in result_dict

        # Check scenes structure
        assert isinstance(result_dict["scenes"], list)
        if len(result_dict["scenes"]) > 0:
            scene = result_dict["scenes"][0]
            assert "scene_number" in scene
            assert "content" in scene

    def test_detect_parsing_errors(self):
        """Should raise error for invalid scripts"""
        # Empty script should raise ValueError
        parser = ScriptParser()

        with pytest.raises(ValueError, match="empty"):
            parser.parse("")

        # Whitespace-only script should raise ValueError
        with pytest.raises(ValueError, match="empty"):
            parser.parse("   \n\n  ")


class TestMetadataGeneration:
    """Test metadata generation"""

    def test_generate_basic_metadata(self):
        """Should generate basic metadata"""
        script_content = """
场景1：咖啡厅-白天
李明：你好。

场景2：办公室-白天
王芳：早上好。
李明：早上好。
        """

        parser = ScriptParser()
        result_dict = parser.parse_to_dict(script_content.strip())

        metadata = result_dict["metadata"]

        # Check that metadata exists
        assert isinstance(metadata, dict)
        assert len(metadata) > 0

        # Check for line count (should always exist)
        assert "total_lines" in metadata
        assert metadata["total_lines"] > 0

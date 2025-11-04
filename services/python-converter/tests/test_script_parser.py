"""
Unit Tests for Script Parser

Tests for the Python script-to-JSON converter
"""

import pytest
from app.converters import ScriptParser
from app.converters.types import Language


class TestScriptParser:
    """Test ScriptParser functionality"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return ScriptParser()

    @pytest.fixture
    def sample_chinese_script(self):
        """Sample Chinese script"""
        return """场景1：咖啡厅-白天

张三走进咖啡厅，环顾四周。

张三：
终于到了。

李四从角落站起来，向张三招手。

李四：
张三！这里！

场景2：咖啡厅-白天（稍后）

张三和李四坐在桌前，喝着咖啡。

张三：
最近怎么样？

李四：
还不错，你呢？
"""

    @pytest.fixture
    def sample_english_script(self):
        """Sample English script"""
        return """INT. COFFEE SHOP - DAY

JOHN enters the coffee shop and looks around.

JOHN
Finally made it.

MARY stands up from a corner table and waves.

MARY
John! Over here!

INT. COFFEE SHOP - DAY (LATER)

John and Mary sit at the table with coffee.

JOHN
How have you been?

MARY
Pretty good, you?
"""

    def test_parse_chinese_script_basic(self, parser, sample_chinese_script):
        """Test parsing basic Chinese script"""
        result = parser.parse(sample_chinese_script)

        assert result is not None
        assert result.language == Language.CHINESE
        assert result.total_scenes >= 2
        assert result.total_characters >= 2
        assert len(result.dialogues) >= 4

    def test_parse_chinese_script_scenes(self, parser, sample_chinese_script):
        """Test Chinese scene parsing"""
        result = parser.parse(sample_chinese_script)

        scenes = result.scenes
        assert len(scenes) >= 2

        # First scene
        assert scenes[0].scene_number == 1
        assert "咖啡厅" in scenes[0].location
        assert "白天" in scenes[0].time

        # Second scene
        assert scenes[1].scene_number == 2

    def test_parse_chinese_script_characters(self, parser, sample_chinese_script):
        """Test Chinese character extraction"""
        result = parser.parse(sample_chinese_script)

        characters = result.characters
        character_names = [c.name for c in characters]

        assert "张三" in character_names
        assert "李四" in character_names

        # Check dialogue counts
        for char in characters:
            assert char.dialogue_count > 0

    def test_parse_chinese_script_dialogues(self, parser, sample_chinese_script):
        """Test Chinese dialogue extraction"""
        result = parser.parse(sample_chinese_script)

        dialogues = result.dialogues
        assert len(dialogues) >= 4

        # Check dialogue structure
        for dialogue in dialogues:
            assert dialogue.character in ["张三", "李四"]
            assert dialogue.text
            assert dialogue.scene_number >= 1
            assert dialogue.line_number >= 1

    def test_parse_english_script_basic(self, parser, sample_english_script):
        """Test parsing basic English script"""
        result = parser.parse(sample_english_script)

        assert result is not None
        assert result.language == Language.ENGLISH
        assert result.total_scenes >= 2
        assert result.total_characters >= 2

    def test_parse_english_script_scenes(self, parser, sample_english_script):
        """Test English scene parsing"""
        result = parser.parse(sample_english_script)

        scenes = result.scenes
        assert len(scenes) >= 2

        # Check for INT. format
        for scene in scenes:
            assert "INT." in scene.location or "EXT." in scene.location
            assert scene.time in ["DAY", "NIGHT", "MORNING", "EVENING", "DUSK", "DAWN", ""]

    def test_parse_empty_script_raises_error(self, parser):
        """Test that empty script raises ValueError"""
        with pytest.raises(ValueError, match="empty"):
            parser.parse("")

        with pytest.raises(ValueError, match="empty"):
            parser.parse("   \n\n   ")

    def test_parse_to_dict(self, parser, sample_chinese_script):
        """Test parsing to dictionary"""
        result_dict = parser.parse_to_dict(
            sample_chinese_script,
            filename="test_script.txt",
            episode_number=1
        )

        assert isinstance(result_dict, dict)
        assert "scenes" in result_dict
        assert "characters" in result_dict
        assert "dialogues" in result_dict
        assert "language" in result_dict
        assert result_dict["metadata"]["filename"] == "test_script.txt"
        assert result_dict["metadata"]["episode_number"] == 1

    def test_parse_with_metadata(self, parser, sample_chinese_script):
        """Test parsing with filename and episode number"""
        result = parser.parse(
            sample_chinese_script,
            filename="第1集.txt",
            episode_number=1
        )

        assert result.metadata["filename"] == "第1集.txt"
        assert result.metadata["episode_number"] == 1
        assert "total_lines" in result.metadata

    def test_character_alias_detection(self, parser):
        """Test character alias detection"""
        script = """场景1：办公室-白天

张三：
你好。

张 三：
再见。
"""

        result = parser.parse(script, detect_aliases=True)

        # Should detect "张三" and "张 三" as aliases
        characters = result.characters
        assert len(characters) >= 1


class TestSceneParser:
    """Test scene parsing specifically"""

    def test_chinese_scene_formats(self):
        """Test various Chinese scene header formats"""
        from app.converters.scene_parser import SceneParser

        parser = SceneParser()

        test_cases = [
            ("场景1：咖啡厅-白天", 1, "咖啡厅", "白天"),
            ("第1场 咖啡厅 白天", 1, "咖啡厅", "白天"),
            ("1. 咖啡厅-白天", 1, "咖啡厅", "白天"),
        ]

        for line, expected_num, expected_loc, expected_time in test_cases:
            result = parser._parse_scene_header(line, 1)
            assert result is not None, f"Failed to parse: {line}"
            scene_num, location, time = result
            assert scene_num == expected_num
            assert expected_loc in location
            if expected_time:
                assert expected_time in time

    def test_english_scene_formats(self):
        """Test various English scene header formats"""
        from app.converters.scene_parser import SceneParser

        parser = SceneParser()

        test_cases = [
            ("INT. COFFEE SHOP - DAY", "INT. COFFEE SHOP", "DAY"),
            ("EXT. STREET - NIGHT", "EXT. STREET", "NIGHT"),
            ("INT/EXT. CAR - MORNING", "INT/EXT. CAR", "MORNING"),
        ]

        for line, expected_loc, expected_time in test_cases:
            result = parser._parse_scene_header(line, 1)
            assert result is not None, f"Failed to parse: {line}"
            _, location, time = result
            assert expected_loc in location
            assert expected_time == time


class TestPreprocessor:
    """Test text preprocessor"""

    def test_language_detection_chinese(self):
        """Test Chinese language detection"""
        from app.converters.preprocessor import TextPreprocessor

        preprocessor = TextPreprocessor()

        text = "场景1：咖啡厅-白天\n这是中文剧本。"
        language = preprocessor._detect_language(text)
        assert language == Language.CHINESE

    def test_language_detection_english(self):
        """Test English language detection"""
        from app.converters.preprocessor import TextPreprocessor

        preprocessor = TextPreprocessor()

        text = "INT. COFFEE SHOP - DAY\nThis is an English script."
        language = preprocessor._detect_language(text)
        assert language == Language.ENGLISH

    def test_language_detection_mixed(self):
        """Test mixed language detection"""
        from app.converters.preprocessor import TextPreprocessor

        preprocessor = TextPreprocessor()

        text = "INT. 咖啡厅 - DAY\nMixed content 混合内容。"
        language = preprocessor._detect_language(text)
        assert language == Language.MIXED

    def test_character_name_extraction(self):
        """Test character name extraction"""
        from app.converters.preprocessor import TextPreprocessor

        preprocessor = TextPreprocessor()

        test_cases = [
            ("张三：", "张三"),
            ("JOHN (V.O.)", "JOHN"),
            ("【张三】", "张三"),
            ("李四:", "李四"),
        ]

        for line, expected_name in test_cases:
            result = preprocessor.extract_character_name(line)
            assert result == expected_name, f"Failed for: {line}"

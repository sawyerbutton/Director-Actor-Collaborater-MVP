"""
Text Preprocessor

Cleans and normalizes script text before parsing
"""

import re
from typing import List, Tuple
from app.converters.types import Language


class TextPreprocessor:
    """Preprocesses script text for parsing"""

    def __init__(self):
        # Chinese scene patterns
        self.chinese_scene_patterns = [
            r'场景\s*\d+',
            r'第\s*\d+\s*场',
            r'[\d]+\s*[、.．]\s*[^\n]+',
        ]

        # English scene patterns
        self.english_scene_patterns = [
            r'(INT|EXT|INT/EXT)\.?\s+.+\s+-\s+(DAY|NIGHT|MORNING|EVENING)',
            r'SCENE\s+\d+',
        ]

    def preprocess(self, text: str) -> Tuple[List[str], Language]:
        """
        Preprocess script text into lines and detect language

        Args:
            text: Raw script text

        Returns:
            Tuple of (lines, language)
        """
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        # Split into lines and remove empty lines
        lines = [line.rstrip() for line in text.split('\n') if line.strip()]

        # Detect language
        language = self._detect_language(text)

        return lines, language

    def _detect_language(self, text: str) -> Language:
        """
        Detect script language

        Args:
            text: Script text

        Returns:
            Detected language
        """
        # Check for Chinese characters
        has_chinese = bool(re.search(r'[\u4e00-\u9fff]', text))

        # Check for English scene headers
        has_english_scenes = any(
            re.search(pattern, text, re.IGNORECASE)
            for pattern in self.english_scene_patterns
        )

        if has_chinese and has_english_scenes:
            return Language.MIXED
        elif has_chinese:
            return Language.CHINESE
        else:
            return Language.ENGLISH

    def is_scene_header(self, line: str) -> bool:
        """
        Check if line is a scene header

        Args:
            line: Text line

        Returns:
            True if line is scene header
        """
        line_upper = line.strip().upper()

        # Check Chinese patterns
        if any(re.search(pattern, line, re.IGNORECASE) for pattern in self.chinese_scene_patterns):
            return True

        # Check English patterns
        if any(re.search(pattern, line_upper) for pattern in self.english_scene_patterns):
            return True

        return False

    def is_character_name(self, line: str) -> bool:
        """
        Check if line is a character name

        Args:
            line: Text line

        Returns:
            True if line appears to be character name
        """
        stripped = line.strip()

        # Empty line
        if not stripped:
            return False

        # Chinese character name patterns
        # Format: "角色名：" or "角色名:" or "【角色名】"
        if re.match(r'^[\u4e00-\u9fff\w]+[:：]', stripped):
            return True
        if re.match(r'^【[\u4e00-\u9fff\w]+】', stripped):
            return True

        # English character name patterns
        # All caps, possibly with parenthetical
        if stripped.isupper() and len(stripped.split()) <= 3:
            # Check not a scene header
            if not self.is_scene_header(line):
                return True

        return False

    def extract_character_name(self, line: str) -> str:
        """
        Extract character name from line

        Args:
            line: Character name line

        Returns:
            Cleaned character name
        """
        stripped = line.strip()

        # Remove Chinese punctuation
        name = re.sub(r'[:：].*$', '', stripped)

        # Remove brackets
        name = re.sub(r'[【】\[\]]', '', name)

        # Remove parenthetical (V.O., O.S., CONT'D)
        name = re.sub(r'\s*\([^)]+\)\s*$', '', name)

        return name.strip()

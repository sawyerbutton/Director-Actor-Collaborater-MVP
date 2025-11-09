"""
Scene Parser

Parses scene headers and extracts scene information
"""

import re
from typing import List, Optional, Tuple
from app.converters.types import Scene


class SceneParser:
    """Parses scenes from script"""

    def __init__(self):
        # Chinese scene number patterns
        self.chinese_number_patterns = [
            (r'场景\s*(\d+)', lambda m: int(m.group(1))),
            (r'第\s*(\d+)\s*场', lambda m: int(m.group(1))),
            (r'^(\d+)\s*[、.．]', lambda m: int(m.group(1))),
        ]

        # English scene patterns
        self.english_scene_pattern = r'(INT|EXT|INT/EXT)\.?\s+(.+?)\s+-\s+(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN)'

    def parse_scenes(self, lines: List[str]) -> List[Scene]:
        """
        Parse all scenes from script lines

        Args:
            lines: Script lines

        Returns:
            List of parsed scenes
        """
        scenes = []
        current_scene_number = 0

        for i, line in enumerate(lines):
            scene_info = self._parse_scene_header(line, i + 1)
            if scene_info:
                scene_number, location, time = scene_info

                # Auto-increment if no number found
                if scene_number is None:
                    current_scene_number += 1
                    scene_number = current_scene_number
                else:
                    current_scene_number = scene_number

                scene = Scene(
                    scene_number=scene_number,
                    location=location,
                    time=time,
                    content="",  # Will be filled later
                    start_line=i + 1
                )
                scenes.append(scene)

        # Set end lines for each scene
        for i, scene in enumerate(scenes):
            if i + 1 < len(scenes):
                scene.end_line = scenes[i + 1].start_line - 1
            else:
                scene.end_line = len(lines)

        return scenes

    def _parse_scene_header(self, line: str, line_number: int) -> Optional[Tuple[Optional[int], str, str]]:
        """
        Parse a single scene header line

        Args:
            line: Line text
            line_number: Line number

        Returns:
            Tuple of (scene_number, location, time) or None
        """
        # Try Chinese patterns
        chinese_result = self._parse_chinese_scene(line)
        if chinese_result:
            return chinese_result

        # Try English patterns
        english_result = self._parse_english_scene(line)
        if english_result:
            return english_result

        return None

    def _parse_chinese_scene(self, line: str) -> Optional[Tuple[Optional[int], str, str]]:
        """Parse Chinese scene header"""
        scene_number = None
        location = ""
        time = ""

        # Extract scene number
        for pattern, extractor in self.chinese_number_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                scene_number = extractor(match)
                break

        # Check if this looks like a scene header
        if scene_number is None and not any(char in line for char in ['场景', '场', '第']):
            return None

        # Extract location and time
        # Pattern: "场景1：咖啡厅-白天" or "第1场 咖啡厅 白天" or "1. 咖啡厅-白天"
        remainder = re.sub(r'^(场景|第)?\s*\d*\s*(场)?[、.．:：\s]*', '', line).strip()

        # Split by common separators
        parts = re.split(r'[-–—\s]+', remainder, maxsplit=1)

        if parts:
            location = parts[0].strip()

        if len(parts) > 1:
            time_part = parts[1].strip()
            # Common time keywords
            if any(keyword in time_part for keyword in ['白天', '夜晚', '早晨', '下午', '傍晚', '深夜']):
                time = time_part

        # If no location found, use the whole remainder
        if not location and remainder:
            location = remainder

        # Only return if we found a location or scene number
        if location or scene_number is not None:
            return (scene_number, location, time)

        return None

    def _parse_english_scene(self, line: str) -> Optional[Tuple[Optional[int], str, str]]:
        """Parse English scene header (INT./EXT. format)"""
        match = re.match(self.english_scene_pattern, line.strip(), re.IGNORECASE)

        if match:
            int_ext = match.group(1)
            location = match.group(2).strip()
            time_of_day = match.group(3)

            # Combine INT/EXT with location
            full_location = f"{int_ext}. {location}"

            return (None, full_location, time_of_day)

        # Try SCENE N format
        scene_match = re.match(r'SCENE\s+(\d+)', line.strip(), re.IGNORECASE)
        if scene_match:
            scene_number = int(scene_match.group(1))
            # Extract remainder as location
            location = re.sub(r'SCENE\s+\d+\s*[:：]?\s*', '', line.strip(), flags=re.IGNORECASE)
            return (scene_number, location, "")

        return None

    def assign_content_to_scenes(
        self,
        lines: List[str],
        scenes: List[Scene]
    ) -> List[Scene]:
        """
        Assign content lines to each scene

        Args:
            lines: All script lines
            scenes: Parsed scenes

        Returns:
            Scenes with content filled
        """
        for scene in scenes:
            start_idx = scene.start_line - 1
            end_idx = (scene.end_line or len(lines)) - 1

            # Get lines for this scene (excluding header)
            scene_lines = lines[start_idx + 1:end_idx + 1]
            scene.content = '\n'.join(scene_lines)

        return scenes

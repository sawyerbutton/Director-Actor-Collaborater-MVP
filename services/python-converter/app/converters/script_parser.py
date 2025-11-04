"""
Main Script Parser

Orchestrates all parsing components to convert script to structured JSON
"""

from typing import Optional
from app.converters.preprocessor import TextPreprocessor
from app.converters.scene_parser import SceneParser
from app.converters.character_parser import CharacterParser
from app.converters.types import ParsedScript, Language


class ScriptParser:
    """Main script parser orchestrator"""

    def __init__(self):
        self.preprocessor = TextPreprocessor()
        self.scene_parser = SceneParser()
        self.character_parser = CharacterParser()

    def parse(
        self,
        text: str,
        detect_aliases: bool = True,
        filename: Optional[str] = None,
        episode_number: Optional[int] = None
    ) -> ParsedScript:
        """
        Parse script text into structured JSON

        Args:
            text: Raw script text
            detect_aliases: Whether to detect character name variations
            filename: Optional filename for metadata
            episode_number: Optional episode number for metadata

        Returns:
            Parsed script structure

        Raises:
            ValueError: If text is empty or invalid
        """
        # Validate input
        if not text or not text.strip():
            raise ValueError("Script text cannot be empty")

        # Preprocess text
        lines, language = self.preprocessor.preprocess(text)

        if not lines:
            raise ValueError("No valid content found in script")

        # Parse scenes
        scenes = self.scene_parser.parse_scenes(lines)

        # Assign content to scenes
        scenes = self.scene_parser.assign_content_to_scenes(lines, scenes)

        # Parse characters and dialogues
        characters, dialogues, actions = self.character_parser.parse_characters_and_dialogues(
            lines,
            scenes
        )

        # Detect character aliases if requested
        if detect_aliases and characters:
            characters = self.character_parser.detect_character_aliases(
                characters,
                dialogues
            )

        # Build metadata
        metadata = {}
        if filename:
            metadata['filename'] = filename
        if episode_number is not None:
            metadata['episode_number'] = episode_number

        metadata['total_lines'] = len(lines)

        # Assemble final structure
        parsed_script = ParsedScript(
            scenes=scenes,
            characters=characters,
            dialogues=dialogues,
            actions=actions,
            language=language,
            total_scenes=len(scenes),
            total_characters=len(characters),
            metadata=metadata
        )

        return parsed_script

    def parse_to_dict(
        self,
        text: str,
        detect_aliases: bool = True,
        filename: Optional[str] = None,
        episode_number: Optional[int] = None
    ) -> dict:
        """
        Parse script and return as dictionary (JSON-serializable)

        Args:
            text: Raw script text
            detect_aliases: Whether to detect character name variations
            filename: Optional filename for metadata
            episode_number: Optional episode number for metadata

        Returns:
            Parsed script as dictionary

        Raises:
            ValueError: If text is empty or invalid
        """
        parsed = self.parse(
            text,
            detect_aliases=detect_aliases,
            filename=filename,
            episode_number=episode_number
        )

        return parsed.model_dump()

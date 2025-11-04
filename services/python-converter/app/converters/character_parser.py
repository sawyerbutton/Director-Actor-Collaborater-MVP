"""
Character and Dialogue Parser

Extracts characters, dialogues, and actions from script
"""

import re
from typing import List, Dict, Tuple
from collections import defaultdict
from app.converters.types import Character, Dialogue, Action, Scene
from app.converters.preprocessor import TextPreprocessor


class CharacterParser:
    """Parses characters and dialogues from script"""

    def __init__(self):
        self.preprocessor = TextPreprocessor()

    def parse_characters_and_dialogues(
        self,
        lines: List[str],
        scenes: List[Scene]
    ) -> Tuple[List[Character], List[Dialogue], List[Action]]:
        """
        Parse characters, dialogues, and actions

        Args:
            lines: Script lines
            scenes: Parsed scenes

        Returns:
            Tuple of (characters, dialogues, actions)
        """
        dialogues: List[Dialogue] = []
        actions: List[Action] = []
        character_stats: Dict[str, Dict] = defaultdict(lambda: {
            'dialogue_count': 0,
            'first_appearance_scene': None,
            'line_numbers': []
        })

        current_scene = None
        current_character = None

        for i, line in enumerate(lines):
            line_number = i + 1

            # Determine current scene
            for scene in scenes:
                if scene.start_line <= line_number <= (scene.end_line or float('inf')):
                    current_scene = scene
                    break

            if not current_scene:
                continue

            # Check if this is a scene header (skip it)
            if self.preprocessor.is_scene_header(line):
                current_character = None
                continue

            # Check if this is a character name
            if self.preprocessor.is_character_name(line):
                current_character = self.preprocessor.extract_character_name(line)

                # Update character stats
                if character_stats[current_character]['first_appearance_scene'] is None:
                    character_stats[current_character]['first_appearance_scene'] = current_scene.scene_number

                continue

            # Check if this is dialogue (following a character name)
            if current_character and line.strip():
                # Check for parenthetical (stage direction)
                parenthetical = None
                dialogue_text = line.strip()

                # Extract parenthetical if present
                paren_match = re.match(r'^\(([^)]+)\)\s*(.*)', dialogue_text)
                if paren_match:
                    parenthetical = paren_match.group(1)
                    dialogue_text = paren_match.group(2)

                # If there's remaining text, it's dialogue
                if dialogue_text:
                    dialogue = Dialogue(
                        character=current_character,
                        text=dialogue_text,
                        scene_number=current_scene.scene_number,
                        line_number=line_number,
                        parenthetical=parenthetical
                    )
                    dialogues.append(dialogue)

                    # Update stats
                    character_stats[current_character]['dialogue_count'] += 1
                    character_stats[current_character]['line_numbers'].append(line_number)

                    continue

            # If not dialogue and not character name, treat as action
            if line.strip() and not current_character:
                action = Action(
                    text=line.strip(),
                    scene_number=current_scene.scene_number,
                    line_number=line_number
                )
                actions.append(action)

        # Convert character stats to Character objects
        characters = [
            Character(
                name=name,
                dialogue_count=stats['dialogue_count'],
                first_appearance_scene=stats['first_appearance_scene'] or 1,
                aliases=[]
            )
            for name, stats in character_stats.items()
        ]

        # Sort characters by first appearance
        characters.sort(key=lambda c: c.first_appearance_scene)

        return characters, dialogues, actions

    def detect_character_aliases(
        self,
        characters: List[Character],
        dialogues: List[Dialogue]
    ) -> List[Character]:
        """
        Detect potential character name variations/aliases

        Args:
            characters: List of characters
            dialogues: List of dialogues

        Returns:
            Characters with aliases detected
        """
        # Build name similarity groups
        name_groups: Dict[str, List[str]] = defaultdict(list)

        for char in characters:
            # Normalize name for comparison
            normalized = char.name.upper().strip()

            # Check for similar names
            for existing_norm, names in name_groups.items():
                # Simple similarity: check if one name contains the other
                if normalized in existing_norm or existing_norm in normalized:
                    names.append(char.name)
                    break
            else:
                name_groups[normalized] = [char.name]

        # Assign aliases to characters
        for char in characters:
            normalized = char.name.upper().strip()
            if normalized in name_groups:
                aliases = [n for n in name_groups[normalized] if n != char.name]
                char.aliases = aliases

        return characters

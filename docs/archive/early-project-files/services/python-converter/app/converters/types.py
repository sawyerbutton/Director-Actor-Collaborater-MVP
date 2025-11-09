"""
Type Definitions for Script Parser

Data structures for parsed script components
"""

from typing import List, Dict, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class Language(str, Enum):
    """Script language enumeration"""
    CHINESE = "zh"
    ENGLISH = "en"
    MIXED = "mixed"


class SegmentType(str, Enum):
    """Segment type enumeration"""
    SCENE_HEADER = "scene_header"
    CHARACTER_NAME = "character_name"
    DIALOGUE = "dialogue"
    ACTION = "action"
    PARENTHETICAL = "parenthetical"
    TRANSITION = "transition"


class Scene(BaseModel):
    """Scene data structure"""
    scene_number: int = Field(..., description="Scene number")
    location: str = Field(..., description="Scene location")
    time: str = Field(default="", description="Time of day (白天/夜晚)")
    content: str = Field(..., description="Full scene content")
    start_line: int = Field(..., description="Starting line number")
    end_line: Optional[int] = Field(None, description="Ending line number")


class Character(BaseModel):
    """Character data structure"""
    name: str = Field(..., description="Character name")
    dialogue_count: int = Field(default=0, description="Number of dialogues")
    first_appearance_scene: int = Field(..., description="First scene appearance")
    aliases: List[str] = Field(default_factory=list, description="Character name variations")


class Dialogue(BaseModel):
    """Dialogue data structure"""
    character: str = Field(..., description="Speaking character")
    text: str = Field(..., description="Dialogue text")
    scene_number: int = Field(..., description="Scene number")
    line_number: int = Field(..., description="Line number")
    parenthetical: Optional[str] = Field(None, description="Stage direction")


class Action(BaseModel):
    """Action/Description data structure"""
    text: str = Field(..., description="Action description")
    scene_number: int = Field(..., description="Scene number")
    line_number: int = Field(..., description="Line number")


class ParsedScript(BaseModel):
    """Complete parsed script structure"""
    scenes: List[Scene] = Field(default_factory=list, description="All scenes")
    characters: List[Character] = Field(default_factory=list, description="All characters")
    dialogues: List[Dialogue] = Field(default_factory=list, description="All dialogues")
    actions: List[Action] = Field(default_factory=list, description="All actions")
    language: Language = Field(default=Language.MIXED, description="Script language")
    total_scenes: int = Field(default=0, description="Total scene count")
    total_characters: int = Field(default=0, description="Total character count")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "scenes": [
                    {
                        "scene_number": 1,
                        "location": "咖啡厅",
                        "time": "白天",
                        "content": "张三走进咖啡厅...",
                        "start_line": 1,
                        "end_line": 10
                    }
                ],
                "characters": [
                    {
                        "name": "张三",
                        "dialogue_count": 5,
                        "first_appearance_scene": 1,
                        "aliases": []
                    }
                ],
                "dialogues": [
                    {
                        "character": "张三",
                        "text": "你好！",
                        "scene_number": 1,
                        "line_number": 5,
                        "parenthetical": None
                    }
                ],
                "actions": [],
                "language": "zh",
                "total_scenes": 1,
                "total_characters": 1,
                "metadata": {}
            }
        }

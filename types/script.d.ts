export interface ScriptMetadata {
  parseVersion: string
  parseTime: Date
  language: 'zh' | 'en' | 'mixed'
  originalLength: number
  encoding?: string
}

export interface Scene {
  id: string
  index: number
  type?: 'INT' | 'EXT' | 'INT/EXT'
  title: string
  description?: string
  location?: string
  timeOfDay?: string
  characters: string[]
  dialogues: Dialogue[]
  actions: Action[]
  startLine?: number
  endLine?: number
}

export interface Character {
  id: string
  name: string
  aliases?: string[]
  firstAppearance: {
    sceneId: string
    lineNumber?: number
  }
  dialogueCount: number
  scenes: string[]
}

export interface Dialogue {
  id: string
  characterId: string
  characterName: string
  content: string
  sceneId: string
  parentheticals?: string[]
  lineNumber?: number
}

export interface Action {
  id: string
  description: string
  sceneId: string
  type?: 'stage_direction' | 'character_action' | 'transition'
  characters?: string[]
  lineNumber?: number
}

export interface ParsedScript {
  metadata: ScriptMetadata
  scenes: Scene[]
  characters: Character[]
  dialogues: Dialogue[]
  actions: Action[]
  totalDialogues: number
  totalActions: number
  errors?: ParseError[]
}

export interface ParseError {
  type: 'warning' | 'error'
  message: string
  lineNumber?: number
  context?: string
}

export interface ParserOptions {
  language?: 'zh' | 'en' | 'auto'
  strict?: boolean
  preserveFormatting?: boolean
  detectCharacterAliases?: boolean
}
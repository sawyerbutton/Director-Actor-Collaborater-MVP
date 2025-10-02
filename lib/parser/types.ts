export interface ParserContext {
  currentScene?: string
  currentCharacter?: string
  lineNumber: number
  language: 'zh' | 'en' | 'mixed'
  errors: ParseError[]
}

export interface ParseError {
  type: 'warning' | 'error'
  message: string
  lineNumber?: number
  context?: string
}

export interface TextSegment {
  type: 'scene_heading' | 'character_cue' | 'dialogue' | 'action' | 'parenthetical' | 'transition' | 'unknown'
  content: string
  lineNumber: number
  metadata?: Record<string, any>
}

export interface ScenePattern {
  pattern: RegExp
  type: 'INT' | 'EXT' | 'INT/EXT'
  language: 'zh' | 'en'
}

export interface CharacterPattern {
  pattern: RegExp
  language: 'zh' | 'en'
}

export interface PreprocessedText {
  segments: TextSegment[]
  originalText: string
  cleanedText: string
  language: 'zh' | 'en' | 'mixed'
  encoding: string
}

export const SCENE_PATTERNS: ScenePattern[] = [
  // Chinese patterns - more flexible to match various formats
  { pattern: /^场景[\s]?(\d+|[一二三四五六七八九十]+)[\s]*[:：]/i, type: 'INT', language: 'zh' },
  { pattern: /^第[\s]?(\d+|[一二三四五六七八九十]+)[\s]?场[\s]*[:：]/i, type: 'INT', language: 'zh' },
  { pattern: /^内景[\s]*[:：]/i, type: 'INT', language: 'zh' },
  { pattern: /^外景[\s]*[:：]/i, type: 'EXT', language: 'zh' },
  { pattern: /^内\/外景[\s]*[:：]/i, type: 'INT/EXT', language: 'zh' },

  // English patterns
  { pattern: /^INT\.\s/i, type: 'INT', language: 'en' },
  { pattern: /^EXT\.\s/i, type: 'EXT', language: 'en' },
  { pattern: /^INT\.\/EXT\.\s/i, type: 'INT/EXT', language: 'en' },
  { pattern: /^SCENE\s+\d+[\s]*[:：]/i, type: 'INT', language: 'en' }
]

export const CHARACTER_PATTERNS: CharacterPattern[] = [
  // Chinese patterns
  { pattern: /^[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+[:：](?!\/)/, language: 'zh' },
  { pattern: /^[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+（/, language: 'zh' },
  
  // English patterns
  { pattern: /^[A-Z][A-Z\s\.]+:(?!\/)/, language: 'en' },
  { pattern: /^[A-Z][A-Z\s\.]+\(/, language: 'en' }
]

export const TRANSITION_PATTERNS = [
  /^(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|MATCH CUT|SMASH CUT)[:：]?$/i,
  /^(淡入|淡出|切至|切到|溶解|硬切)[:：]?$/
]

export const PARENTHETICAL_PATTERN = /\(([^)]+)\)/g
export const CHINESE_PARENTHETICAL_PATTERN = /（([^）]+)）/g
import { 
  PreprocessedText, 
  TextSegment, 
  SCENE_PATTERNS, 
  CHARACTER_PATTERNS,
  TRANSITION_PATTERNS,
  PARENTHETICAL_PATTERN,
  CHINESE_PARENTHETICAL_PATTERN
} from './types'

export class TextPreprocessor {
  private detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const totalChars = text.replace(/\s+/g, '').length // Ignore whitespace
    
    if (totalChars === 0) return 'en'
    
    const chineseRatio = chineseChars / totalChars
    const englishRatio = englishWords / Math.max(1, text.match(/[a-zA-Z\s]+/g)?.join('').length || 1)
    
    // More lenient detection
    if (chineseRatio > 0.1) return 'zh'
    if (chineseChars === 0 && englishWords > 0) return 'en'
    if (chineseChars > 0 && englishWords > 0) return 'mixed'
    
    return 'en' // Default to English
  }
  
  private cleanText(text: string): string {
    // Normalize line breaks
    let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    
    // Remove excessive whitespace while preserving structure
    cleaned = cleaned.replace(/[ \t]+/g, ' ')
    
    // Remove leading/trailing whitespace from each line
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n')
    
    // Remove multiple consecutive empty lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    
    return cleaned
  }
  
  private normalizeChinesePunctuation(text: string): string {
    // Normalize Chinese punctuation for consistent parsing
    return text
      .replace(/：/g, ':')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/！/g, '!')
      .replace(/？/g, '?')
      .replace(/，/g, ',')
      .replace(/。/g, '.')
      .replace(/；/g, ';')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
  }
  
  private detectSegmentType(line: string, language: 'zh' | 'en' | 'mixed'): TextSegment['type'] {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) return 'unknown'
    
    // Check for scene heading
    for (const scenePattern of SCENE_PATTERNS) {
      if (scenePattern.pattern.test(trimmedLine)) {
        return 'scene_heading'
      }
    }
    
    // Check for transitions
    for (const pattern of TRANSITION_PATTERNS) {
      if (pattern.test(trimmedLine)) {
        return 'transition'
      }
    }
    
    // Check for character cue
    for (const charPattern of CHARACTER_PATTERNS) {
      if (charPattern.pattern.test(trimmedLine)) {
        return 'character_cue'
      }
    }
    
    // Check for parenthetical
    if (PARENTHETICAL_PATTERN.test(trimmedLine) || CHINESE_PARENTHETICAL_PATTERN.test(trimmedLine)) {
      if (trimmedLine.startsWith('(') || trimmedLine.startsWith('（')) {
        return 'parenthetical'
      }
    }
    
    // Check if it looks like dialogue (follows character cue pattern)
    if (trimmedLine.length > 0 && !trimmedLine.match(/^[A-Z\s]+$/) && !trimmedLine.match(/^[\u4e00-\u9fa5]+$/)) {
      return 'dialogue'
    }
    
    // Default to action
    return 'action'
  }
  
  private segmentText(text: string, language: 'zh' | 'en' | 'mixed'): TextSegment[] {
    const lines = text.split('\n')
    const segments: TextSegment[] = []
    let currentSegment: TextSegment | null = null
    let lastCharacterCue: number = -1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      
      if (!trimmedLine) {
        // Empty line - might signal end of dialogue or action
        if (currentSegment) {
          segments.push(currentSegment)
          currentSegment = null
        }
        continue
      }
      
      const segmentType = this.detectSegmentType(trimmedLine, language)
      
      if (segmentType === 'scene_heading' || segmentType === 'character_cue' || segmentType === 'transition') {
        // These types always start a new segment
        if (currentSegment) {
          segments.push(currentSegment)
        }
        
        currentSegment = {
          type: segmentType,
          content: trimmedLine,
          lineNumber: i + 1
        }
        
        if (segmentType === 'character_cue') {
          lastCharacterCue = i
        }
        
        segments.push(currentSegment)
        currentSegment = null
      } else if (segmentType === 'dialogue' && lastCharacterCue === i - 1) {
        // Dialogue immediately following character cue
        currentSegment = {
          type: 'dialogue',
          content: trimmedLine,
          lineNumber: i + 1
        }
      } else if (segmentType === 'parenthetical' && lastCharacterCue >= i - 2) {
        // Parenthetical near character cue
        if (currentSegment) {
          segments.push(currentSegment)
        }
        segments.push({
          type: 'parenthetical',
          content: trimmedLine,
          lineNumber: i + 1
        })
        currentSegment = null
      } else if (currentSegment && currentSegment.type === segmentType && segmentType === 'dialogue') {
        // Continue dialogue
        currentSegment.content += '\n' + trimmedLine
      } else if (currentSegment && currentSegment.type === 'action' && segmentType === 'action') {
        // Continue action
        currentSegment.content += '\n' + trimmedLine
      } else {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment)
        }
        currentSegment = {
          type: segmentType,
          content: trimmedLine,
          lineNumber: i + 1
        }
      }
    }
    
    // Add last segment if exists
    if (currentSegment) {
      segments.push(currentSegment)
    }
    
    return segments
  }
  
  public preprocess(text: string, normalizeChinesePunctuation = false): PreprocessedText {
    const originalText = text
    const language = this.detectLanguage(text)
    
    let cleanedText = this.cleanText(text)
    
    if (normalizeChinesePunctuation && (language === 'zh' || language === 'mixed')) {
      cleanedText = this.normalizeChinesePunctuation(cleanedText)
    }
    
    const segments = this.segmentText(cleanedText, language)
    
    return {
      segments,
      originalText,
      cleanedText,
      language,
      encoding: 'UTF-8'
    }
  }
  
  public detectEncoding(buffer: Buffer): string {
    // Simple encoding detection
    // In production, you might want to use a library like 'chardet'
    
    // Check for BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'UTF-8'
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'UTF-16LE'
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'UTF-16BE'
    }
    
    // Default to UTF-8
    return 'UTF-8'
  }
}
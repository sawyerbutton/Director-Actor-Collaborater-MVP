import { ScriptParser } from '../../../lib/parser/script-parser'
import { englishScriptSample } from './samples/english-script'
import { chineseScriptSample } from './samples/chinese-script'

describe('ScriptParser', () => {
  let parser: ScriptParser
  
  beforeEach(() => {
    parser = new ScriptParser()
  })
  
  describe('parse', () => {
    it('should parse English script', () => {
      const result = parser.parse(englishScriptSample)
      
      expect(result.metadata.language).toBe('en')
      expect(result.scenes.length).toBe(2)
      expect(result.characters.length).toBe(2)
      expect(result.totalDialogues).toBeGreaterThan(0)
      expect(result.totalActions).toBeGreaterThan(0)
    })
    
    it('should parse Chinese script', () => {
      const result = parser.parse(chineseScriptSample)
      
      expect(result.metadata.language).toBe('zh')
      expect(result.scenes.length).toBe(2)
      expect(result.characters.length).toBeGreaterThanOrEqual(3)
      expect(result.totalDialogues).toBeGreaterThan(0)
    })
    
    it('should handle empty input', () => {
      const result = parser.parse('')
      
      expect(result.scenes.length).toBe(0)
      expect(result.characters.length).toBe(0)
      expect(result.errors).toBeDefined()
      expect(result.errors![0].message).toContain('empty')
    })
    
    it('should detect character aliases', () => {
      const text = `INT. ROOM - DAY
      
      JOHN:
      Hello!
      
      JOHNNY:
      It's me again!
      
      JOHN:
      Yes!`
      
      const result = parser.parse(text, { detectCharacterAliases: true })
      
      // Should recognize JOHN and JOHNNY as potentially the same character
      const john = result.characters.find(c => c.name === 'JOHN')
      expect(john).toBeDefined()
    })
    
    it('should preserve formatting when requested', () => {
      const text = `INT. ROOM - DAY
      
      JOHN:
          This    has    weird    spacing!`
      
      const result = parser.parse(text, { preserveFormatting: true })
      const dialogue = result.dialogues[0]
      expect(dialogue.content).toBeDefined()
    })
  })
  
  describe('parseFile', () => {
    it('should parse file from buffer', () => {
      const buffer = Buffer.from(englishScriptSample, 'utf8')
      const result = parser.parseFile(buffer, 'test.txt')
      
      expect(result.scenes.length).toBe(2)
      expect((result.metadata as any).filename).toBe('test.txt')
    })
    
    it('should handle UTF-16LE encoding', () => {
      const text = 'INT. ROOM - DAY\n\nJOHN:\nHello!'
      const buffer = Buffer.from('\ufeff' + text, 'utf16le')
      const result = parser.parseFile(buffer)
      
      expect(result.scenes.length).toBeGreaterThan(0)
    })
    
    it('should handle parsing errors gracefully', () => {
      const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF])
      const result = parser.parseFile(buffer)
      
      expect(result.errors).toBeDefined()
      expect(result.errors![0].type).toBe('error')
    })
  })
  
  describe('getSummary', () => {
    it('should generate readable summary', () => {
      const result = parser.parse(englishScriptSample)
      const summary = parser.getSummary(result)
      
      expect(summary).toContain('Script Parse Summary')
      expect(summary).toContain('Scenes: 2')
      expect(summary).toContain('Characters: 2')
      expect(summary).toContain('JOHN')
      expect(summary).toContain('MARY')
    })
    
    it('should include errors in summary', () => {
      const result = parser.parse('')
      const summary = parser.getSummary(result)
      
      expect(summary).toContain('error')
    })
  })
  
  describe('toJSON', () => {
    it('should convert to JSON string', () => {
      const result = parser.parse(englishScriptSample)
      const json = parser.toJSON(result)
      
      expect(() => JSON.parse(json)).not.toThrow()
      
      const parsed = JSON.parse(json)
      expect(parsed.scenes.length).toBe(2)
      expect(parsed.characters.length).toBe(2)
    })
  })
  
  describe('edge cases', () => {
    it('should handle script with only dialogue', () => {
      const text = `JOHN:
      Hello!
      
      MARY:
      Hi!`
      
      const result = parser.parse(text)
      expect(result.scenes.length).toBe(1)
      expect(result.dialogues.length).toBe(2)
    })
    
    it('should handle script with only actions', () => {
      const text = `A man walks into a room.
      
      He sits down.
      
      The door closes.`
      
      const result = parser.parse(text)
      expect(result.scenes.length).toBe(1)
      expect(result.actions.length).toBeGreaterThan(0)
    })
    
    it('should handle mixed language script', () => {
      const text = `场景1: Office - DAY
      
      JOHN:
      Hello!
      
      李明：
      你好！`
      
      const result = parser.parse(text)
      expect(result.metadata.language).toBe('mixed')
      expect(result.characters.length).toBe(2)
    })
    
    it('should handle malformed character cues', () => {
      const text = `INT. ROOM
      
      JOHN
      This should not be dialogue
      
      MARY:
      This should be dialogue`
      
      const result = parser.parse(text)
      expect(result.dialogues.some(d => d.content === 'This should be dialogue')).toBe(true)
    })
  })
})
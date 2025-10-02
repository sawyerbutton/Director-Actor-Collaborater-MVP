import { TextPreprocessor } from '../../../lib/parser/preprocessor'
import { englishScriptSample } from './samples/english-script'
import { chineseScriptSample } from './samples/chinese-script'

describe('TextPreprocessor', () => {
  let preprocessor: TextPreprocessor
  
  beforeEach(() => {
    preprocessor = new TextPreprocessor()
  })
  
  describe('language detection', () => {
    it('should detect English text', () => {
      const result = preprocessor.preprocess(englishScriptSample)
      expect(result.language).toBe('en')
    })
    
    it('should detect Chinese text', () => {
      const result = preprocessor.preprocess(chineseScriptSample)
      expect(result.language).toBe('zh')
    })
    
    it('should detect mixed language text', () => {
      const mixedText = `场景1: Office
      
      JOHN: Hello
      李明：你好`
      
      const result = preprocessor.preprocess(mixedText)
      expect(result.language).toBe('mixed')
    })
  })
  
  describe('text cleaning', () => {
    it('should normalize line breaks', () => {
      const text = 'Line 1\r\nLine 2\rLine 3\nLine 4'
      const result = preprocessor.preprocess(text)
      expect(result.cleanedText).not.toContain('\r')
    })
    
    it('should remove excessive whitespace', () => {
      const text = 'Word1    Word2     Word3'
      const result = preprocessor.preprocess(text)
      expect(result.cleanedText).toBe('Word1 Word2 Word3')
    })
    
    it('should remove multiple empty lines', () => {
      const text = 'Line 1\n\n\n\n\nLine 2'
      const result = preprocessor.preprocess(text)
      expect(result.cleanedText).toBe('Line 1\n\nLine 2')
    })
  })
  
  describe('segmentation', () => {
    it('should identify scene headings', () => {
      const result = preprocessor.preprocess(englishScriptSample)
      const sceneHeadings = result.segments.filter(s => s.type === 'scene_heading')
      expect(sceneHeadings.length).toBeGreaterThan(0)
      expect(sceneHeadings[0].content).toContain('INT. COFFEE SHOP')
    })
    
    it('should identify character cues', () => {
      const result = preprocessor.preprocess(englishScriptSample)
      const characterCues = result.segments.filter(s => s.type === 'character_cue')
      expect(characterCues.length).toBeGreaterThan(0)
      expect(characterCues.some(c => c.content.includes('JOHN'))).toBe(true)
      expect(characterCues.some(c => c.content.includes('MARY'))).toBe(true)
    })
    
    it('should identify dialogues', () => {
      const result = preprocessor.preprocess(englishScriptSample)
      const dialogues = result.segments.filter(s => s.type === 'dialogue')
      expect(dialogues.length).toBeGreaterThan(0)
    })
    
    it('should identify parentheticals', () => {
      const result = preprocessor.preprocess(englishScriptSample)
      const parentheticals = result.segments.filter(s => s.type === 'parenthetical')
      expect(parentheticals.length).toBeGreaterThan(0)
    })
    
    it('should identify transitions', () => {
      const result = preprocessor.preprocess(englishScriptSample)
      const transitions = result.segments.filter(s => s.type === 'transition')
      expect(transitions.length).toBeGreaterThan(0)
      expect(transitions.some(t => t.content.includes('FADE IN'))).toBe(true)
    })
    
    it('should identify Chinese scene headings', () => {
      const result = preprocessor.preprocess(chineseScriptSample)
      const sceneHeadings = result.segments.filter(s => s.type === 'scene_heading')
      expect(sceneHeadings.length).toBeGreaterThan(0)
      expect(sceneHeadings[0].content).toContain('场景1')
    })
    
    it('should identify Chinese character cues', () => {
      const result = preprocessor.preprocess(chineseScriptSample)
      const characterCues = result.segments.filter(s => s.type === 'character_cue')
      expect(characterCues.length).toBeGreaterThan(0)
      expect(characterCues.some(c => c.content.includes('李明'))).toBe(true)
      expect(characterCues.some(c => c.content.includes('张薇'))).toBe(true)
    })
  })
  
  describe('encoding detection', () => {
    it('should detect UTF-8 BOM', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
      const encoding = preprocessor.detectEncoding(buffer)
      expect(encoding).toBe('UTF-8')
    })
    
    it('should detect UTF-16LE BOM', () => {
      const buffer = Buffer.from([0xFF, 0xFE, 0x48, 0x00])
      const encoding = preprocessor.detectEncoding(buffer)
      expect(encoding).toBe('UTF-16LE')
    })
    
    it('should default to UTF-8', () => {
      const buffer = Buffer.from('Hello')
      const encoding = preprocessor.detectEncoding(buffer)
      expect(encoding).toBe('UTF-8')
    })
  })
})
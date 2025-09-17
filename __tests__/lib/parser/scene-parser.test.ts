import { SceneParser } from '../../../lib/parser/scene-parser'
import { TextPreprocessor } from '../../../lib/parser/preprocessor'
import { ParserContext } from '../../../lib/parser/types'
import { englishScriptSample } from './samples/english-script'
import { chineseScriptSample } from './samples/chinese-script'

describe('SceneParser', () => {
  let sceneParser: SceneParser
  let preprocessor: TextPreprocessor
  let context: ParserContext
  
  beforeEach(() => {
    sceneParser = new SceneParser()
    preprocessor = new TextPreprocessor()
    context = {
      lineNumber: 1,
      language: 'en',
      errors: []
    }
  })
  
  describe('parseScenes', () => {
    it('should parse English scenes', () => {
      const preprocessed = preprocessor.preprocess(englishScriptSample)
      const scenes = sceneParser.parseScenes(preprocessed.segments, context)
      
      expect(scenes.length).toBe(2)
      expect(scenes[0].title).toContain('COFFEE SHOP')
      expect(scenes[0].type).toBe('INT')
      expect(scenes[1].title).toContain('PARK')
      expect(scenes[1].type).toBe('EXT')
    })
    
    it('should parse Chinese scenes', () => {
      const preprocessed = preprocessor.preprocess(chineseScriptSample)
      const scenes = sceneParser.parseScenes(preprocessed.segments, context)
      
      expect(scenes.length).toBe(2)
      expect(scenes[0].title).toContain('Scene 1')
      expect(scenes[1].title).toContain('Scene 2')
    })
    
    it('should extract location and time of day', () => {
      const text = `INT. OFFICE - MORNING
      
      Some action here.
      
      EXT. STREET - NIGHT`
      
      const preprocessed = preprocessor.preprocess(text)
      const scenes = sceneParser.parseScenes(preprocessed.segments, context)
      
      expect(scenes[0].location).toBe('OFFICE')
      expect(scenes[0].timeOfDay).toBe('MORNING')
      expect(scenes[1].location).toBe('STREET')
      expect(scenes[1].timeOfDay).toBe('NIGHT')
    })
    
    it('should track characters in scenes', () => {
      const preprocessed = preprocessor.preprocess(englishScriptSample)
      const scenes = sceneParser.parseScenes(preprocessed.segments, context)
      
      expect(scenes[0].characters).toContain('MARY')
      expect(scenes[0].characters).toContain('JOHN')
    })
    
    it('should create default scene when no headings found', () => {
      const text = `JOHN:
      Hello world!
      
      MARY:
      Hi there!`
      
      const preprocessed = preprocessor.preprocess(text)
      const scenes = sceneParser.parseScenes(preprocessed.segments, context)
      
      expect(scenes.length).toBe(1)
      expect(scenes[0].title).toBe('Scene 1')
      expect(context.errors.some(e => e.message.includes('No scene headings found'))).toBe(true)
    })
  })
  
  describe('assignSegmentsToScenes', () => {
    it('should assign segments to correct scenes', () => {
      const preprocessed = preprocessor.preprocess(englishScriptSample)
      const scenes = sceneParser.parseScenes(preprocessed.segments, context)
      const sceneSegments = sceneParser.assignSegmentsToScenes(preprocessed.segments, scenes)
      
      expect(sceneSegments.size).toBe(2)
      
      const firstSceneSegments = sceneSegments.get(scenes[0].id)
      expect(firstSceneSegments).toBeDefined()
      expect(firstSceneSegments!.some(s => s.content.includes('MARY'))).toBe(true)
      expect(firstSceneSegments!.some(s => s.content.includes('JOHN'))).toBe(true)
      
      const secondSceneSegments = sceneSegments.get(scenes[1].id)
      expect(secondSceneSegments).toBeDefined()
      expect(secondSceneSegments!.some(s => s.content.includes('walk through the park'))).toBe(true)
    })
    
    it('should handle empty scenes', () => {
      const scenes = sceneParser.parseScenes([], context)
      const sceneSegments = sceneParser.assignSegmentsToScenes([], scenes)
      
      expect(sceneSegments.size).toBe(0)
    })
  })
})
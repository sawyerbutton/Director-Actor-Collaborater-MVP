import { Scene } from '@/types/script'
import { TextSegment, SCENE_PATTERNS, ParserContext, ParseError } from './types'

export class SceneParser {
  private generateSceneId(index: number): string {
    return `scene_${index.toString().padStart(3, '0')}`
  }
  
  private extractSceneInfo(heading: string): {
    type?: 'INT' | 'EXT' | 'INT/EXT'
    location?: string
    timeOfDay?: string
    title: string
  } {
    let type: 'INT' | 'EXT' | 'INT/EXT' | undefined
    let location: string | undefined
    let timeOfDay: string | undefined
    let title = heading
    
    // Try to match scene patterns to extract type
    for (const pattern of SCENE_PATTERNS) {
      if (pattern.pattern.test(heading)) {
        type = pattern.type
        break
      }
    }
    
    // Extract location and time of day for English format
    const englishMatch = heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.)\s+(.+?)(?:\s+-\s+(.+))?$/i)
    if (englishMatch) {
      const locationAndTime = englishMatch[2]
      const additionalInfo = englishMatch[3]
      
      if (additionalInfo) {
        location = locationAndTime
        timeOfDay = additionalInfo
      } else {
        // Check if last part is time of day
        const timePatterns = /(DAY|NIGHT|MORNING|AFTERNOON|EVENING|DAWN|DUSK|CONTINUOUS|LATER|MOMENTS LATER)$/i
        const timeMatch = locationAndTime.match(timePatterns)
        if (timeMatch) {
          location = locationAndTime.replace(timePatterns, '').trim()
          timeOfDay = timeMatch[1]
        } else {
          location = locationAndTime
        }
      }
    }
    
    // Extract location for Chinese format
    const chineseMatch = heading.match(/^(内景|外景|内\/外景)[:：\s]+(.+?)(?:[-－—]\s*(.+))?$/i)
    if (chineseMatch) {
      location = chineseMatch[2]
      if (chineseMatch[3]) {
        timeOfDay = chineseMatch[3]
      }
    }
    
    // Extract scene number and create title
    const sceneNumberMatch = heading.match(/(?:场景|第|SCENE)\s*(\d+|[一二三四五六七八九十]+)/i)
    if (sceneNumberMatch) {
      const sceneNum = sceneNumberMatch[1]
      if (location) {
        title = `Scene ${sceneNum}: ${location}`
      } else {
        title = `Scene ${sceneNum}`
      }
    } else if (location) {
      title = location
    }
    
    return { type, location, timeOfDay, title }
  }
  
  private extractSceneDescription(segments: TextSegment[], startIndex: number): string | undefined {
    // Look for action segments immediately following the scene heading
    if (startIndex + 1 < segments.length) {
      const nextSegment = segments[startIndex + 1]
      if (nextSegment.type === 'action') {
        // Take first action as scene description
        const lines = nextSegment.content.split('\n')
        return lines[0]
      }
    }
    return undefined
  }
  
  public parseScenes(segments: TextSegment[], context: ParserContext): Scene[] {
    const scenes: Scene[] = []
    let currentScene: Scene | null = null
    let sceneIndex = 0
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      
      if (segment.type === 'scene_heading') {
        // Save previous scene if exists
        if (currentScene) {
          currentScene.endLine = segments[i - 1]?.lineNumber
          scenes.push(currentScene)
        }
        
        // Parse new scene
        const sceneInfo = this.extractSceneInfo(segment.content)
        const description = this.extractSceneDescription(segments, i)
        
        currentScene = {
          id: this.generateSceneId(sceneIndex),
          index: sceneIndex,
          type: sceneInfo.type,
          title: sceneInfo.title,
          description,
          location: sceneInfo.location,
          timeOfDay: sceneInfo.timeOfDay,
          characters: [],
          dialogues: [],
          actions: [],
          startLine: segment.lineNumber
        }
        
        sceneIndex++
      } else if (currentScene) {
        // Track elements in current scene
        if (segment.type === 'character_cue') {
          const characterName = this.extractCharacterName(segment.content)
          if (characterName && !currentScene.characters.includes(characterName)) {
            currentScene.characters.push(characterName)
          }
        }
      }
    }
    
    // Add last scene
    if (currentScene) {
      currentScene.endLine = segments[segments.length - 1]?.lineNumber
      scenes.push(currentScene)
    }
    
    // If no scenes were found, create a default scene
    if (scenes.length === 0 && segments.length > 0) {
      context.errors.push({
        type: 'warning',
        message: 'No scene headings found. Creating default scene.',
        lineNumber: 1
      })
      
      scenes.push({
        id: this.generateSceneId(0),
        index: 0,
        title: 'Scene 1',
        characters: [],
        dialogues: [],
        actions: [],
        startLine: 1,
        endLine: segments[segments.length - 1].lineNumber
      })
    }
    
    return scenes
  }
  
  private extractCharacterName(characterCue: string): string {
    // Remove dialogue markers
    let name = characterCue.replace(/[:：].*$/, '').trim()
    
    // Remove parentheticals
    name = name.replace(/\([^)]*\)/g, '').trim()
    name = name.replace(/（[^）]*）/g, '').trim()
    
    // Normalize whitespace
    name = name.replace(/\s+/g, ' ')
    
    return name
  }
  
  public assignSegmentsToScenes(
    segments: TextSegment[], 
    scenes: Scene[]
  ): Map<string, TextSegment[]> {
    const sceneSegments = new Map<string, TextSegment[]>()
    
    // Initialize map
    scenes.forEach(scene => {
      sceneSegments.set(scene.id, [])
    })
    
    if (scenes.length === 0) return sceneSegments
    
    let currentSceneIndex = 0
    
    for (const segment of segments) {
      // Find which scene this segment belongs to
      while (
        currentSceneIndex < scenes.length - 1 &&
        segment.lineNumber > (scenes[currentSceneIndex].endLine || Infinity)
      ) {
        currentSceneIndex++
      }
      
      const currentScene = scenes[currentSceneIndex]
      if (currentScene && segment.type !== 'scene_heading') {
        const segments = sceneSegments.get(currentScene.id) || []
        segments.push(segment)
        sceneSegments.set(currentScene.id, segments)
      }
    }
    
    return sceneSegments
  }
}
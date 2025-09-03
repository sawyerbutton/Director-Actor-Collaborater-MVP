import { Character, Dialogue, Action } from '@/types/script'
import { TextSegment, ParserContext, PARENTHETICAL_PATTERN, CHINESE_PARENTHETICAL_PATTERN } from './types'
import { Scene } from '@/types/script'

export class CharacterParser {
  private characterMap: Map<string, Character> = new Map()
  private dialogueIdCounter = 0
  private actionIdCounter = 0
  
  private generateDialogueId(): string {
    return `dialogue_${(this.dialogueIdCounter++).toString().padStart(4, '0')}`
  }
  
  private generateActionId(): string {
    return `action_${(this.actionIdCounter++).toString().padStart(4, '0')}`
  }
  
  private generateCharacterId(name: string): string {
    const normalized = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '')
    return `char_${normalized}`
  }
  
  private extractCharacterName(characterCue: string): string {
    // Remove dialogue markers
    let name = characterCue.replace(/[:：].*$/, '').trim()
    
    // Remove parentheticals (e.g., "JOHN (V.O.)" -> "JOHN")
    name = name.replace(/\([^)]*\)/g, '').trim()
    name = name.replace(/（[^）]*）/g, '').trim()
    
    // Normalize whitespace
    name = name.replace(/\s+/g, ' ')
    
    return name.toUpperCase()
  }
  
  private extractParentheticals(text: string): string[] {
    const parentheticals: string[] = []
    
    // Extract English parentheticals
    const englishMatches = text.match(PARENTHETICAL_PATTERN)
    if (englishMatches) {
      parentheticals.push(...englishMatches.map(match => match.slice(1, -1)))
    }
    
    // Extract Chinese parentheticals
    const chineseMatches = text.match(CHINESE_PARENTHETICAL_PATTERN)
    if (chineseMatches) {
      parentheticals.push(...chineseMatches.map(match => match.slice(1, -1)))
    }
    
    return parentheticals
  }
  
  private removeParentheticals(text: string): string {
    let cleaned = text.replace(PARENTHETICAL_PATTERN, '').trim()
    cleaned = cleaned.replace(CHINESE_PARENTHETICAL_PATTERN, '').trim()
    return cleaned
  }
  
  private normalizeCharacterName(name: string): string {
    // Normalize common variations
    const normalized = name.toUpperCase().trim()
    
    // Handle common abbreviations
    const abbreviations: Record<string, string> = {
      'V.O.': 'VOICE OVER',
      'O.S.': 'OFF SCREEN',
      'O.C.': 'OFF CAMERA',
      'CONT\'D': 'CONTINUED',
      '旁白': 'NARRATOR',
      '画外音': 'VOICE OVER'
    }
    
    for (const [abbr, full] of Object.entries(abbreviations)) {
      if (normalized.includes(abbr)) {
        return normalized.replace(abbr, '').trim()
      }
    }
    
    return normalized
  }
  
  private findOrCreateCharacter(name: string, sceneId: string, lineNumber?: number): Character {
    const normalizedName = this.normalizeCharacterName(name)
    const existingChar = Array.from(this.characterMap.values()).find(
      char => char.name === normalizedName || char.aliases?.includes(normalizedName)
    )
    
    if (existingChar) {
      if (!existingChar.scenes.includes(sceneId)) {
        existingChar.scenes.push(sceneId)
      }
      return existingChar
    }
    
    const character: Character = {
      id: this.generateCharacterId(normalizedName),
      name: normalizedName,
      firstAppearance: {
        sceneId,
        lineNumber
      },
      dialogueCount: 0,
      scenes: [sceneId]
    }
    
    this.characterMap.set(character.id, character)
    return character
  }
  
  public parseCharactersAndDialogues(
    segments: TextSegment[],
    scenes: Scene[],
    sceneSegments: Map<string, TextSegment[]>,
    context: ParserContext
  ): { characters: Character[], dialogues: Dialogue[], actions: Action[] } {
    const dialogues: Dialogue[] = []
    const actions: Action[] = []
    
    for (const scene of scenes) {
      const segments = sceneSegments.get(scene.id) || []
      let currentCharacter: Character | null = null
      let expectingDialogue = false
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        
        if (segment.type === 'character_cue') {
          const characterName = this.extractCharacterName(segment.content)
          currentCharacter = this.findOrCreateCharacter(characterName, scene.id, segment.lineNumber)
          expectingDialogue = true
          
          // Check for parenthetical in character cue
          const parentheticals = this.extractParentheticals(segment.content)
          if (parentheticals.length > 0 && i + 1 < segments.length && segments[i + 1].type === 'dialogue') {
            // These parentheticals belong to the next dialogue
            segments[i + 1].metadata = { parentheticals }
          }
        } else if (segment.type === 'dialogue' && currentCharacter && expectingDialogue) {
          const parentheticals = segment.metadata?.parentheticals || []
          
          // Check for parentheticals in the dialogue itself
          const dialogueParentheticals = this.extractParentheticals(segment.content)
          parentheticals.push(...dialogueParentheticals)
          
          const cleanedContent = this.removeParentheticals(segment.content)
          
          const dialogue: Dialogue = {
            id: this.generateDialogueId(),
            characterId: currentCharacter.id,
            characterName: currentCharacter.name,
            content: cleanedContent,
            sceneId: scene.id,
            parentheticals: parentheticals.length > 0 ? parentheticals : undefined,
            lineNumber: segment.lineNumber
          }
          
          dialogues.push(dialogue)
          scene.dialogues.push(dialogue)
          currentCharacter.dialogueCount++
          expectingDialogue = false
        } else if (segment.type === 'parenthetical' && currentCharacter) {
          // Standalone parenthetical - attach to next dialogue
          if (i + 1 < segments.length && segments[i + 1].type === 'dialogue') {
            const parentheticals = this.extractParentheticals(segment.content)
            segments[i + 1].metadata = { 
              parentheticals: [...(segments[i + 1].metadata?.parentheticals || []), ...parentheticals]
            }
          }
        } else if (segment.type === 'action') {
          expectingDialogue = false
          const action = this.parseAction(segment, scene.id, context)
          actions.push(action)
          scene.actions.push(action)
        } else if (segment.type === 'transition') {
          expectingDialogue = false
          const action: Action = {
            id: this.generateActionId(),
            description: segment.content,
            sceneId: scene.id,
            type: 'transition',
            lineNumber: segment.lineNumber
          }
          actions.push(action)
          scene.actions.push(action)
        } else {
          expectingDialogue = false
        }
      }
    }
    
    // Convert character map to array
    const characters = Array.from(this.characterMap.values())
    
    // Sort characters by first appearance
    characters.sort((a, b) => {
      const aLine = a.firstAppearance.lineNumber || 0
      const bLine = b.firstAppearance.lineNumber || 0
      return aLine - bLine
    })
    
    return { characters, dialogues, actions }
  }
  
  private parseAction(segment: TextSegment, sceneId: string, context: ParserContext): Action {
    const content = segment.content
    const characters = this.extractCharactersFromAction(content)
    
    // Determine action type
    let type: Action['type'] = 'stage_direction'
    
    if (characters.length > 0) {
      type = 'character_action'
    }
    
    if (content.match(/^(进入|退出|上场|下场|ENTERS|EXITS|ENTER|EXIT)/i)) {
      type = 'character_action'
    }
    
    return {
      id: this.generateActionId(),
      description: content,
      sceneId,
      type,
      characters: characters.length > 0 ? characters : undefined,
      lineNumber: segment.lineNumber
    }
  }
  
  private extractCharactersFromAction(actionText: string): string[] {
    const characters: string[] = []
    
    // Look for character names in uppercase (English convention)
    const uppercaseWords = actionText.match(/\b[A-Z][A-Z]+\b/g) || []
    for (const word of uppercaseWords) {
      // Check if this matches a known character
      const normalized = this.normalizeCharacterName(word)
      const exists = Array.from(this.characterMap.values()).some(
        char => char.name === normalized || char.aliases?.includes(normalized)
      )
      if (exists && !characters.includes(normalized)) {
        characters.push(normalized)
      }
    }
    
    // Look for character names in Chinese
    for (const character of Array.from(this.characterMap.values())) {
      if (actionText.includes(character.name)) {
        if (!characters.includes(character.name)) {
          characters.push(character.name)
        }
      }
    }
    
    return characters
  }
  
  public detectCharacterAliases(dialogues: Dialogue[]): void {
    // Group dialogues by similar names
    const nameGroups = new Map<string, string[]>()
    
    for (const dialogue of dialogues) {
      const name = dialogue.characterName
      let foundGroup = false
      
      // Check if this name is similar to any existing group
      for (const [key, group] of Array.from(nameGroups.entries())) {
        if (this.areNamesSimilar(name, key)) {
          group.push(name)
          foundGroup = true
          break
        }
      }
      
      if (!foundGroup) {
        nameGroups.set(name, [name])
      }
    }
    
    // Update character aliases
    for (const [primary, aliases] of Array.from(nameGroups.entries())) {
      if (aliases.length > 1) {
        const character = Array.from(this.characterMap.values()).find(
          char => char.name === primary
        )
        if (character) {
          character.aliases = aliases.filter((a: string) => a !== primary)
        }
      }
    }
  }
  
  private areNamesSimilar(name1: string, name2: string): boolean {
    // Simple similarity check
    const n1 = name1.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
    const n2 = name2.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
    
    // Exact match after normalization
    if (n1 === n2) return true
    
    // One is substring of the other
    if (n1.includes(n2) || n2.includes(n1)) return true
    
    // Levenshtein distance (simplified)
    if (Math.abs(n1.length - n2.length) <= 2) {
      let differences = 0
      const shorter = n1.length < n2.length ? n1 : n2
      const longer = n1.length < n2.length ? n2 : n1
      
      for (let i = 0; i < shorter.length; i++) {
        if (shorter[i] !== longer[i]) differences++
      }
      
      return differences <= 2
    }
    
    return false
  }
}
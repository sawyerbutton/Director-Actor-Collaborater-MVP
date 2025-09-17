import { ParsedScript, Scene, Character, Dialogue, Action, ScriptMetadata, ParseError } from '@/types/script'
import { ParserContext } from './types'

export class ScriptAssembler {
  private validateScene(scene: Scene): ParseError[] {
    const errors: ParseError[] = []
    
    if (!scene.title || scene.title.trim() === '') {
      errors.push({
        type: 'warning',
        message: `Scene ${scene.index + 1} has no title`,
        lineNumber: scene.startLine
      })
    }
    
    if (scene.dialogues.length === 0 && scene.actions.length === 0) {
      errors.push({
        type: 'warning',
        message: `Scene ${scene.index + 1} has no content`,
        lineNumber: scene.startLine
      })
    }
    
    return errors
  }
  
  private validateCharacter(character: Character): ParseError[] {
    const errors: ParseError[] = []
    
    if (character.dialogueCount === 0) {
      errors.push({
        type: 'warning',
        message: `Character "${character.name}" has no dialogue`,
        lineNumber: character.firstAppearance.lineNumber
      })
    }
    
    return errors
  }
  
  private validateDialogue(dialogue: Dialogue): ParseError[] {
    const errors: ParseError[] = []
    
    if (!dialogue.content || dialogue.content.trim() === '') {
      errors.push({
        type: 'error',
        message: `Empty dialogue for character "${dialogue.characterName}"`,
        lineNumber: dialogue.lineNumber
      })
    }
    
    if (dialogue.content && dialogue.content.length > 1000) {
      errors.push({
        type: 'warning',
        message: `Very long dialogue (${dialogue.content.length} chars) for "${dialogue.characterName}"`,
        lineNumber: dialogue.lineNumber
      })
    }
    
    return errors
  }
  
  private generateMetadata(
    originalText: string,
    language: 'zh' | 'en' | 'mixed',
    parseVersion: string = '1.0.0'
  ): ScriptMetadata {
    return {
      parseVersion,
      parseTime: new Date(),
      language,
      originalLength: originalText.length,
      encoding: 'UTF-8'
    }
  }
  
  public assemble(
    scenes: Scene[],
    characters: Character[],
    dialogues: Dialogue[],
    actions: Action[],
    originalText: string,
    language: 'zh' | 'en' | 'mixed',
    context: ParserContext
  ): ParsedScript {
    const allErrors: ParseError[] = [...context.errors]
    
    // Validate scenes
    scenes.forEach(scene => {
      const errors = this.validateScene(scene)
      allErrors.push(...errors)
    })
    
    // Validate characters
    characters.forEach(character => {
      const errors = this.validateCharacter(character)
      allErrors.push(...errors)
    })
    
    // Validate dialogues
    dialogues.forEach(dialogue => {
      const errors = this.validateDialogue(dialogue)
      allErrors.push(...errors)
    })
    
    // Calculate statistics
    const totalDialogues = dialogues.length
    const totalActions = actions.length
    
    // Generate metadata
    const metadata = this.generateMetadata(originalText, language)
    
    // Sort errors by line number
    allErrors.sort((a, b) => {
      const lineA = a.lineNumber || 0
      const lineB = b.lineNumber || 0
      return lineA - lineB
    })
    
    return {
      metadata,
      scenes,
      characters,
      dialogues,
      actions,
      totalDialogues,
      totalActions,
      errors: allErrors.length > 0 ? allErrors : undefined
    }
  }
  
  public toJSON(script: ParsedScript): string {
    return JSON.stringify(script, null, 2)
  }
  
  public getSummary(script: ParsedScript): string {
    const lines: string[] = []
    
    lines.push('=== Script Parse Summary ===')
    lines.push(`Language: ${script.metadata.language}`)
    lines.push(`Parse Time: ${script.metadata.parseTime.toISOString()}`)
    lines.push(`Original Length: ${script.metadata.originalLength} characters`)
    lines.push('')
    
    lines.push(`Scenes: ${script.scenes.length}`)
    lines.push(`Characters: ${script.characters.length}`)
    lines.push(`Total Dialogues: ${script.totalDialogues}`)
    lines.push(`Total Actions: ${script.totalActions}`)
    lines.push('')
    
    if (script.scenes.length > 0) {
      lines.push('Scene List:')
      script.scenes.forEach(scene => {
        lines.push(`  ${scene.index + 1}. ${scene.title}`)
        if (scene.location) {
          lines.push(`     Location: ${scene.location}`)
        }
        if (scene.timeOfDay) {
          lines.push(`     Time: ${scene.timeOfDay}`)
        }
        lines.push(`     Characters: ${scene.characters.length}`)
        lines.push(`     Dialogues: ${scene.dialogues.length}`)
      })
      lines.push('')
    }
    
    if (script.characters.length > 0) {
      lines.push('Character List:')
      const sortedCharacters = [...script.characters].sort((a, b) => b.dialogueCount - a.dialogueCount)
      sortedCharacters.forEach(character => {
        lines.push(`  - ${character.name}: ${character.dialogueCount} dialogues in ${character.scenes.length} scenes`)
        if (character.aliases && character.aliases.length > 0) {
          lines.push(`    Aliases: ${character.aliases.join(', ')}`)
        }
      })
      lines.push('')
    }
    
    if (script.errors && script.errors.length > 0) {
      const errorCount = script.errors.filter(e => e.type === 'error').length
      const warningCount = script.errors.filter(e => e.type === 'warning').length
      
      lines.push(`Parsing Issues: ${errorCount} errors, ${warningCount} warnings`)
      
      if (errorCount > 0) {
        lines.push('Errors:')
        script.errors
          .filter(e => e.type === 'error')
          .slice(0, 5)
          .forEach(error => {
            lines.push(`  Line ${error.lineNumber || '?'}: ${error.message}`)
          })
        if (errorCount > 5) {
          lines.push(`  ... and ${errorCount - 5} more errors`)
        }
      }
      
      if (warningCount > 0) {
        lines.push('Warnings:')
        script.errors
          .filter(e => e.type === 'warning')
          .slice(0, 5)
          .forEach(warning => {
            lines.push(`  Line ${warning.lineNumber || '?'}: ${warning.message}`)
          })
        if (warningCount > 5) {
          lines.push(`  ... and ${warningCount - 5} more warnings`)
        }
      }
    }
    
    return lines.join('\n')
  }
}
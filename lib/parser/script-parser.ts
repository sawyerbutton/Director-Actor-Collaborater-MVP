import { ParsedScript, ParserOptions } from '@/types/script'
import { ParserContext } from './types'
import { TextPreprocessor } from './preprocessor'
import { SceneParser } from './scene-parser'
import { CharacterParser } from './character-parser'
import { ScriptAssembler } from './assembler'
import { ScriptSanitizer } from './sanitizer'

export class ScriptParser {
  private preprocessor: TextPreprocessor
  private sceneParser: SceneParser
  private characterParser: CharacterParser
  private assembler: ScriptAssembler
  private sanitizer: ScriptSanitizer
  
  constructor(maxInputSize?: number) {
    this.preprocessor = new TextPreprocessor()
    this.sceneParser = new SceneParser()
    this.characterParser = new CharacterParser()
    this.assembler = new ScriptAssembler()
    this.sanitizer = new ScriptSanitizer(maxInputSize)
  }
  
  public parse(text: string, options?: ParserOptions): ParsedScript {
    try {
      // Initialize parser context
      const context: ParserContext = {
        lineNumber: 1,
        language: 'mixed',
        errors: []
      }
      
      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Input text is empty')
      }
      
      // Sanitize input to prevent XSS
      const sanitizedText = this.sanitizer.sanitizeInput(text)
      
      // Validate content for suspicious patterns
      const validation = this.sanitizer.validateContent(text)
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          context.errors.push({
            type: 'warning',
            message: `Security: ${warning}`,
            lineNumber: 1
          })
        })
      }
      
      // Preprocess text (use sanitized text)
      const preprocessed = this.preprocessor.preprocess(
        sanitizedText,
        options?.language === 'zh' || options?.language === 'auto'
      )
      
      context.language = preprocessed.language
      
      // Parse scenes
      const scenes = this.sceneParser.parseScenes(preprocessed.segments, context)
      
      // Assign segments to scenes
      const sceneSegments = this.sceneParser.assignSegmentsToScenes(
        preprocessed.segments,
        scenes
      )
      
      // Parse characters and dialogues
      const { characters, dialogues, actions } = this.characterParser.parseCharactersAndDialogues(
        preprocessed.segments,
        scenes,
        sceneSegments,
        context
      )
      
      // Detect character aliases if requested
      if (options?.detectCharacterAliases !== false) {
        this.characterParser.detectCharacterAliases(dialogues)
      }
      
      // Assemble final structure
      const parsedScript = this.assembler.assemble(
        scenes,
        characters,
        dialogues,
        actions,
        preprocessed.originalText,
        preprocessed.language,
        context
      )
      
      return parsedScript
    } catch (error) {
      // Fallback error handling
      return this.createErrorScript(text, error as Error)
    }
  }
  
  public parseFile(buffer: Buffer, filename?: string, options?: ParserOptions): ParsedScript {
    try {
      // Detect encoding
      const encoding = this.preprocessor.detectEncoding(buffer)
      
      // Convert buffer to string
      let text: string
      if (encoding === 'UTF-16LE') {
        text = buffer.toString('utf16le')
      } else if (encoding === 'UTF-16BE') {
        // Node.js doesn't have built-in UTF-16BE, need to swap bytes
        const swapped = Buffer.alloc(buffer.length)
        for (let i = 0; i < buffer.length; i += 2) {
          swapped[i] = buffer[i + 1]
          swapped[i + 1] = buffer[i]
        }
        text = swapped.toString('utf16le')
      } else {
        text = buffer.toString('utf8')
      }
      
      // Parse the text
      const result = this.parse(text, options)
      
      // Add filename to metadata if provided
      if (filename && result.metadata) {
        (result.metadata as any).filename = filename
      }
      
      return result
    } catch (error) {
      return this.createErrorScript('', error as Error)
    }
  }
  
  private createErrorScript(originalText: string, error: Error): ParsedScript {
    return {
      metadata: {
        parseVersion: '1.0.0',
        parseTime: new Date(),
        language: 'mixed',
        originalLength: originalText.length
      },
      scenes: [],
      characters: [],
      dialogues: [],
      actions: [],
      totalDialogues: 0,
      totalActions: 0,
      errors: [
        {
          type: 'error',
          message: `Failed to parse script: ${error.message}`,
          lineNumber: 1
        }
      ]
    }
  }
  
  public getSummary(script: ParsedScript): string {
    return this.assembler.getSummary(script)
  }
  
  public toJSON(script: ParsedScript, sanitizeOutput: boolean = true): string {
    const outputData = sanitizeOutput ? this.sanitizer.sanitizeOutput(script) : script
    return this.assembler.toJSON(outputData)
  }
}

// Export singleton instance for convenience
export const scriptParser = new ScriptParser()

// Export for Next.js API routes
export async function parseScript(
  input: string | Buffer,
  options?: ParserOptions
): Promise<ParsedScript> {
  const parser = new ScriptParser()
  
  if (typeof input === 'string') {
    return parser.parse(input, options)
  } else {
    return parser.parseFile(input, undefined, options)
  }
}

// Export for browser usage
export function parseScriptClient(
  text: string,
  options?: ParserOptions
): ParsedScript {
  const parser = new ScriptParser()
  return parser.parse(text, options)
}
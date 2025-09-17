import { ParsedScript, Scene, Dialogue, Action, Character, ScriptMetadata } from '@/types/analysis';
import { ErrorLocation } from '@/types/analysis';

export class ScriptParser {
  private static instance: ScriptParser;

  static getInstance(): ScriptParser {
    if (!ScriptParser.instance) {
      ScriptParser.instance = new ScriptParser();
    }
    return ScriptParser.instance;
  }

  parseScript(content: string, scriptId?: string): ParsedScript {
    const lines = content.split('\n');
    const scenes: Scene[] = [];
    const characters = new Set<string>();
    const characterMap = new Map<string, Character>();
    
    let currentScene: Scene | null = null;
    let currentSceneNumber = 0;
    let lineNumber = 0;

    const sceneRegex = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+(.+?)(?:\s+-\s+(.+))?$/i;
    const characterRegex = /^[A-Z][A-Z\s]+(?:\s*\([^)]+\))?$/;
    const dialogueRegex = /^\s{10,}(.+)$/;
    const actionRegex = /^[A-Z].*[a-z]/;
    const parentheticalRegex = /^\s*\(([^)]+)\)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      lineNumber = i + 1;

      if (!line) continue;

      if (sceneRegex.test(line)) {
        const match = line.match(sceneRegex);
        if (match) {
          if (currentScene) {
            scenes.push(currentScene);
          }
          
          currentSceneNumber++;
          currentScene = {
            id: `scene-${currentSceneNumber}`,
            number: currentSceneNumber,
            location: match[2] || 'UNKNOWN',
            time: match[3] || undefined,
            dialogues: [],
            actions: []
          };
        }
      }
      else if (characterRegex.test(line) && !line.includes('.')) {
        const characterName = line.replace(/\s*\([^)]+\)/, '').trim();
        characters.add(characterName);
        
        if (!characterMap.has(characterName)) {
          characterMap.set(characterName, {
            name: characterName,
            description: undefined,
            traits: [],
            relationships: {}
          });
        }
        
        let dialogue = '';
        let emotion = undefined;
        let direction = undefined;
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          
          if (!nextLine.trim()) break;
          
          if (parentheticalRegex.test(nextLine)) {
            const match = nextLine.match(parentheticalRegex);
            if (match) {
              direction = match[1];
            }
          } else if (dialogueRegex.test(nextLine) || nextLine.startsWith('  ')) {
            dialogue += (dialogue ? ' ' : '') + nextLine.trim();
          } else {
            break;
          }
        }
        
        if (dialogue && currentScene) {
          currentScene.dialogues.push({
            character: characterName,
            text: dialogue,
            emotion,
            direction
          });
        }
      }
      else if (actionRegex.test(line) && currentScene) {
        const involvedCharacters = Array.from(characters).filter(char => 
          line.toUpperCase().includes(char.toUpperCase())
        );
        
        currentScene.actions?.push({
          description: line,
          characters: involvedCharacters,
          type: line.includes('moves') || line.includes('walks') || line.includes('runs') 
            ? 'movement'
            : line.includes('picks up') || line.includes('touches') || line.includes('grabs')
            ? 'interaction'
            : 'environmental'
        });
      }
    }
    
    if (currentScene) {
      scenes.push(currentScene);
    }
    
    const metadata = this.extractMetadata(content, scenes);
    
    return {
      id: scriptId || `script-${Date.now()}`,
      title: this.extractTitle(content) || 'Untitled Script',
      scenes,
      characters: Array.from(characterMap.values()),
      metadata
    };
  }

  private extractTitle(content: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (line && line === line.toUpperCase() && line.length > 5) {
        return line;
      }
    }
    return 'Untitled Script';
  }

  private extractMetadata(content: string, scenes: Scene[]): ScriptMetadata {
    const metadata: ScriptMetadata = {};
    
    const hasNight = scenes.some(s => s.time?.toLowerCase().includes('night'));
    const hasDay = scenes.some(s => s.time?.toLowerCase().includes('day'));
    
    if (hasNight && hasDay) {
      metadata.timespan = '24 hours';
    } else if (hasNight) {
      metadata.timespan = 'Night';
    } else if (hasDay) {
      metadata.timespan = 'Day';
    }
    
    const interiorCount = scenes.filter(s => s.location.startsWith('INT')).length;
    const exteriorCount = scenes.filter(s => s.location.startsWith('EXT')).length;
    
    if (interiorCount > exteriorCount * 2) {
      metadata.setting = 'Indoor';
    } else if (exteriorCount > interiorCount * 2) {
      metadata.setting = 'Outdoor';
    } else {
      metadata.setting = 'Mixed';
    }
    
    return metadata;
  }

  getErrorLocation(
    script: ParsedScript,
    lineNumber: number,
    columnNumber?: number
  ): ErrorLocation {
    let currentLine = 0;
    let sceneNumber = 0;
    let characterName: string | undefined;
    let dialogueIndex = 0;
    
    for (const scene of script.scenes) {
      sceneNumber = scene.number;
      
      for (const dialogue of scene.dialogues) {
        currentLine++;
        if (currentLine >= lineNumber) {
          characterName = dialogue.character;
          break;
        }
        dialogueIndex++;
      }
      
      if (currentLine >= lineNumber) break;
    }
    
    return {
      sceneNumber,
      characterName,
      dialogueIndex,
      lineNumber,
      line: lineNumber,
      column: columnNumber
    };
  }

  getContextAroundError(
    content: string,
    location: ErrorLocation,
    contextLines: number = 5
  ): { before: string[]; after: string[]; current: string } {
    const lines = content.split('\n');
    const lineIndex = (location.lineNumber || location.line || 1) - 1;
    
    const startLine = Math.max(0, lineIndex - contextLines);
    const endLine = Math.min(lines.length - 1, lineIndex + contextLines);
    
    return {
      before: lines.slice(startLine, lineIndex),
      current: lines[lineIndex] || '',
      after: lines.slice(lineIndex + 1, endLine + 1)
    };
  }

  findRelatedErrors(
    errors: Array<{ location: ErrorLocation; type: string }>,
    targetError: { location: ErrorLocation; type: string }
  ): Array<{ location: ErrorLocation; type: string }> {
    return errors.filter(error => {
      if (error === targetError) return false;
      
      if (error.location.sceneNumber === targetError.location.sceneNumber) {
        return true;
      }
      
      if (error.location.characterName && 
          error.location.characterName === targetError.location.characterName) {
        return true;
      }
      
      if (error.type === targetError.type) {
        const lineDiff = Math.abs(
          (error.location.lineNumber || 0) - (targetError.location.lineNumber || 0)
        );
        if (lineDiff < 20) return true;
      }
      
      return false;
    });
  }

  extractSceneContext(scene: Scene): string {
    const parts: string[] = [];
    
    parts.push(`Scene ${scene.number}: ${scene.location}`);
    if (scene.time) parts.push(`Time: ${scene.time}`);
    
    if (scene.description) {
      parts.push(`Description: ${scene.description}`);
    }
    
    const characters = new Set<string>();
    scene.dialogues.forEach(d => characters.add(d.character));
    if (characters.size > 0) {
      parts.push(`Characters: ${Array.from(characters).join(', ')}`);
    }
    
    parts.push(`Dialogues: ${scene.dialogues.length}`);
    if (scene.actions) {
      parts.push(`Actions: ${scene.actions.length}`);
    }
    
    return parts.join(' | ');
  }
}
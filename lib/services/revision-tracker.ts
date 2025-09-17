import type { RevisionError } from '@/lib/stores/revision-store';
import DOMPurify from 'isomorphic-dompurify';

export interface TextModification {
  id: string;
  originalText: string;
  modifiedText: string;
  startLine: number;
  endLine: number;
  startChar?: number;
  endChar?: number;
  errorId: string;
  applied: boolean;
}

export interface ModificationConflict {
  modification1: TextModification;
  modification2: TextModification;
  reason: string;
}

export class RevisionTracker {
  private modifications: Map<string, TextModification> = new Map();
  private originalScript: string = '';
  private scriptLines: string[] = [];

  constructor(originalScript: string) {
    this.setOriginalScript(originalScript);
  }

  setOriginalScript(script: string) {
    this.originalScript = script;
    this.scriptLines = script.split('\n');
    this.modifications.clear();
  }

  addModification(error: RevisionError): TextModification | null {
    const context = (error as any).location || (error as any).context;
    if (!error.suggestion || !context) return null;

    // Sanitize snippet to prevent XSS
    const sanitizedSnippet = DOMPurify.sanitize(context.snippet || '', { ALLOWED_TAGS: [] });

    const modification: TextModification = {
      id: `mod-${error.id}`,
      originalText: sanitizedSnippet,
      modifiedText: this.applySuggestion(sanitizedSnippet, error.suggestion),
      startLine: context.line - 1, // Convert to 0-indexed
      endLine: context.line - 1,
      startChar: context.character,
      endChar: undefined,
      errorId: error.id,
      applied: false
    };

    this.modifications.set(modification.id, modification);
    return modification;
  }

  private applySuggestion(originalText: string, suggestion: string): string {
    // Sanitize input to prevent XSS
    const sanitizedSuggestion = DOMPurify.sanitize(suggestion, { ALLOWED_TAGS: [] });
    const sanitizedOriginal = DOMPurify.sanitize(originalText, { ALLOWED_TAGS: [] });
    
    // Simple implementation - can be enhanced based on suggestion format
    // For now, assume suggestion contains the replacement text
    if (sanitizedSuggestion.includes('替换为') || sanitizedSuggestion.includes('改为')) {
      const match = sanitizedSuggestion.match(/["']([^"']+)["']/);
      if (match) {
        // Return sanitized replacement text
        return DOMPurify.sanitize(match[1], { ALLOWED_TAGS: [] });
      }
    }
    
    // If no specific replacement found, return original with comment
    return sanitizedOriginal + ' // ' + sanitizedSuggestion;
  }

  removeModification(errorId: string) {
    const modId = `mod-${errorId}`;
    this.modifications.delete(modId);
  }

  applyModification(errorId: string): boolean {
    const modId = `mod-${errorId}`;
    const modification = this.modifications.get(modId);
    
    if (!modification) return false;
    
    modification.applied = true;
    return true;
  }

  unapplyModification(errorId: string): boolean {
    const modId = `mod-${errorId}`;
    const modification = this.modifications.get(modId);
    
    if (!modification) return false;
    
    modification.applied = false;
    return true;
  }

  getAppliedModifications(): TextModification[] {
    return Array.from(this.modifications.values()).filter(mod => mod.applied);
  }

  detectConflicts(): ModificationConflict[] {
    const conflicts: ModificationConflict[] = [];
    const appliedMods = this.getAppliedModifications();

    for (let i = 0; i < appliedMods.length; i++) {
      for (let j = i + 1; j < appliedMods.length; j++) {
        const mod1 = appliedMods[i];
        const mod2 = appliedMods[j];

        // Check for line overlap
        if (this.hasLineOverlap(mod1, mod2)) {
          conflicts.push({
            modification1: mod1,
            modification2: mod2,
            reason: '修改位置重叠'
          });
        }
      }
    }

    return conflicts;
  }

  private hasLineOverlap(mod1: TextModification, mod2: TextModification): boolean {
    return (
      (mod1.startLine <= mod2.endLine && mod1.endLine >= mod2.startLine) ||
      (mod2.startLine <= mod1.endLine && mod2.endLine >= mod1.startLine)
    );
  }

  applyModificationsToScript(acceptedErrorIds: string[]): string {
    // Create a copy of the original lines
    let modifiedLines = [...this.scriptLines];
    
    // Get all modifications for accepted errors
    const modificationsToApply = acceptedErrorIds
      .map(errorId => this.modifications.get(`mod-${errorId}`))
      .filter((mod): mod is TextModification => mod !== undefined)
      .sort((a, b) => b.startLine - a.startLine); // Sort in reverse order to maintain line numbers

    // Apply modifications
    for (const mod of modificationsToApply) {
      if (mod.startLine >= 0 && mod.startLine < modifiedLines.length) {
        const line = modifiedLines[mod.startLine];
        
        if (mod.startChar !== undefined && mod.endChar !== undefined) {
          // Replace specific part of the line
          modifiedLines[mod.startLine] = 
            line.substring(0, mod.startChar) +
            mod.modifiedText +
            line.substring(mod.endChar);
        } else if (line.includes(mod.originalText)) {
          // Replace the occurrence of original text
          modifiedLines[mod.startLine] = line.replace(mod.originalText, mod.modifiedText);
        } else {
          // Replace the entire line
          modifiedLines[mod.startLine] = mod.modifiedText;
        }
      }
    }

    return modifiedLines.join('\n');
  }

  getModificationCount(): number {
    return this.modifications.size;
  }

  getAppliedCount(): number {
    return this.getAppliedModifications().length;
  }

  clearAll() {
    this.modifications.clear();
  }
}
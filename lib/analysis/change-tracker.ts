import { 
  ChangeEvent, 
  ChangeHistory, 
  ChangeType, 
  ScriptLocation 
} from '@/types/change-tracking';
import { Script } from '@/types/script';
import { v4 as uuidv4 } from 'uuid';

export class ChangeTracker {
  private history: Map<string, ChangeHistory> = new Map();
  private currentScriptVersion: Map<string, Script> = new Map();
  private changeListeners: ((event: ChangeEvent) => void)[] = [];
  private maxHistorySize = 100; // Maximum number of script histories to keep
  private maxEventsPerScript = 1000; // Maximum events per script history

  constructor() {
    this.history = new Map();
    this.currentScriptVersion = new Map();
  }

  public trackChange(
    scriptId: string,
    oldScript: Script | null,
    newScript: Script,
    userId?: string
  ): ChangeEvent[] {
    const events: ChangeEvent[] = [];
    const timestamp = new Date();

    if (!oldScript) {
      const event: ChangeEvent = {
        id: uuidv4(),
        timestamp,
        type: 'structure',
        location: {
          path: ['script', scriptId]
        },
        oldValue: null,
        newValue: newScript,
        affectedElements: [scriptId],
        userId,
        description: 'Initial script creation'
      };
      events.push(event);
      this.recordEvent(scriptId, event);
      return events;
    }

    const changes = this.detectChanges(oldScript, newScript);
    
    for (const change of changes) {
      const event: ChangeEvent = {
        id: uuidv4(),
        timestamp,
        type: change.type,
        location: change.location,
        oldValue: change.oldValue,
        newValue: change.newValue,
        affectedElements: this.identifyAffectedElements(change, newScript),
        userId,
        description: change.description
      };
      
      events.push(event);
      this.recordEvent(scriptId, event);
      this.notifyListeners(event);
    }

    this.currentScriptVersion.set(scriptId, newScript);
    return events;
  }

  private detectChanges(oldScript: Script, newScript: Script): Array<{
    type: ChangeType;
    location: ScriptLocation;
    oldValue: any;
    newValue: any;
    description: string;
  }> {
    const changes: Array<{
      type: ChangeType;
      location: ScriptLocation;
      oldValue: any;
      newValue: any;
      description: string;
    }> = [];

    if (oldScript.scenes.length !== newScript.scenes.length) {
      changes.push({
        type: 'structure',
        location: { path: ['scenes'] },
        oldValue: oldScript.scenes.length,
        newValue: newScript.scenes.length,
        description: `Scene count changed from ${oldScript.scenes.length} to ${newScript.scenes.length}`
      });
    }

    for (let i = 0; i < Math.min(oldScript.scenes.length, newScript.scenes.length); i++) {
      const oldScene = oldScript.scenes[i];
      const newScene = newScript.scenes[i];

      if (oldScene.id !== newScene.id) {
        changes.push({
          type: 'structure',
          location: { 
            sceneId: oldScene.id,
            path: ['scenes', i.toString()] 
          },
          oldValue: oldScene.id,
          newValue: newScene.id,
          description: `Scene ID changed at position ${i}`
        });
        continue;
      }

      if (oldScene.title !== newScene.title) {
        changes.push({
          type: 'content',
          location: { 
            sceneId: oldScene.id,
            path: ['scenes', i.toString(), 'title'] 
          },
          oldValue: oldScene.title,
          newValue: newScene.title,
          description: `Scene title changed in scene ${oldScene.id}`
        });
      }

      if (oldScene.description !== newScene.description) {
        changes.push({
          type: 'content',
          location: { 
            sceneId: oldScene.id,
            path: ['scenes', i.toString(), 'description'] 
          },
          oldValue: oldScene.description,
          newValue: newScene.description,
          description: `Scene description changed in scene ${oldScene.id}`
        });
      }

      const dialogueChanges = this.detectDialogueChanges(
        oldScene.dialogues || [],
        newScene.dialogues || [],
        oldScene.id
      );
      changes.push(...dialogueChanges);
    }

    const characterChanges = this.detectCharacterChanges(
      oldScript.characters || [],
      newScript.characters || []
    );
    changes.push(...characterChanges);

    return changes;
  }

  private detectDialogueChanges(
    oldDialogues: any[],
    newDialogues: any[],
    sceneId: string
  ): Array<{
    type: ChangeType;
    location: ScriptLocation;
    oldValue: any;
    newValue: any;
    description: string;
  }> {
    const changes: Array<{
      type: ChangeType;
      location: ScriptLocation;
      oldValue: any;
      newValue: any;
      description: string;
    }> = [];

    const maxLength = Math.max(oldDialogues.length, newDialogues.length);
    
    for (let i = 0; i < maxLength; i++) {
      const oldDialogue = oldDialogues[i];
      const newDialogue = newDialogues[i];

      if (!oldDialogue && newDialogue) {
        changes.push({
          type: 'structure',
          location: {
            sceneId,
            dialogueId: newDialogue.id,
            path: ['scenes', sceneId, 'dialogues', i.toString()]
          },
          oldValue: null,
          newValue: newDialogue,
          description: `New dialogue added in scene ${sceneId}`
        });
      } else if (oldDialogue && !newDialogue) {
        changes.push({
          type: 'structure',
          location: {
            sceneId,
            dialogueId: oldDialogue.id,
            path: ['scenes', sceneId, 'dialogues', i.toString()]
          },
          oldValue: oldDialogue,
          newValue: null,
          description: `Dialogue removed from scene ${sceneId}`
        });
      } else if (oldDialogue && newDialogue) {
        if (oldDialogue.character !== newDialogue.character) {
          changes.push({
            type: 'relationship',
            location: {
              sceneId,
              dialogueId: oldDialogue.id,
              characterId: newDialogue.character,
              path: ['scenes', sceneId, 'dialogues', i.toString(), 'character']
            },
            oldValue: oldDialogue.character,
            newValue: newDialogue.character,
            description: `Dialogue character changed in scene ${sceneId}`
          });
        }

        if (oldDialogue.text !== newDialogue.text) {
          changes.push({
            type: 'content',
            location: {
              sceneId,
              dialogueId: oldDialogue.id,
              path: ['scenes', sceneId, 'dialogues', i.toString(), 'text']
            },
            oldValue: oldDialogue.text,
            newValue: newDialogue.text,
            description: `Dialogue text changed in scene ${sceneId}`
          });
        }
      }
    }

    return changes;
  }

  private detectCharacterChanges(
    oldCharacters: any[],
    newCharacters: any[]
  ): Array<{
    type: ChangeType;
    location: ScriptLocation;
    oldValue: any;
    newValue: any;
    description: string;
  }> {
    const changes: Array<{
      type: ChangeType;
      location: ScriptLocation;
      oldValue: any;
      newValue: any;
      description: string;
    }> = [];

    const oldCharMap = new Map(oldCharacters.map(c => [c.id, c]));
    const newCharMap = new Map(newCharacters.map(c => [c.id, c]));

    for (const [id, oldChar] of oldCharMap) {
      const newChar = newCharMap.get(id);
      if (!newChar) {
        changes.push({
          type: 'structure',
          location: {
            characterId: id,
            path: ['characters', id]
          },
          oldValue: oldChar,
          newValue: null,
          description: `Character ${oldChar.name} removed`
        });
      } else {
        if (oldChar.name !== newChar.name) {
          changes.push({
            type: 'content',
            location: {
              characterId: id,
              path: ['characters', id, 'name']
            },
            oldValue: oldChar.name,
            newValue: newChar.name,
            description: `Character name changed from ${oldChar.name} to ${newChar.name}`
          });
        }

        if (oldChar.role !== newChar.role) {
          changes.push({
            type: 'content',
            location: {
              characterId: id,
              path: ['characters', id, 'role']
            },
            oldValue: oldChar.role,
            newValue: newChar.role,
            description: `Character role changed for ${oldChar.name}`
          });
        }

        if (JSON.stringify(oldChar.relationships) !== JSON.stringify(newChar.relationships)) {
          changes.push({
            type: 'relationship',
            location: {
              characterId: id,
              path: ['characters', id, 'relationships']
            },
            oldValue: oldChar.relationships,
            newValue: newChar.relationships,
            description: `Character relationships changed for ${oldChar.name}`
          });
        }
      }
    }

    for (const [id, newChar] of newCharMap) {
      if (!oldCharMap.has(id)) {
        changes.push({
          type: 'structure',
          location: {
            characterId: id,
            path: ['characters', id]
          },
          oldValue: null,
          newValue: newChar,
          description: `New character ${newChar.name} added`
        });
      }
    }

    return changes;
  }

  private identifyAffectedElements(change: any, script: Script): string[] {
    const affected = new Set<string>();

    if (change.location.sceneId) {
      affected.add(change.location.sceneId);
    }

    if (change.location.characterId) {
      affected.add(change.location.characterId);
      
      for (const scene of script.scenes) {
        if (scene.dialogues?.some(d => d.character === change.location.characterId)) {
          affected.add(scene.id);
        }
      }
    }

    if (change.type === 'structure' && change.location.path[0] === 'scenes') {
      const sceneIndex = parseInt(change.location.path[1] || '0');
      for (let i = sceneIndex; i < script.scenes.length; i++) {
        affected.add(script.scenes[i].id);
      }
    }

    return Array.from(affected);
  }

  private recordEvent(scriptId: string, event: ChangeEvent): void {
    let history = this.history.get(scriptId);
    
    if (!history) {
      history = {
        events: [],
        currentVersion: uuidv4(),
        previousVersion: '',
        createdAt: new Date()
      };
      this.history.set(scriptId, history);
    }

    history.events.push(event);
    
    // Enforce memory limits - keep only recent events
    if (history.events.length > this.maxEventsPerScript) {
      history.events = history.events.slice(-this.maxEventsPerScript);
    }
    
    history.previousVersion = history.currentVersion;
    history.currentVersion = uuidv4();
    
    // Enforce global memory limits
    this.enforceMemoryLimits();
  }
  
  private enforceMemoryLimits(): void {
    // If we have too many scripts tracked, remove the oldest ones
    if (this.history.size > this.maxHistorySize) {
      const sortedEntries = Array.from(this.history.entries())
        .sort((a, b) => {
          const lastEventA = a[1].events[a[1].events.length - 1];
          const lastEventB = b[1].events[b[1].events.length - 1];
          return (lastEventA?.timestamp?.getTime() || 0) - (lastEventB?.timestamp?.getTime() || 0);
        });
      
      // Remove oldest entries
      const toRemove = sortedEntries.slice(0, this.history.size - this.maxHistorySize);
      for (const [scriptId] of toRemove) {
        this.history.delete(scriptId);
        this.currentScriptVersion.delete(scriptId);
      }
    }
  }

  public getHistory(scriptId: string): ChangeHistory | undefined {
    return this.history.get(scriptId);
  }

  public getRecentChanges(scriptId: string, limit: number = 10): ChangeEvent[] {
    const history = this.history.get(scriptId);
    if (!history) return [];
    
    return history.events
      .slice(-limit)
      .reverse();
  }

  public compareVersions(
    scriptId: string,
    oldVersion: Script,
    newVersion: Script
  ): ChangeEvent[] {
    return this.trackChange(scriptId, oldVersion, newVersion);
  }

  public addChangeListener(listener: (event: ChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  public removeChangeListener(listener: (event: ChangeEvent) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  private notifyListeners(event: ChangeEvent): void {
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    }
  }

  public clearHistory(scriptId?: string): void {
    if (scriptId) {
      this.history.delete(scriptId);
      this.currentScriptVersion.delete(scriptId);
    } else {
      this.history.clear();
      this.currentScriptVersion.clear();
    }
  }
}
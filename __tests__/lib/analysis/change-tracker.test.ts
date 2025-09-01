import { ChangeTracker } from '@/lib/analysis/change-tracker';
import { Script } from '@/types/script';
import { ChangeEvent } from '@/types/change-tracking';

describe('ChangeTracker', () => {
  let tracker: ChangeTracker;
  let oldScript: Script;
  let newScript: Script;

  beforeEach(() => {
    tracker = new ChangeTracker();
    
    oldScript = {
      id: 'script-1',
      title: 'Test Script',
      scenes: [
        {
          id: 'scene-1',
          title: 'Opening Scene',
          description: 'The beginning',
          dialogues: [
            {
              id: 'dialogue-1',
              character: 'char-1',
              text: 'Hello world'
            }
          ]
        }
      ],
      characters: [
        {
          id: 'char-1',
          name: 'Alice',
          role: 'protagonist'
        }
      ]
    };

    newScript = JSON.parse(JSON.stringify(oldScript));
  });

  describe('trackChange', () => {
    it('should detect initial script creation', () => {
      const events = tracker.trackChange('script-1', null, oldScript, 'user-1');
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('structure');
      expect(events[0].description).toBe('Initial script creation');
      expect(events[0].oldValue).toBeNull();
      expect(events[0].newValue).toEqual(oldScript);
    });

    it('should detect scene title changes', () => {
      newScript.scenes[0].title = 'Modified Opening';
      
      const events = tracker.trackChange('script-1', oldScript, newScript, 'user-1');
      
      expect(events.length).toBeGreaterThan(0);
      const titleChange = events.find(e => e.description?.includes('Scene title changed'));
      expect(titleChange).toBeDefined();
      expect(titleChange?.type).toBe('content');
      expect(titleChange?.oldValue).toBe('Opening Scene');
      expect(titleChange?.newValue).toBe('Modified Opening');
    });

    it('should detect dialogue text changes', () => {
      newScript.scenes[0].dialogues![0].text = 'Goodbye world';
      
      const events = tracker.trackChange('script-1', oldScript, newScript);
      
      const dialogueChange = events.find(e => e.description?.includes('Dialogue text changed'));
      expect(dialogueChange).toBeDefined();
      expect(dialogueChange?.type).toBe('content');
      expect(dialogueChange?.oldValue).toBe('Hello world');
      expect(dialogueChange?.newValue).toBe('Goodbye world');
    });

    it('should detect character changes', () => {
      newScript.characters![0].name = 'Bob';
      
      const events = tracker.trackChange('script-1', oldScript, newScript);
      
      const charChange = events.find(e => e.description?.includes('Character name changed'));
      expect(charChange).toBeDefined();
      expect(charChange?.type).toBe('content');
      expect(charChange?.oldValue).toBe('Alice');
      expect(charChange?.newValue).toBe('Bob');
    });

    it('should detect structural changes when scenes are added', () => {
      newScript.scenes.push({
        id: 'scene-2',
        title: 'New Scene',
        description: 'A new addition'
      });
      
      const events = tracker.trackChange('script-1', oldScript, newScript);
      
      const structureChange = events.find(e => e.type === 'structure');
      expect(structureChange).toBeDefined();
      expect(structureChange?.description).toContain('Scene count changed');
    });

    it('should identify affected elements correctly', () => {
      newScript.characters![0].name = 'Bob';
      
      const events = tracker.trackChange('script-1', oldScript, newScript);
      
      const charChange = events.find(e => e.description?.includes('Character name changed'));
      expect(charChange?.affectedElements).toContain('char-1');
    });
  });

  describe('getHistory', () => {
    it('should store and retrieve change history', () => {
      tracker.trackChange('script-1', null, oldScript);
      newScript.scenes[0].title = 'Modified';
      tracker.trackChange('script-1', oldScript, newScript);
      
      const history = tracker.getHistory('script-1');
      
      expect(history).toBeDefined();
      expect(history?.events.length).toBeGreaterThan(0);
      expect(history?.currentVersion).toBeDefined();
      expect(history?.previousVersion).toBeDefined();
    });
  });

  describe('getRecentChanges', () => {
    it('should return recent changes in reverse order', () => {
      tracker.trackChange('script-1', null, oldScript);
      
      for (let i = 0; i < 5; i++) {
        const modified = JSON.parse(JSON.stringify(newScript));
        modified.scenes[0].title = `Title ${i}`;
        tracker.trackChange('script-1', newScript, modified);
        newScript = modified;
      }
      
      const recent = tracker.getRecentChanges('script-1', 3);
      
      expect(recent).toHaveLength(3);
      expect(recent[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        recent[1].timestamp.getTime()
      );
    });
  });

  describe('change listeners', () => {
    it('should notify listeners of changes', () => {
      const listener = jest.fn();
      tracker.addChangeListener(listener);
      
      newScript.scenes[0].title = 'Modified';
      tracker.trackChange('script-1', oldScript, newScript);
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toMatchObject({
        type: expect.stringMatching(/content|structure|relationship/)
      });
    });

    it('should remove listeners correctly', () => {
      const listener = jest.fn();
      tracker.addChangeListener(listener);
      tracker.removeChangeListener(listener);
      
      tracker.trackChange('script-1', oldScript, newScript);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('compareVersions', () => {
    it('should compare two script versions', () => {
      const version1 = JSON.parse(JSON.stringify(oldScript));
      const version2 = JSON.parse(JSON.stringify(oldScript));
      version2.scenes[0].title = 'Modified Scene Title';
      
      const events = tracker.compareVersions('script-1', version1, version2);
      
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear history for specific script', () => {
      tracker.trackChange('script-1', null, oldScript);
      tracker.trackChange('script-2', null, oldScript);
      
      tracker.clearHistory('script-1');
      
      expect(tracker.getHistory('script-1')).toBeUndefined();
      expect(tracker.getHistory('script-2')).toBeDefined();
    });

    it('should clear all history when no scriptId provided', () => {
      tracker.trackChange('script-1', null, oldScript);
      tracker.trackChange('script-2', null, oldScript);
      
      tracker.clearHistory();
      
      expect(tracker.getHistory('script-1')).toBeUndefined();
      expect(tracker.getHistory('script-2')).toBeUndefined();
    });
  });
});
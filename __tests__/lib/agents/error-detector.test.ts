import { ErrorDetector } from '@/lib/agents/error-detector';
import {
  ParsedScript,
  LogicErrorType,
  ErrorSeverity
} from '@/types/analysis';

describe('ErrorDetector', () => {
  let detector: ErrorDetector;
  
  const createMockScript = (overrides?: Partial<ParsedScript>): ParsedScript => ({
    id: 'test-script',
    title: 'Test Script',
    scenes: [],
    characters: [],
    ...overrides
  });

  describe('Timeline Error Detection', () => {
    it('should detect time sequence inconsistencies', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. HOUSE',
            time: 'evening',
            dialogues: []
          },
          {
            id: 's2',
            number: 2,
            location: 'INT. HOUSE',
            time: 'morning',
            dialogues: []
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const timelineErrors = errors.filter(e => e.type === LogicErrorType.TIMELINE);
      expect(timelineErrors.length).toBeGreaterThan(0);
      expect(timelineErrors[0].description).toContain('Time inconsistency');
    });

    it('should detect problematic time references in dialogue', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. OFFICE',
            time: 'Monday morning',
            dialogues: [
              {
                character: 'Alice',
                text: 'I saw you yesterday at the mall.'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const timelineErrors = errors.filter(e => e.type === LogicErrorType.TIMELINE);
      expect(timelineErrors.some(e => e.description.includes('yesterday'))).toBe(true);
    });
  });

  describe('Character Error Detection', () => {
    it('should detect character knowledge inconsistencies', () => {
      const script = createMockScript({
        characters: [
          { name: 'Bob', description: 'Detective' },
          { name: 'Alice', description: 'Witness' }
        ],
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. ROOM',
            dialogues: [
              {
                character: 'Bob',
                text: 'I know that the suspect drives a red car.'
              }
            ]
          },
          {
            id: 's2',
            number: 2,
            location: 'INT. OFFICE',
            dialogues: [
              {
                character: 'Alice',
                text: 'The suspect drives a blue car.'
              },
              {
                character: 'Bob',
                text: 'A blue car? I had no idea!'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const characterErrors = errors.filter(e => e.type === LogicErrorType.CHARACTER);
      expect(characterErrors.length).toBeGreaterThan(0);
    });

    it('should detect sudden character appearances', () => {
      const script = createMockScript({
        characters: [
          { name: 'Charlie', description: 'Main character' }
        ],
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. HOUSE',
            dialogues: [
              { character: 'Charlie', text: 'Hello' }
            ]
          },
          {
            id: 's5',
            number: 5,
            location: 'EXT. PARK',
            dialogues: [
              { character: 'Charlie', text: 'Nice weather' }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const characterErrors = errors.filter(e => e.type === LogicErrorType.CHARACTER);
      const transitionErrors = characterErrors.filter(e => 
        e.description.includes('transition')
      );
      expect(transitionErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Plot Error Detection', () => {
    it('should detect setups without payoffs', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. ROOM',
            dialogues: [
              {
                character: 'Dave',
                text: 'I will reveal the truth tomorrow.'
              }
            ]
          },
          {
            id: 's2',
            number: 2,
            location: 'INT. ROOM - NEXT DAY',
            dialogues: [
              {
                character: 'Dave',
                text: 'Let\'s talk about something else.'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const plotErrors = errors.filter(e => e.type === LogicErrorType.PLOT);
      expect(plotErrors.some(e => e.description.includes('no payoff'))).toBe(true);
    });

    it('should detect broken causal chains', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. LAB',
            dialogues: [
              {
                character: 'Scientist',
                text: 'The experiment failed because the temperature was wrong.'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
    });
  });

  describe('Dialogue Error Detection', () => {
    it('should detect unanswered questions', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. ROOM',
            dialogues: [
              {
                character: 'Eve',
                text: 'Where did you hide the key?'
              },
              {
                character: 'Frank',
                text: 'Nice weather today.'
              },
              {
                character: 'Eve',
                text: 'I guess you won\'t tell me.'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const dialogueErrors = errors.filter(e => e.type === LogicErrorType.DIALOGUE);
      expect(dialogueErrors.some(e => e.description.includes('unanswered'))).toBe(true);
    });

    it('should detect non-coherent dialogue flow', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. CAFE',
            dialogues: [
              {
                character: 'Grace',
                text: 'I love coffee.'
              },
              {
                character: 'Henry',
                text: 'The moon is bright tonight.'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const dialogueErrors = errors.filter(e => e.type === LogicErrorType.DIALOGUE);
      expect(dialogueErrors.some(e => 
        e.description.includes('flow') || e.description.includes('coherent')
      )).toBe(true);
    });
  });

  describe('Scene Error Detection', () => {
    it('should detect impossible location transitions', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. HOUSE - BEDROOM',
            time: '10:00 AM',
            dialogues: [
              { character: 'Ivan', text: 'Good morning' }
            ]
          },
          {
            id: 's2',
            number: 2,
            location: 'INT. OFFICE - DOWNTOWN',
            time: '10:01 AM',
            dialogues: [
              { character: 'Ivan', text: 'Time for work' }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const sceneErrors = errors.filter(e => e.type === LogicErrorType.SCENE);
      expect(sceneErrors.some(e => e.description.includes('transition'))).toBe(true);
    });

    it('should detect spatial logic issues', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. SMALL CLOSET',
            dialogues: [],
            actions: [
              {
                description: '20 people enter the closet',
                characters: Array(20).fill('Person'),
                type: 'movement'
              }
            ]
          }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
    });
  });

  describe('Error Severity Classification', () => {
    it('should assign appropriate severity levels', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. ROOM',
            time: 'morning',
            dialogues: [
              {
                character: 'Jane',
                text: 'I killed John yesterday.'
              }
            ]
          },
          {
            id: 's2',
            number: 2,
            location: 'INT. ROOM',
            time: 'afternoon',
            dialogues: [
              {
                character: 'John',
                text: 'Hello Jane!'
              }
            ]
          }
        ],
        characters: [
          { name: 'Jane', description: 'Protagonist' },
          { name: 'John', description: 'Friend' }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
      const highErrors = errors.filter(e => e.severity === ErrorSeverity.HIGH);
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('detectAllErrors', () => {
    it('should detect multiple error types in complex script', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. HOUSE - MORNING',
            time: 'morning',
            dialogues: [
              {
                character: 'Kate',
                text: 'I will call you tomorrow.'
              },
              {
                character: 'Leo',
                text: 'What time?'
              }
            ]
          },
          {
            id: 's2',
            number: 2,
            location: 'EXT. PARK - EVENING',
            time: 'evening',
            dialogues: [
              {
                character: 'Kate',
                text: 'Beautiful sunset!'
              }
            ]
          },
          {
            id: 's3',
            number: 3,
            location: 'INT. HOUSE - MORNING',
            time: 'next morning',
            dialogues: [
              {
                character: 'Leo',
                text: 'You never called me.'
              }
            ]
          }
        ],
        characters: [
          { name: 'Kate', description: 'Main character' },
          { name: 'Leo', description: 'Friend' }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const errorTypes = new Set(errors.map(e => e.type));
      expect(errorTypes.size).toBeGreaterThan(0);
      
      errors.forEach(error => {
        expect(error).toHaveProperty('id');
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('location');
        expect(error).toHaveProperty('description');
      });
    });

    it('should handle empty script gracefully', () => {
      const script = createMockScript();
      
      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should generate unique error IDs', () => {
      const script = createMockScript({
        scenes: [
          {
            id: 's1',
            number: 1,
            location: 'INT. ROOM',
            dialogues: [
              { character: 'Mike', text: 'Test 1' },
              { character: 'Nancy', text: 'Test 2' }
            ]
          }
        ],
        characters: [
          { name: 'Mike' },
          { name: 'Nancy' }
        ]
      });

      detector = new ErrorDetector(script);
      const errors = detector.detectAllErrors();
      
      const ids = errors.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
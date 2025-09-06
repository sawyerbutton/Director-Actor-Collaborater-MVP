import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildOutputFormatPrompt,
  buildChunkedPrompt,
  buildValidationPrompt,
  PromptBuilder
} from '@/lib/agents/prompts/consistency-prompts';
import { LogicErrorType } from '@/types/analysis';

describe('Consistency Prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('should contain key instructions', () => {
      expect(SYSTEM_PROMPT).toContain('script consistency analyzer');
      expect(SYSTEM_PROMPT).toContain('logical errors');
      expect(SYSTEM_PROMPT).toContain('JSON format');
      expect(SYSTEM_PROMPT).toContain('Severity Guidelines');
    });
  });

  describe('buildUserPrompt', () => {
    const testScript = 'Scene 1: Test content';

    it('should build a complete user prompt', () => {
      const prompt = buildUserPrompt(testScript);
      
      expect(prompt).toContain('Analyze the following script');
      expect(prompt).toContain('Script Content:');
      expect(prompt).toContain(testScript);
      expect(prompt).toContain('Analysis Requirements:');
      expect(prompt).toContain('Output Format:');
    });

    it('should include selected check types', () => {
      const checkTypes = ['timeline', 'character'];
      const prompt = buildUserPrompt(testScript, checkTypes);
      
      expect(prompt).toContain('Timeline Consistency');
      expect(prompt).toContain('Character Consistency');
      expect(prompt).not.toContain('Scene Transitions');
    });

    it('should respect maxErrors parameter', () => {
      const prompt = buildUserPrompt(testScript, undefined, 25);
      expect(prompt).toContain('Return up to 25 most significant errors');
    });
  });

  describe('buildOutputFormatPrompt', () => {
    it('should provide JSON structure example', () => {
      const prompt = buildOutputFormatPrompt();
      
      expect(prompt).toContain('valid JSON array');
      expect(prompt).toContain('"type"');
      expect(prompt).toContain('"severity"');
      expect(prompt).toContain('"location"');
      expect(prompt).toContain('"description"');
      expect(prompt).toContain('Example:');
    });
  });

  describe('buildChunkedPrompt', () => {
    it('should format chunk information', () => {
      const chunk = 'Scene content';
      const prompt = buildChunkedPrompt(chunk, 2, 5);
      
      expect(prompt).toContain('Analyzing chunk 3 of 5');
      expect(prompt).toContain('Current Chunk:');
      expect(prompt).toContain(chunk);
    });

    it('should include previous context when provided', () => {
      const chunk = 'Scene 2 content';
      const context = 'Scene 1 context';
      const prompt = buildChunkedPrompt(chunk, 1, 3, context);
      
      expect(prompt).toContain('Previous Context:');
      expect(prompt).toContain(context);
    });

    it('should handle missing previous context', () => {
      const chunk = 'Scene 1 content';
      const prompt = buildChunkedPrompt(chunk, 0, 3);
      
      expect(prompt).not.toContain('Previous Context:');
    });
  });

  describe('buildValidationPrompt', () => {
    it('should format validation request', () => {
      const errors = [
        {
          type: 'timeline',
          severity: 'high',
          description: 'Test error'
        }
      ];
      
      const prompt = buildValidationPrompt(errors);
      
      expect(prompt).toContain('Validate and refine');
      expect(prompt).toContain('Test error');
      expect(prompt).toContain('genuine inconsistency');
      expect(prompt).toContain('false positives');
    });
  });

  describe('PromptBuilder', () => {
    const testScript = 'Test script content';
    let builder: PromptBuilder;

    beforeEach(() => {
      builder = new PromptBuilder(testScript);
    });

    describe('buildFullPrompt', () => {
      it('should return system and user prompts', () => {
        const result = builder.buildFullPrompt();
        
        expect(result.system).toBe(SYSTEM_PROMPT);
        expect(result.user).toContain(testScript);
        expect(result.user).toContain('valid JSON array');
      });

      it('should include custom check types', () => {
        builder = new PromptBuilder(
          testScript,
          ['timeline']
        );
        const result = builder.buildFullPrompt();
        
        expect(result.user).toContain('Timeline Consistency');
        expect(result.user).not.toContain('Character Consistency');
      });
    });

    describe('buildPromptForRule', () => {
      it('should create rule-specific prompt', () => {
        const rule = {
          type: 'character',
          name: 'Character Consistency',
          description: 'Test description',
          checkPrompt: 'Check for character issues',
          indicators: ['knows', 'remembers']
        };
        
        const result = builder.buildPromptForRule(rule);
        
        expect(result.system).toBe(SYSTEM_PROMPT);
        expect(result.user).toContain('Focus exclusively on Character Consistency');
        expect(result.user).toContain('Check for character issues');
        expect(result.user).toContain('knows, remembers');
      });
    });

    describe('buildExamplePrompt', () => {
      it('should provide a complete example', () => {
        const example = PromptBuilder.buildExamplePrompt();
        
        expect(example.input).toContain('Scene 1');
        expect(example.input).toContain('John');
        expect(example.output).toBeTruthy();
        
        const parsed = JSON.parse(example.output);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0]).toHaveProperty('type');
        expect(parsed[0]).toHaveProperty('severity');
        expect(parsed[0]).toHaveProperty('description');
      });
    });
  });

  describe('Error Detection Rules', () => {
    it('should have all required error types', () => {
      const { ERROR_DETECTION_RULES } = require('@/lib/agents/types');
      
      const types = ERROR_DETECTION_RULES.map((r: any) => r.type);
      expect(types).toContain('timeline');
      expect(types).toContain('character');
      expect(types).toContain('plot');
      expect(types).toContain('dialogue');
      expect(types).toContain('scene');
    });

    it('should have complete rule definitions', () => {
      const { ERROR_DETECTION_RULES } = require('@/lib/agents/types');
      
      ERROR_DETECTION_RULES.forEach((rule: any) => {
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('checkPrompt');
        expect(rule).toHaveProperty('indicators');
        expect(Array.isArray(rule.indicators)).toBe(true);
        expect(rule.indicators.length).toBeGreaterThan(0);
      });
    });
  });
});
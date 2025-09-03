import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Validates and sanitizes AI-generated output to prevent injection attacks
 */
export class AIOutputValidator {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_ARRAY_LENGTH = 100;

  /**
   * Schema for revision suggestions from AI
   */
  private static suggestionSchema = z.object({
    modification: z.string().max(AIOutputValidator.MAX_STRING_LENGTH),
    location: z.union([
      z.object({
        sceneId: z.string().optional(),
        lineNumber: z.number().optional(),
        characterName: z.string().optional()
      }),
      z.record(z.unknown())
    ]),
    rationale: z.string().max(AIOutputValidator.MAX_STRING_LENGTH),
    impact: z.string().max(AIOutputValidator.MAX_STRING_LENGTH).optional()
  });

  private static suggestionsArraySchema = z.array(AIOutputValidator.suggestionSchema).max(AIOutputValidator.MAX_ARRAY_LENGTH);

  /**
   * Sanitizes a string to prevent XSS attacks
   */
  static sanitizeString(input: string): string {
    // Remove any HTML/script tags
    const cleaned = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Escape special characters for safe interpolation
    return cleaned
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validates AI-generated suggestions array
   */
  static validateSuggestions(input: unknown): Array<{
    modification: string;
    location: any;
    rationale: string;
    impact?: string;
  }> | null {
    try {
      // First try to parse if it's a string
      if (typeof input === 'string') {
        const parsed = this.safeJSONParse(input);
        if (!parsed) return null;
        input = parsed;
      }

      // Validate against schema
      const result = AIOutputValidator.suggestionsArraySchema.safeParse(input);
      
      if (!result.success) {
        console.warn('AI output validation failed:', result.error.errors);
        return null;
      }

      // Sanitize all string fields
      return result.data.map(item => ({
        ...item,
        modification: this.sanitizeString(item.modification),
        rationale: this.sanitizeString(item.rationale),
        impact: item.impact ? this.sanitizeString(item.impact) : undefined
      }));
    } catch (error) {
      console.error('Failed to validate AI suggestions:', error);
      return null;
    }
  }

  /**
   * Safely parses JSON with error handling
   */
  static safeJSONParse(input: string): unknown | null {
    try {
      // Remove potential markdown code blocks
      const cleaned = input.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to extract JSON array or object
      const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn('Failed to parse JSON from AI response');
      return null;
    }
  }

  /**
   * Validates prompt parameters to prevent injection
   */
  static validatePromptParams(params: Record<string, unknown>): Record<string, string> {
    const validated: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        validated[key] = this.sanitizeString(value.substring(0, this.MAX_STRING_LENGTH));
      } else if (value != null) {
        validated[key] = this.sanitizeString(String(value).substring(0, 1000));
      } else {
        validated[key] = '';
      }
    }
    
    return validated;
  }

  /**
   * Checks if AI response contains potential security risks
   */
  static containsSecurityRisk(content: string): boolean {
    const riskyPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /eval\s*\(/i,
      /new\s+Function/i,
      /document\./i,
      /window\./i,
      /\.innerHTML/i,
      /\.outerHTML/i,
      /import\s*\(/i,
      /require\s*\(/i
    ];

    return riskyPatterns.some(pattern => pattern.test(content));
  }
}
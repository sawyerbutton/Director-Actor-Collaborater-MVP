/**
 * Script Converter Service
 *
 * Converts Markdown screenplay to structured JSON using DeepSeek API
 */

import { DeepSeekClient, DeepSeekChatRequest } from '@/lib/api/deepseek/client';
import { SYSTEM_PROMPT, buildConversionPrompt } from './script-converter-prompts';

/**
 * JSON structure for converted script
 */
export interface ScriptMetadata {
  title: string;
  episodeNumber?: number;
  totalScenes: number;
  characters: string[];
  locations: string[];
  timeReferences: string[];
}

export interface ScriptDialogue {
  character: string;
  text: string;
  parenthetical?: string;
}

export interface ScriptScene {
  sceneNumber: number;
  heading: string;
  location: string;
  timeOfDay: string;
  interior: boolean;
  timeReference?: string;
  characters: string[];
  description: string;
  dialogues: ScriptDialogue[];
  actions: string[];
}

export interface ConvertedScript {
  metadata: ScriptMetadata;
  scenes: ScriptScene[];
}

/**
 * Conversion result
 */
export interface ConversionResult {
  success: boolean;
  jsonContent?: ConvertedScript;
  error?: string;
  rawResponse?: string;
}

/**
 * Script Converter using DeepSeek API
 */
export class ScriptConverter {
  private client: DeepSeekClient;

  constructor(apiKey: string) {
    this.client = new DeepSeekClient({
      apiKey: apiKey,
      apiEndpoint: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
    });
  }

  /**
   * Select appropriate model based on content size
   */
  private selectModel(contentLength: number): { model: string; maxTokens: number } {
    // For large files (>= 10000 chars), use deepseek-reasoner with 32K tokens
    if (contentLength >= 10000) {
      return {
        model: 'deepseek-reasoner',
        maxTokens: 32000
      };
    }
    // For medium files (>= 5000 chars), use deepseek-chat with max 8K tokens
    else if (contentLength >= 5000) {
      return {
        model: 'deepseek-chat',
        maxTokens: 8000
      };
    }
    // For small files, use deepseek-chat with 4K tokens
    else {
      return {
        model: 'deepseek-chat',
        maxTokens: 4000
      };
    }
  }

  /**
   * Convert Markdown script to JSON
   */
  async convert(markdownContent: string): Promise<ConversionResult> {
    try {
      console.log('[ScriptConverter] Starting conversion...');
      console.log('[ScriptConverter] Input length:', markdownContent.length, 'characters');

      // Validate input
      if (!markdownContent || markdownContent.trim().length === 0) {
        return {
          success: false,
          error: 'Empty markdown content'
        };
      }

      // Select model based on content size
      const { model, maxTokens } = this.selectModel(markdownContent.length);
      console.log(`[ScriptConverter] Selected model: ${model}, max_tokens: ${maxTokens}`);

      // Build prompt
      const userPrompt = buildConversionPrompt(markdownContent);

      // Call DeepSeek API
      const request: DeepSeekChatRequest = {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,  // Low temperature for consistent extraction
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }  // Force JSON output
      };

      console.log('[ScriptConverter] Calling DeepSeek API...');
      const response = await this.client.chat(request);

      if (!response.choices || response.choices.length === 0) {
        return {
          success: false,
          error: 'No response from DeepSeek API'
        };
      }

      const rawContent = response.choices[0].message.content;
      console.log('[ScriptConverter] Received response length:', rawContent.length);

      // Parse JSON
      let jsonContent: ConvertedScript;
      try {
        jsonContent = JSON.parse(rawContent);
      } catch (parseError) {
        console.error('[ScriptConverter] JSON parse error:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response as JSON',
          rawResponse: rawContent
        };
      }

      // Validate structure
      const validation = this.validateStructure(jsonContent);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid JSON structure: ${validation.errors.join(', ')}`,
          jsonContent  // Return partial result for debugging
        };
      }

      console.log('[ScriptConverter] Conversion successful:');
      console.log('  - Scenes:', jsonContent.scenes.length);
      console.log('  - Characters:', jsonContent.metadata.characters.length);
      console.log('  - Locations:', jsonContent.metadata.locations.length);
      console.log('  - Time references:', jsonContent.metadata.timeReferences.length);

      return {
        success: true,
        jsonContent
      };

    } catch (error) {
      console.error('[ScriptConverter] Conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error'
      };
    }
  }

  /**
   * Validate converted JSON structure
   */
  private validateStructure(json: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check top-level fields
    if (!json.metadata) {
      errors.push('Missing metadata field');
    }
    if (!json.scenes || !Array.isArray(json.scenes)) {
      errors.push('Missing or invalid scenes array');
    }

    // Check metadata
    if (json.metadata) {
      if (!json.metadata.title) {
        errors.push('Missing metadata.title');
      }
      if (typeof json.metadata.totalScenes !== 'number') {
        errors.push('Invalid metadata.totalScenes');
      }
      if (!Array.isArray(json.metadata.characters)) {
        errors.push('Invalid metadata.characters');
      }
      if (!Array.isArray(json.metadata.locations)) {
        errors.push('Invalid metadata.locations');
      }
      if (!Array.isArray(json.metadata.timeReferences)) {
        errors.push('Invalid metadata.timeReferences');
      }
    }

    // Check scenes
    if (json.scenes && Array.isArray(json.scenes)) {
      if (json.scenes.length === 0) {
        errors.push('Empty scenes array');
      }

      json.scenes.forEach((scene: any, index: number) => {
        if (typeof scene.sceneNumber !== 'number') {
          errors.push(`Scene ${index}: missing sceneNumber`);
        }
        if (!scene.heading) {
          errors.push(`Scene ${index}: missing heading`);
        }
        if (!scene.location) {
          errors.push(`Scene ${index}: missing location`);
        }
        if (!Array.isArray(scene.characters)) {
          errors.push(`Scene ${index}: invalid characters array`);
        }
        if (!Array.isArray(scene.dialogues)) {
          errors.push(`Scene ${index}: invalid dialogues array`);
        }
        if (!Array.isArray(scene.actions)) {
          errors.push(`Scene ${index}: invalid actions array`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Batch convert multiple scripts
   */
  async convertBatch(scripts: Array<{ id: string; content: string }>): Promise<Map<string, ConversionResult>> {
    const results = new Map<string, ConversionResult>();

    for (const script of scripts) {
      console.log(`[ScriptConverter] Converting script ${script.id}...`);
      const result = await this.convert(script.content);
      results.set(script.id, result);

      // Add delay to avoid rate limiting
      await this.delay(1000);
    }

    return results;
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function
 */
export function createScriptConverter(apiKey?: string): ScriptConverter {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY is required for script conversion');
  }
  return new ScriptConverter(key);
}

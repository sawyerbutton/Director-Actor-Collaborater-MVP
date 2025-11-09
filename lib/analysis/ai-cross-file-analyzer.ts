/**
 * AI-Powered Cross-File Analyzer
 *
 * Extends DefaultCrossFileAnalyzer with LLM-based semantic analysis
 */

import { DeepSeekClient, DeepSeekChatRequest } from '@/lib/api/deepseek/client';
import {
  CrossFileAnalyzer,
  CrossFileCheckConfig,
  CrossFileAnalysisResult,
  CrossFileFinding,
  ParsedScriptContent
} from './cross-file-analyzer';
import {
  CROSS_FILE_SYSTEM_PROMPT,
  buildTimelineCheckPrompt,
  buildCharacterCheckPrompt,
  buildPlotCheckPrompt,
  buildSettingCheckPrompt
} from './cross-file-ai-prompts';

/**
 * AI-powered cross-file analyzer using DeepSeek
 */
export class AICrossFileAnalyzer extends CrossFileAnalyzer {
  private client: DeepSeekClient;
  private useAI: boolean;

  constructor(config?: CrossFileCheckConfig) {
    super(config);

    // Get API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('[AICrossFileAnalyzer] DEEPSEEK_API_KEY not found, falling back to rule-based analysis');
      this.useAI = false;
      this.client = null as any;
    } else {
      this.useAI = config?.useAI !== false; // Default to true if API key exists
      this.client = new DeepSeekClient({
        apiKey: apiKey,
        apiEndpoint: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
      });
    }
  }

  /**
   * Override timeline check with AI-powered analysis
   */
  protected async checkTimeline(scripts: ParsedScriptContent[]): Promise<CrossFileFinding[]> {
    // Filter out scripts with null jsonContent
    const validScripts = scripts.filter(s => s.jsonContent !== null && s.jsonContent !== undefined);

    if (!this.useAI || validScripts.length < 2) {
      // Fallback to rule-based check
      return super.checkTimeline(validScripts);
    }

    try {
      console.log('[AICrossFileAnalyzer] Running AI timeline check for', validScripts.length, 'files (filtered from', scripts.length, 'total)');

      const prompt = buildTimelineCheckPrompt(validScripts.map(s => ({
        fileId: s.fileId,
        filename: s.filename,
        episodeNumber: s.episodeNumber,
        jsonContent: s.jsonContent
      })));

      const findings = await this.callAI(prompt, 'cross_file_timeline');

      console.log('[AICrossFileAnalyzer] AI timeline check found', findings.length, 'issues');
      return findings;

    } catch (error) {
      console.error('[AICrossFileAnalyzer] AI timeline check failed:', error);
      // Fallback to rule-based
      return super.checkTimeline(validScripts);
    }
  }

  /**
   * Override character check with AI-powered analysis
   */
  protected async checkCharacter(scripts: ParsedScriptContent[]): Promise<CrossFileFinding[]> {
    // Filter out scripts with null jsonContent
    const validScripts = scripts.filter(s => s.jsonContent !== null && s.jsonContent !== undefined);

    if (!this.useAI || validScripts.length < 2) {
      return super.checkCharacter(validScripts);
    }

    try {
      console.log('[AICrossFileAnalyzer] Running AI character check for', validScripts.length, 'files (filtered from', scripts.length, 'total)');

      const prompt = buildCharacterCheckPrompt(validScripts.map(s => ({
        fileId: s.fileId,
        filename: s.filename,
        episodeNumber: s.episodeNumber,
        jsonContent: s.jsonContent
      })));

      const findings = await this.callAI(prompt, 'cross_file_character');

      console.log('[AICrossFileAnalyzer] AI character check found', findings.length, 'issues');
      return findings;

    } catch (error) {
      console.error('[AICrossFileAnalyzer] AI character check failed:', error);
      return super.checkCharacter(validScripts);
    }
  }

  /**
   * Override plot check with AI-powered analysis
   */
  protected async checkPlot(scripts: ParsedScriptContent[]): Promise<CrossFileFinding[]> {
    // Filter out scripts with null jsonContent
    const validScripts = scripts.filter(s => s.jsonContent !== null && s.jsonContent !== undefined);

    if (!this.useAI || validScripts.length < 2) {
      return super.checkPlot(validScripts);
    }

    try {
      console.log('[AICrossFileAnalyzer] Running AI plot check for', validScripts.length, 'files (filtered from', scripts.length, 'total)');

      const prompt = buildPlotCheckPrompt(validScripts.map(s => ({
        fileId: s.fileId,
        filename: s.filename,
        episodeNumber: s.episodeNumber,
        jsonContent: s.jsonContent
      })));

      const findings = await this.callAI(prompt, 'cross_file_plot');

      console.log('[AICrossFileAnalyzer] AI plot check found', findings.length, 'issues');
      return findings;

    } catch (error) {
      console.error('[AICrossFileAnalyzer] AI plot check failed:', error);
      return super.checkPlot(validScripts);
    }
  }

  /**
   * Override setting check with AI-powered analysis
   */
  protected async checkSetting(scripts: ParsedScriptContent[]): Promise<CrossFileFinding[]> {
    // Filter out scripts with null jsonContent
    const validScripts = scripts.filter(s => s.jsonContent !== null && s.jsonContent !== undefined);

    if (!this.useAI || validScripts.length < 2) {
      return super.checkSetting(validScripts);
    }

    try {
      console.log('[AICrossFileAnalyzer] Running AI setting check for', validScripts.length, 'files (filtered from', scripts.length, 'total)');

      const prompt = buildSettingCheckPrompt(validScripts.map(s => ({
        fileId: s.fileId,
        filename: s.filename,
        episodeNumber: s.episodeNumber,
        jsonContent: s.jsonContent
      })));

      const findings = await this.callAI(prompt, 'cross_file_setting');

      console.log('[AICrossFileAnalyzer] AI setting check found', findings.length, 'issues');
      return findings;

    } catch (error) {
      console.error('[AICrossFileAnalyzer] AI setting check failed:', error);
      return super.checkSetting(validScripts);
    }
  }

  /**
   * Call DeepSeek API for analysis
   */
  private async callAI(
    userPrompt: string,
    expectedType: string
  ): Promise<CrossFileFinding[]> {
    const request: DeepSeekChatRequest = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: CROSS_FILE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Low temperature for consistent analysis
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    };

    const response = await this.client.chat(request);

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from DeepSeek API');
    }

    const rawContent = response.choices[0].message.content;

    // Parse JSON response
    let result: { findings: any[] };
    try {
      result = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('[AICrossFileAnalyzer] Failed to parse AI response:', rawContent);
      throw new Error('Invalid JSON response from AI');
    }

    if (!result.findings || !Array.isArray(result.findings)) {
      console.error('[AICrossFileAnalyzer] Invalid response structure:', result);
      return [];
    }

    // Convert AI findings to CrossFileFinding format
    const findings: CrossFileFinding[] = result.findings.map((f: any) => ({
      type: f.type || expectedType,
      severity: this.normalizeSeverity(f.severity),
      confidence: this.normalizeConfidence(f.confidence),
      description: f.description || '未知问题',
      affectedFiles: f.affectedFiles || [],
      evidence: f.evidence || {}
    }));

    // Filter by confidence threshold
    const minConfidence = this.config?.minConfidence || 0.5;
    const filtered = findings.filter(f => f.confidence >= minConfidence);

    console.log(`[AICrossFileAnalyzer] Filtered ${findings.length} → ${filtered.length} findings (min confidence: ${minConfidence})`);

    return filtered;
  }

  /**
   * Normalize severity from AI response
   */
  private normalizeSeverity(severity: any): 'critical' | 'warning' | 'info' {
    if (typeof severity === 'string') {
      const s = severity.toLowerCase();
      if (s === 'critical' || s === 'high') return 'critical';
      if (s === 'warning' || s === 'medium' || s === 'moderate') return 'warning';
      return 'info';
    }
    return 'warning'; // Default
  }

  /**
   * Normalize confidence from AI response
   */
  private normalizeConfidence(confidence: any): number {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence));
    }
    if (typeof confidence === 'string') {
      const parsed = parseFloat(confidence);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(1, parsed));
      }
    }
    return 0.7; // Default moderate confidence
  }
}

/**
 * Factory function for creating AI analyzer
 */
export function createAICrossFileAnalyzer(config?: CrossFileCheckConfig): AICrossFileAnalyzer {
  return new AICrossFileAnalyzer(config);
}

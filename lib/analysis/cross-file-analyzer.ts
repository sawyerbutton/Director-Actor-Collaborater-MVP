/**
 * Cross-File Analyzer for Multi-Script Analysis
 *
 * Detects issues that span across multiple script files
 */

import { ScriptFile } from '@prisma/client';
import {
  CrossFileFinding,
  CrossFileFindingType,
  FindingSeverity,
  AffectedFile,
} from '@/types/diagnostic-report';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parsed script content for cross-file analysis
 */
export interface ParsedScriptContent {
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  jsonContent: any; // Parsed JSON from conversion
  rawContent: string;
}

/**
 * Cross-file check configuration
 */
export interface CrossFileCheckConfig {
  /**
   * Types of checks to perform
   */
  checkTypes?: CrossFileFindingType[];

  /**
   * Minimum confidence threshold (0-1)
   */
  minConfidence?: number;

  /**
   * Maximum findings per type
   */
  maxFindingsPerType?: number;

  /**
   * Whether to use AI for complex checks
   */
  useAI?: boolean;
}

/**
 * Cross-file analysis result
 */
export interface CrossFileAnalysisResult {
  findings: CrossFileFinding[];
  processedFiles: number;
  totalFindings: number;
  byType: Record<CrossFileFindingType, number>;
  processingTime: number;
}

/**
 * Base class for cross-file analysis
 */
export abstract class CrossFileAnalyzer {
  protected config: Required<CrossFileCheckConfig>;

  constructor(config?: CrossFileCheckConfig) {
    this.config = {
      checkTypes: config?.checkTypes ?? [
        'cross_file_timeline',
        'cross_file_character',
        'cross_file_plot',
        'cross_file_setting',
      ],
      minConfidence: config?.minConfidence ?? 0.7,
      maxFindingsPerType: config?.maxFindingsPerType ?? 50,
      useAI: config?.useAI ?? false,
    };
  }

  /**
   * Analyze multiple script files for cross-file issues
   */
  async analyze(scriptFiles: ScriptFile[]): Promise<CrossFileAnalysisResult> {
    const startTime = Date.now();

    console.log(`[CrossFileAnalyzer] Starting cross-file analysis: ${scriptFiles.length} files`);

    // Parse script contents
    const parsedScripts = this.parseScripts(scriptFiles);

    // Sort by episode number
    const sortedScripts = this.sortByEpisode(parsedScripts);

    // Collect findings for each check type
    const allFindings: CrossFileFinding[] = [];

    for (const checkType of this.config.checkTypes) {
      const findings = await this.performCheck(checkType, sortedScripts);
      allFindings.push(...findings);
    }

    // Filter by confidence
    const filteredFindings = allFindings.filter(
      (f) => f.confidence >= this.config.minConfidence
    );

    // Calculate statistics
    const byType: Record<string, number> = {};
    for (const finding of filteredFindings) {
      byType[finding.type] = (byType[finding.type] || 0) + 1;
    }

    const processingTime = Date.now() - startTime;

    console.log(
      `[CrossFileAnalyzer] Completed: ${filteredFindings.length} findings in ${processingTime}ms`
    );

    return {
      findings: filteredFindings,
      processedFiles: scriptFiles.length,
      totalFindings: filteredFindings.length,
      byType: byType as Record<CrossFileFindingType, number>,
      processingTime,
    };
  }

  /**
   * Parse script files into structured format
   */
  private parseScripts(scriptFiles: ScriptFile[]): ParsedScriptContent[] {
    return scriptFiles
      .filter((file) => file.jsonContent !== null || file.rawContent)
      .map((file) => ({
        fileId: file.id,
        filename: file.filename,
        episodeNumber: file.episodeNumber,
        jsonContent: file.jsonContent,
        rawContent: file.rawContent,
      }));
  }

  /**
   * Sort scripts by episode number
   */
  private sortByEpisode(scripts: ParsedScriptContent[]): ParsedScriptContent[] {
    return [...scripts].sort((a, b) => {
      if (a.episodeNumber === null) return 1;
      if (b.episodeNumber === null) return -1;
      return a.episodeNumber - b.episodeNumber;
    });
  }

  /**
   * Perform specific check type
   */
  private async performCheck(
    checkType: CrossFileFindingType,
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    switch (checkType) {
      case 'cross_file_timeline':
        return await this.checkTimeline(scripts);
      case 'cross_file_character':
        return await this.checkCharacter(scripts);
      case 'cross_file_plot':
        return await this.checkPlot(scripts);
      case 'cross_file_setting':
        return await this.checkSetting(scripts);
      default:
        return [];
    }
  }

  /**
   * Check timeline consistency across files
   * @abstract Must be implemented by subclass or returns empty array
   */
  protected async checkTimeline(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    console.log('[CrossFileAnalyzer] Timeline check not implemented, skipping');
    return [];
  }

  /**
   * Check character consistency across files
   * @abstract Must be implemented by subclass or returns empty array
   */
  protected async checkCharacter(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    console.log('[CrossFileAnalyzer] Character check not implemented, skipping');
    return [];
  }

  /**
   * Check plot consistency across files
   * @abstract Must be implemented by subclass or returns empty array
   */
  protected async checkPlot(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    console.log('[CrossFileAnalyzer] Plot check not implemented, skipping');
    return [];
  }

  /**
   * Check setting consistency across files
   * @abstract Must be implemented by subclass or returns empty array
   */
  protected async checkSetting(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    console.log('[CrossFileAnalyzer] Setting check not implemented, skipping');
    return [];
  }

  /**
   * Helper: Create a cross-file finding
   */
  protected createFinding(
    type: CrossFileFindingType,
    severity: FindingSeverity,
    affectedFiles: AffectedFile[],
    description: string,
    suggestion: string,
    evidence: string[],
    confidence: number
  ): CrossFileFinding {
    return {
      id: uuidv4(),
      type,
      severity,
      affectedFiles,
      description,
      suggestion,
      confidence,
      evidence,
    };
  }

  /**
   * Helper: Create affected file reference
   */
  protected createAffectedFile(
    fileId: string,
    filename: string,
    episodeNumber: number | null,
    sceneId?: string,
    line?: number
  ): AffectedFile {
    return {
      fileId,
      filename,
      episodeNumber,
      location: {
        sceneId,
        line: line || 0,
      },
    };
  }

  /**
   * Helper: Extract scenes from JSON content
   */
  protected extractScenes(jsonContent: any): any[] {
    if (!jsonContent) return [];

    if (Array.isArray(jsonContent.scenes)) {
      return jsonContent.scenes;
    }

    if (Array.isArray(jsonContent)) {
      return jsonContent;
    }

    return [];
  }

  /**
   * Helper: Extract characters from JSON content
   */
  protected extractCharacters(jsonContent: any): string[] {
    if (!jsonContent) return [];

    if (Array.isArray(jsonContent.characters)) {
      return jsonContent.characters.map((c: any) => c.name || c);
    }

    // Extract from scenes
    const scenes = this.extractScenes(jsonContent);
    const characterSet = new Set<string>();

    for (const scene of scenes) {
      if (scene.characters && Array.isArray(scene.characters)) {
        scene.characters.forEach((c: any) => {
          const name = typeof c === 'string' ? c : c.name;
          if (name) characterSet.add(name);
        });
      }

      if (scene.dialogues && Array.isArray(scene.dialogues)) {
        scene.dialogues.forEach((d: any) => {
          if (d.character) characterSet.add(d.character);
        });
      }
    }

    return Array.from(characterSet);
  }

  /**
   * Helper: Extract timeline events from content
   */
  protected extractTimelineEvents(script: ParsedScriptContent): Array<{
    sceneId: string;
    timestamp?: string;
    timeReference?: string;
    line?: number;
  }> {
    const scenes = this.extractScenes(script.jsonContent);
    const events: Array<{
      sceneId: string;
      timestamp?: string;
      timeReference?: string;
      line?: number;
    }> = [];

    for (const scene of scenes) {
      if (scene.time || scene.timestamp || scene.timeReference) {
        events.push({
          sceneId: scene.id || scene.sceneNumber || 'unknown',
          timestamp: scene.timestamp,
          timeReference: scene.time || scene.timeReference,
          line: scene.line,
        });
      }
    }

    return events;
  }

  /**
   * Helper: Extract plot points from content
   */
  protected extractPlotPoints(script: ParsedScriptContent): Array<{
    description: string;
    sceneId: string;
    line?: number;
  }> {
    const scenes = this.extractScenes(script.jsonContent);
    const plotPoints: Array<{
      description: string;
      sceneId: string;
      line?: number;
    }> = [];

    for (const scene of scenes) {
      if (scene.plot || scene.summary) {
        plotPoints.push({
          description: scene.plot || scene.summary,
          sceneId: scene.id || scene.sceneNumber || 'unknown',
          line: scene.line,
        });
      }
    }

    return plotPoints;
  }

  /**
   * Helper: Extract setting/location information
   */
  protected extractSettings(script: ParsedScriptContent): Array<{
    location: string;
    description?: string;
    sceneId: string;
    line?: number;
  }> {
    const scenes = this.extractScenes(script.jsonContent);
    const settings: Array<{
      location: string;
      description?: string;
      sceneId: string;
      line?: number;
    }> = [];

    for (const scene of scenes) {
      if (scene.location || scene.setting) {
        settings.push({
          location: scene.location || scene.setting,
          description: scene.description,
          sceneId: scene.id || scene.sceneNumber || 'unknown',
          line: scene.line,
        });
      }
    }

    return settings;
  }
}

/**
 * Default implementation of CrossFileAnalyzer
 * (can be extended with AI-powered checks)
 */
export class DefaultCrossFileAnalyzer extends CrossFileAnalyzer {
  constructor(config?: CrossFileCheckConfig) {
    super(config);
  }

  // Subclasses can override checkTimeline, checkCharacter, etc.
  // For now, this returns empty arrays (implemented in T3.5-T3.8)
}

/**
 * Factory function to create analyzer
 */
export function createCrossFileAnalyzer(
  config?: CrossFileCheckConfig
): CrossFileAnalyzer {
  return new DefaultCrossFileAnalyzer(config);
}

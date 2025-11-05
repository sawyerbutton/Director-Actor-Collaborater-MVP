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
 * Default implementation of CrossFileAnalyzer with rule-based checks
 */
export class DefaultCrossFileAnalyzer extends CrossFileAnalyzer {
  constructor(config?: CrossFileCheckConfig) {
    super(config);
  }

  /**
   * Check timeline consistency across scripts
   * Detects chronological conflicts between episodes
   */
  protected async checkTimeline(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    const findings: CrossFileFinding[] = [];

    console.log(`[CrossFileAnalyzer] Starting timeline check: ${scripts.length} scripts`);

    // Extract timeline events from all scripts
    const allEvents = scripts.map((script) => ({
      script,
      events: this.extractTimelineEvents(script),
    }));

    // Check for chronological inconsistencies between consecutive episodes
    for (let i = 0; i < allEvents.length - 1; i++) {
      const current = allEvents[i];
      const next = allEvents[i + 1];

      // Skip if either script has no timeline events
      if (current.events.length === 0 || next.events.length === 0) {
        continue;
      }

      // Get last event of current script
      const lastEvent = current.events[current.events.length - 1];
      // Get first event of next script
      const firstEvent = next.events[0];

      // Check if dates are parseable
      const lastDate = this.parseDate(lastEvent.timestamp || lastEvent.timeReference);
      const firstDate = this.parseDate(firstEvent.timestamp || firstEvent.timeReference);

      if (lastDate && firstDate && firstDate < lastDate) {
        // Timeline conflict detected: next episode starts before current episode ends
        findings.push(
          this.createFinding(
            'cross_file_timeline',
            'high',
            [
              this.createAffectedFile(
                current.script.fileId,
                current.script.filename,
                current.script.episodeNumber,
                lastEvent.sceneId,
                lastEvent.line
              ),
              this.createAffectedFile(
                next.script.fileId,
                next.script.filename,
                next.script.episodeNumber,
                firstEvent.sceneId,
                firstEvent.line
              ),
            ],
            `${next.script.filename}开场时间（${this.formatDate(firstDate)}）早于${current.script.filename}结尾（${this.formatDate(lastDate)}）`,
            `将${next.script.filename}开场时间调整为${this.formatDate(lastDate)}之后`,
            [
              `${current.script.filename}最后时间点：${lastEvent.timeReference || lastEvent.timestamp}`,
              `${next.script.filename}开场时间点：${firstEvent.timeReference || firstEvent.timestamp}`,
            ],
            0.85
          )
        );
      }

      // Check for duplicate dates within same episode
      const currentDates = current.events
        .map((e) => this.parseDate(e.timestamp || e.timeReference))
        .filter((d): d is Date => d !== null);

      for (let j = 0; j < currentDates.length - 1; j++) {
        if (currentDates[j + 1] < currentDates[j]) {
          // Timeline goes backwards within episode
          const event1 = current.events[j];
          const event2 = current.events[j + 1];

          findings.push(
            this.createFinding(
              'cross_file_timeline',
              'medium',
              [
                this.createAffectedFile(
                  current.script.fileId,
                  current.script.filename,
                  current.script.episodeNumber,
                  event1.sceneId,
                  event1.line
                ),
                this.createAffectedFile(
                  current.script.fileId,
                  current.script.filename,
                  current.script.episodeNumber,
                  event2.sceneId,
                  event2.line
                ),
              ],
              `${current.script.filename}内部时间线倒退：场景${event2.sceneId}（${this.formatDate(currentDates[j + 1])}）早于场景${event1.sceneId}（${this.formatDate(currentDates[j])}）`,
              `调整场景顺序或修正时间标记`,
              [
                `场景${event1.sceneId}：${event1.timeReference || event1.timestamp}`,
                `场景${event2.sceneId}：${event2.timeReference || event2.timestamp}`,
              ],
              0.80
            )
          );
        }
      }
    }

    // Check for temporal gaps (optional: flag suspiciously large gaps)
    for (let i = 0; i < allEvents.length - 1; i++) {
      const current = allEvents[i];
      const next = allEvents[i + 1];

      if (current.events.length === 0 || next.events.length === 0) continue;

      const lastEvent = current.events[current.events.length - 1];
      const firstEvent = next.events[0];

      const lastDate = this.parseDate(lastEvent.timestamp || lastEvent.timeReference);
      const firstDate = this.parseDate(firstEvent.timestamp || firstEvent.timeReference);

      if (lastDate && firstDate) {
        const daysDiff = Math.floor((firstDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        // Flag if gap is more than 1 year
        if (daysDiff > 365) {
          findings.push(
            this.createFinding(
              'cross_file_timeline',
              'low',
              [
                this.createAffectedFile(
                  current.script.fileId,
                  current.script.filename,
                  current.script.episodeNumber,
                  lastEvent.sceneId,
                  lastEvent.line
                ),
                this.createAffectedFile(
                  next.script.fileId,
                  next.script.filename,
                  next.script.episodeNumber,
                  firstEvent.sceneId,
                  firstEvent.line
                ),
              ],
              `${current.script.filename}和${next.script.filename}之间存在较大时间跨度（约${Math.floor(daysDiff / 365)}年）`,
              `确认时间跨度是否符合故事设定，如有必要添加过渡说明`,
              [
                `${current.script.filename}结尾：${this.formatDate(lastDate)}`,
                `${next.script.filename}开场：${this.formatDate(firstDate)}`,
              ],
              0.60
            )
          );
        }
      }
    }

    console.log(`[CrossFileAnalyzer] Timeline check completed: ${findings.length} findings`);

    return findings.slice(0, this.config.maxFindingsPerType);
  }

  /**
   * Parse date from Chinese or English date string
   */
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    // Try ISO format first (YYYY-MM-DD)
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try Chinese format (YYYY年MM月DD日)
    const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (cnMatch) {
      const [, year, month, day] = cnMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try year-month only (YYYY-MM or YYYY年MM月)
    const ymMatch = dateStr.match(/(\d{4})[-年](\d{1,2})[月]?/);
    if (ymMatch) {
      const [, year, month] = ymMatch;
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    }

    return null;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  /**
   * Check character consistency across scripts
   * Detects character introduction issues and name inconsistencies
   */
  protected async checkCharacter(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    const findings: CrossFileFinding[] = [];

    console.log(`[CrossFileAnalyzer] Starting character check: ${scripts.length} scripts`);

    // Extract characters from all scripts
    const allCharacters = scripts.map((script) => ({
      script,
      characters: this.extractCharacters(script.jsonContent),
    }));

    // Track first appearance of each character
    const characterFirstAppearance = new Map<string, { script: ParsedScriptContent; index: number }>();

    for (let i = 0; i < allCharacters.length; i++) {
      const { script, characters } = allCharacters[i];

      for (const character of characters) {
        const normalizedName = this.normalizeCharacterName(character);
        if (!characterFirstAppearance.has(normalizedName)) {
          characterFirstAppearance.set(normalizedName, { script, index: i });
        }
      }
    }

    // Check for characters appearing without introduction
    for (let i = 1; i < allCharacters.length; i++) {
      const { script, characters } = allCharacters[i];

      for (const character of characters) {
        const normalizedName = this.normalizeCharacterName(character);
        const firstAppearance = characterFirstAppearance.get(normalizedName);

        // Character appears in later episode without appearing in any earlier episode
        if (firstAppearance && firstAppearance.index === i) {
          // Check if this character should have been introduced earlier
          // (Skip if this is the first episode, since all characters must be introduced somewhere)
          if (i > 0) {
            // This is a potential issue: character first appears in a later episode
            const previousScripts = allCharacters.slice(0, i);
            const mentionedBefore = previousScripts.some(({ characters: prevChars }) =>
              prevChars.some(
                (c) => this.calculateNameSimilarity(normalizedName, this.normalizeCharacterName(c)) > 0.7
              )
            );

            if (!mentionedBefore) {
              findings.push(
                this.createFinding(
                  'cross_file_character',
                  'medium',
                  [
                    this.createAffectedFile(
                      script.fileId,
                      script.filename,
                      script.episodeNumber,
                      'first_appearance'
                    ),
                  ],
                  `角色"${character}"在${script.filename}首次出现，但在之前的集数中未被引入`,
                  `在更早的集数中引入该角色，或在当前集数开场添加角色介绍`,
                  [`${script.filename}中出现的新角色：${character}`],
                  0.70
                )
              );
            }
          }
        }
      }
    }

    // Check for similar but not identical character names (potential typos)
    const allUniqueCharacters = Array.from(characterFirstAppearance.keys());

    for (let i = 0; i < allUniqueCharacters.length; i++) {
      for (let j = i + 1; j < allUniqueCharacters.length; j++) {
        const name1 = allUniqueCharacters[i];
        const name2 = allUniqueCharacters[j];

        const similarity = this.calculateNameSimilarity(name1, name2);

        // If names are very similar (60-95%), might be a typo or inconsistency
        if (similarity > 0.6 && similarity < 0.95) {
          const appearance1 = characterFirstAppearance.get(name1)!;
          const appearance2 = characterFirstAppearance.get(name2)!;

          findings.push(
            this.createFinding(
              'cross_file_character',
              'high',
              [
                this.createAffectedFile(
                  appearance1.script.fileId,
                  appearance1.script.filename,
                  appearance1.script.episodeNumber,
                  'character_name'
                ),
                this.createAffectedFile(
                  appearance2.script.fileId,
                  appearance2.script.filename,
                  appearance2.script.episodeNumber,
                  'character_name'
                ),
              ],
              `角色名称可能存在不一致："${name1}"和"${name2}"（相似度${(similarity * 100).toFixed(0)}%）`,
              `确认是否为同一角色，如是则统一名称；如否则增加区分度`,
              [
                `${appearance1.script.filename}中：${name1}`,
                `${appearance2.script.filename}中：${name2}`,
              ],
              0.75
            )
          );
        }
      }
    }

    // Check for character frequency anomalies
    for (let i = 0; i < allCharacters.length; i++) {
      const { script, characters } = allCharacters[i];

      // Count character occurrences
      const characterCounts = new Map<string, number>();
      for (const character of characters) {
        const normalized = this.normalizeCharacterName(character);
        characterCounts.set(normalized, (characterCounts.get(normalized) || 0) + 1);
      }

      // Flag characters that appear only once (might be a typo or one-off character)
      for (const [character, count] of characterCounts.entries()) {
        if (count === 1) {
          // Check if this character appears in other episodes
          const appearsInOther = allCharacters
            .filter((_, idx) => idx !== i)
            .some(({ characters: otherChars }) =>
              otherChars.some(
                (c) => this.calculateNameSimilarity(character, this.normalizeCharacterName(c)) > 0.8
              )
            );

          if (!appearsInOther) {
            findings.push(
              this.createFinding(
                'cross_file_character',
                'low',
                [
                  this.createAffectedFile(
                    script.fileId,
                    script.filename,
                    script.episodeNumber,
                    'single_mention'
                  ),
                ],
                `角色"${character}"在${script.filename}中仅出现一次，且在其他集数中未出现`,
                `确认该角色是否必要，或考虑增加其戏份/对话`,
                [`${script.filename}中的一次性角色：${character}`],
                0.50
              )
            );
          }
        }
      }
    }

    console.log(`[CrossFileAnalyzer] Character check completed: ${findings.length} findings`);

    return findings.slice(0, this.config.maxFindingsPerType);
  }

  /**
   * Normalize character name for comparison
   */
  private normalizeCharacterName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, '')
      .replace(/[（(].*?[）)]/g, '') // Remove parenthetical notes
      .toLowerCase();
  }

  /**
   * Calculate similarity between two character names (0-1)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeCharacterName(name1);
    const normalized2 = this.normalizeCharacterName(name2);

    if (normalized1 === normalized2) return 1.0;

    // Simple Levenshtein-like similarity
    const maxLen = Math.max(normalized1.length, normalized2.length);
    if (maxLen === 0) return 1.0;

    let matches = 0;
    const minLen = Math.min(normalized1.length, normalized2.length);

    for (let i = 0; i < minLen; i++) {
      if (normalized1[i] === normalized2[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }
}

/**
 * Factory function to create analyzer
 */
export function createCrossFileAnalyzer(
  config?: CrossFileCheckConfig
): CrossFileAnalyzer {
  return new DefaultCrossFileAnalyzer(config);
}

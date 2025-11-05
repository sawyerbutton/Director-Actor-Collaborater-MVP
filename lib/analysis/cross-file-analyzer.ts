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

  /**
   * Check plot consistency across scripts
   * Detects plot thread issues and narrative inconsistencies
   */
  protected async checkPlot(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    const findings: CrossFileFinding[] = [];

    console.log(`[CrossFileAnalyzer] Starting plot check: ${scripts.length} scripts`);

    // Extract plot points from all scripts
    const allPlotPoints = scripts.map((script) => ({
      script,
      plotPoints: this.extractPlotPoints(script),
    }));

    // Check for unresolved plot threads
    // A plot thread is considered unresolved if it's mentioned in early episodes
    // but not referenced in later episodes
    for (let i = 0; i < allPlotPoints.length - 1; i++) {
      const current = allPlotPoints[i];

      for (const plotPoint of current.plotPoints) {
        // Check if this plot point is referenced in subsequent episodes
        const mentionedLater = allPlotPoints
          .slice(i + 1)
          .some(({ plotPoints }) =>
            plotPoints.some((p) => this.plotsAreSimilar(plotPoint.description, p.description))
          );

        // If plot point mentions keywords suggesting it needs resolution
        // but is not mentioned in later episodes, flag it
        const needsResolution = this.plotNeedsResolution(plotPoint.description);

        if (needsResolution && !mentionedLater && i < allPlotPoints.length - 2) {
          // Only flag if there are at least 2 more episodes after this one
          findings.push(
            this.createFinding(
              'cross_file_plot',
              'medium',
              [
                this.createAffectedFile(
                  current.script.fileId,
                  current.script.filename,
                  current.script.episodeNumber,
                  plotPoint.sceneId,
                  plotPoint.line
                ),
              ],
              `${current.script.filename}中提出的情节线索可能未在后续集数中解决："${plotPoint.description.substring(0, 50)}..."`,
              `在后续集数中添加该情节线索的发展或解决`,
              [`${current.script.filename} 场景${plotPoint.sceneId}：${plotPoint.description}`],
              0.65
            )
          );
        }
      }
    }

    // Check for plot contradictions between episodes
    for (let i = 0; i < allPlotPoints.length; i++) {
      for (let j = i + 1; j < allPlotPoints.length; j++) {
        const script1 = allPlotPoints[i];
        const script2 = allPlotPoints[j];

        for (const plot1 of script1.plotPoints) {
          for (const plot2 of script2.plotPoints) {
            // Check if plots are about the same subject but contradict each other
            const areSimilar = this.plotsAreSimilar(plot1.description, plot2.description);
            const areContradictory = this.plotsAreContradictory(plot1.description, plot2.description);

            if (areSimilar && areContradictory) {
              findings.push(
                this.createFinding(
                  'cross_file_plot',
                  'high',
                  [
                    this.createAffectedFile(
                      script1.script.fileId,
                      script1.script.filename,
                      script1.script.episodeNumber,
                      plot1.sceneId,
                      plot1.line
                    ),
                    this.createAffectedFile(
                      script2.script.fileId,
                      script2.script.filename,
                      script2.script.episodeNumber,
                      plot2.sceneId,
                      plot2.line
                    ),
                  ],
                  `${script1.script.filename}和${script2.script.filename}之间存在情节矛盾`,
                  `统一情节叙述，或添加解释说明情节变化的原因`,
                  [
                    `${script1.script.filename} 场景${plot1.sceneId}：${plot1.description}`,
                    `${script2.script.filename} 场景${plot2.sceneId}：${plot2.description}`,
                  ],
                  0.70
                )
              );
            }
          }
        }
      }
    }

    // Check for missing plot context (plot point without setup)
    for (let i = 1; i < allPlotPoints.length; i++) {
      const current = allPlotPoints[i];

      for (const plotPoint of current.plotPoints) {
        // Check if this plot point references something that should have been set up earlier
        const needsSetup = this.plotNeedsSetup(plotPoint.description);

        if (needsSetup) {
          // Check if there's any relevant setup in previous episodes
          const hasSetup = allPlotPoints
            .slice(0, i)
            .some(({ plotPoints }) =>
              plotPoints.some((p) => this.plotsAreSimilar(plotPoint.description, p.description, 0.4))
            );

          if (!hasSetup) {
            findings.push(
              this.createFinding(
                'cross_file_plot',
                'medium',
                [
                  this.createAffectedFile(
                    current.script.fileId,
                    current.script.filename,
                    current.script.episodeNumber,
                    plotPoint.sceneId,
                    plotPoint.line
                  ),
                ],
                `${current.script.filename}中的情节可能缺少前置铺垫："${plotPoint.description.substring(0, 50)}..."`,
                `在之前的集数中添加相关情节铺垫`,
                [`${current.script.filename} 场景${plotPoint.sceneId}：${plotPoint.description}`],
                0.60
              )
            );
          }
        }
      }
    }

    console.log(`[CrossFileAnalyzer] Plot check completed: ${findings.length} findings`);

    return findings.slice(0, this.config.maxFindingsPerType);
  }

  /**
   * Check if two plot descriptions are about similar subjects
   */
  private plotsAreSimilar(plot1: string, plot2: string, threshold: number = 0.3): boolean {
    const words1 = new Set(this.tokenizePlot(plot1));
    const words2 = new Set(this.tokenizePlot(plot2));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    return similarity >= threshold;
  }

  /**
   * Check if two plots contradict each other
   */
  private plotsAreContradictory(plot1: string, plot2: string): boolean {
    // Simple heuristic: check for contradictory keywords
    const contradictionPatterns = [
      { pattern: /成功|获得|达成|实现/, opposite: /失败|失去|未能|放弃/ },
      { pattern: /同意|接受|答应/, opposite: /拒绝|反对|否决/ },
      { pattern: /活着|存活|生还/, opposite: /死亡|去世|牺牲/ },
      { pattern: /找到|发现|获取/, opposite: /丢失|失踪|遗失/ },
      { pattern: /相信|信任/, opposite: /怀疑|背叛|欺骗/ },
    ];

    for (const { pattern, opposite } of contradictionPatterns) {
      const plot1HasPattern = pattern.test(plot1);
      const plot2HasOpposite = opposite.test(plot2);

      const plot2HasPattern = pattern.test(plot2);
      const plot1HasOpposite = opposite.test(plot1);

      if ((plot1HasPattern && plot2HasOpposite) || (plot2HasPattern && plot1HasOpposite)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if plot needs resolution (contains keywords suggesting unfinished business)
   */
  private plotNeedsResolution(plot: string): boolean {
    const keywords = [
      /计划|打算|准备/,
      /寻找|搜索|追踪/,
      /等待|期待/,
      /威胁|危险|危机/,
      /秘密|隐瞒/,
      /悬念|疑问/,
      /未解决|未完成/,
    ];

    return keywords.some((keyword) => keyword.test(plot));
  }

  /**
   * Check if plot needs setup (references something that should have been introduced earlier)
   */
  private plotNeedsSetup(plot: string): boolean {
    const keywords = [
      /之前|以前|曾经/,
      /早就|一直|从来/,
      /记得|回忆|想起/,
      /终于|最终|结果/,
      /继续|接着|然后/,
    ];

    return keywords.some((keyword) => keyword.test(plot));
  }

  /**
   * Tokenize plot description for similarity comparison
   */
  private tokenizePlot(plot: string): string[] {
    return plot
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }

  /**
   * Check setting consistency across scripts
   * Detects location and setting inconsistencies
   */
  protected async checkSetting(
    scripts: ParsedScriptContent[]
  ): Promise<CrossFileFinding[]> {
    const findings: CrossFileFinding[] = [];

    console.log(`[CrossFileAnalyzer] Starting setting check: ${scripts.length} scripts`);

    // Extract settings from all scripts
    const allSettings = scripts.map((script) => ({
      script,
      settings: this.extractSettings(script),
    }));

    // Build location registry (track all mentions of each location)
    const locationRegistry = new Map<
      string,
      Array<{
        script: ParsedScriptContent;
        setting: { location: string; description?: string; sceneId: string; line?: number };
      }>
    >();

    for (const { script, settings } of allSettings) {
      for (const setting of settings) {
        const normalizedLocation = this.normalizeLocation(setting.location);
        if (!locationRegistry.has(normalizedLocation)) {
          locationRegistry.set(normalizedLocation, []);
        }
        locationRegistry.get(normalizedLocation)!.push({ script, setting });
      }
    }

    // Check for contradictory location descriptions
    for (const [location, mentions] of locationRegistry.entries()) {
      if (mentions.length < 2) continue; // Need at least 2 mentions to compare

      // Compare descriptions for contradictions
      for (let i = 0; i < mentions.length; i++) {
        for (let j = i + 1; j < mentions.length; j++) {
          const mention1 = mentions[i];
          const mention2 = mentions[j];

          const desc1 = mention1.setting.description || '';
          const desc2 = mention2.setting.description || '';

          if (desc1 && desc2) {
            const areContradictory = this.settingsAreContradictory(desc1, desc2);

            if (areContradictory) {
              findings.push(
                this.createFinding(
                  'cross_file_setting',
                  'high',
                  [
                    this.createAffectedFile(
                      mention1.script.fileId,
                      mention1.script.filename,
                      mention1.script.episodeNumber,
                      mention1.setting.sceneId,
                      mention1.setting.line
                    ),
                    this.createAffectedFile(
                      mention2.script.fileId,
                      mention2.script.filename,
                      mention2.script.episodeNumber,
                      mention2.setting.sceneId,
                      mention2.setting.line
                    ),
                  ],
                  `地点"${location}"在不同集数中存在矛盾描述`,
                  `统一地点描述，或添加说明解释地点变化`,
                  [
                    `${mention1.script.filename} 场景${mention1.setting.sceneId}：${desc1}`,
                    `${mention2.script.filename} 场景${mention2.setting.sceneId}：${desc2}`,
                  ],
                  0.75
                )
              );
            }
          }
        }
      }
    }

    // Check for sudden location appearances (location mentioned without introduction)
    for (const [location, mentions] of locationRegistry.entries()) {
      const firstMention = mentions[0];
      const firstEpisodeIndex = scripts.findIndex((s) => s.fileId === firstMention.script.fileId);

      // If location first appears after episode 1, check if it's introduced properly
      if (firstEpisodeIndex > 0) {
        const description = firstMention.setting.description || '';
        const hasIntroduction = /新|初次|第一次|来到/.test(description);

        if (!hasIntroduction) {
          findings.push(
            this.createFinding(
              'cross_file_setting',
              'low',
              [
                this.createAffectedFile(
                  firstMention.script.fileId,
                  firstMention.script.filename,
                  firstMention.script.episodeNumber,
                  firstMention.setting.sceneId,
                  firstMention.setting.line
                ),
              ],
              `地点"${location}"在${firstMention.script.filename}首次出现，但缺少场景介绍`,
              `添加对该地点的介绍性描述`,
              [`${firstMention.script.filename} 场景${firstMention.setting.sceneId}：${location}`],
              0.55
            )
          );
        }
      }
    }

    // Check for inconsistent location usage patterns
    // Flag if a major location (mentioned 3+ times) suddenly stops appearing
    for (const [location, mentions] of locationRegistry.entries()) {
      if (mentions.length < 3) continue; // Only check frequently used locations

      // Find episodes where this location appears
      const episodeIndices = mentions
        .map((m) => scripts.findIndex((s) => s.fileId === m.script.fileId))
        .sort((a, b) => a - b);

      // Check for large gaps in usage
      for (let i = 0; i < episodeIndices.length - 1; i++) {
        const gap = episodeIndices[i + 1] - episodeIndices[i];

        if (gap > 2) {
          // Location not mentioned for 3+ episodes
          const beforeScript = scripts[episodeIndices[i]];
          const afterScript = scripts[episodeIndices[i + 1]];

          findings.push(
            this.createFinding(
              'cross_file_setting',
              'low',
              [
                this.createAffectedFile(
                  beforeScript.fileId,
                  beforeScript.filename,
                  beforeScript.episodeNumber,
                  'location_usage'
                ),
                this.createAffectedFile(
                  afterScript.fileId,
                  afterScript.filename,
                  afterScript.episodeNumber,
                  'location_usage'
                ),
              ],
              `重要地点"${location}"在${beforeScript.filename}之后消失，在${afterScript.filename}重新出现（间隔${gap}集）`,
              `考虑在中间集数添加对该地点的提及，或解释为何长时间未出现`,
              [
                `最后出现：${beforeScript.filename}`,
                `再次出现：${afterScript.filename}`,
              ],
              0.50
            )
          );
        }
      }
    }

    // Check for similar but not identical location names (typos)
    const allLocations = Array.from(locationRegistry.keys());

    for (let i = 0; i < allLocations.length; i++) {
      for (let j = i + 1; j < allLocations.length; j++) {
        const loc1 = allLocations[i];
        const loc2 = allLocations[j];

        const similarity = this.calculateLocationSimilarity(loc1, loc2);

        // If locations are very similar (70-95%), might be a typo
        if (similarity > 0.7 && similarity < 0.95) {
          const mentions1 = locationRegistry.get(loc1)!;
          const mentions2 = locationRegistry.get(loc2)!;

          findings.push(
            this.createFinding(
              'cross_file_setting',
              'medium',
              [
                this.createAffectedFile(
                  mentions1[0].script.fileId,
                  mentions1[0].script.filename,
                  mentions1[0].script.episodeNumber,
                  mentions1[0].setting.sceneId
                ),
                this.createAffectedFile(
                  mentions2[0].script.fileId,
                  mentions2[0].script.filename,
                  mentions2[0].script.episodeNumber,
                  mentions2[0].setting.sceneId
                ),
              ],
              `地点名称可能存在不一致："${loc1}"和"${loc2}"（相似度${(similarity * 100).toFixed(0)}%）`,
              `确认是否为同一地点，如是则统一名称`,
              [
                `${mentions1[0].script.filename}中：${loc1}`,
                `${mentions2[0].script.filename}中：${loc2}`,
              ],
              0.70
            )
          );
        }
      }
    }

    console.log(`[CrossFileAnalyzer] Setting check completed: ${findings.length} findings`);

    return findings.slice(0, this.config.maxFindingsPerType);
  }

  /**
   * Normalize location name for comparison
   */
  private normalizeLocation(location: string): string {
    return location
      .trim()
      .replace(/\s+/g, '')
      .replace(/[的、，,。.]/g, '')
      .toLowerCase();
  }

  /**
   * Calculate similarity between two location names
   */
  private calculateLocationSimilarity(loc1: string, loc2: string): number {
    const normalized1 = this.normalizeLocation(loc1);
    const normalized2 = this.normalizeLocation(loc2);

    if (normalized1 === normalized2) return 1.0;

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

  /**
   * Check if two setting descriptions contradict each other
   */
  private settingsAreContradictory(desc1: string, desc2: string): boolean {
    // Check for contradictory attributes
    const contradictionPatterns = [
      { pattern: /宽敞|开阔|广阔/, opposite: /狭窄|狭小|拥挤/ },
      { pattern: /明亮|光亮|敞亮/, opposite: /昏暗|阴暗|黑暗/ },
      { pattern: /干净|整洁|清洁/, opposite: /脏|杂乱|破旧/ },
      { pattern: /现代|新式|时尚/, opposite: /古老|陈旧|传统/ },
      { pattern: /安静|宁静|寂静/, opposite: /喧闹|嘈杂|吵闹/ },
      { pattern: /豪华|奢华|高档/, opposite: /简陋|破败|廉价/ },
    ];

    for (const { pattern, opposite } of contradictionPatterns) {
      const desc1HasPattern = pattern.test(desc1);
      const desc2HasOpposite = opposite.test(desc2);

      const desc2HasPattern = pattern.test(desc2);
      const desc1HasOpposite = opposite.test(desc1);

      if ((desc1HasPattern && desc2HasOpposite) || (desc2HasPattern && desc1HasOpposite)) {
        return true;
      }
    }

    return false;
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

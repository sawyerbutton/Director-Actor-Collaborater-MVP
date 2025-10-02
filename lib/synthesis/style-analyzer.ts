/**
 * Epic 007: Style Analysis System
 *
 * Analyzes and preserves the original script's stylistic characteristics
 * to ensure synthesized content maintains consistent voice and tone.
 */

import {
  StyleProfile,
  SentencePattern,
  DialogueStyle,
  NarrativeVoice,
  PacingProfile
} from '@/types/synthesis';

export class StyleAnalyzer {
  /**
   * Analyzes the complete style profile of a script
   */
  async analyzeStyle(script: string): Promise<StyleProfile> {
    const lines = script.split('\n');

    const tone = await this.analyzeTone(script);
    const vocabulary = this.extractVocabulary(script);
    const sentencePatterns = this.analyzeSentencePatterns(script);
    const dialogueStyle = this.analyzeDialogueStyle(lines);
    const narrativeVoice = this.analyzeNarrativeVoice(lines);
    const pacing = this.analyzePacing(lines);

    return {
      tone,
      vocabulary,
      sentencePatterns,
      dialogueStyle,
      narrativeVoice,
      pacing
    };
  }

  /**
   * Analyzes overall tone and mood
   */
  private async analyzeTone(script: string): Promise<string> {
    // Extract tone indicators
    const toneKeywords = {
      '严肃': ['严肃', '庄重', '正式', '冷静', '理性'],
      '幽默': ['幽默', '搞笑', '诙谐', '调侃', '玩笑'],
      '悲伤': ['悲伤', '哀伤', '忧郁', '伤感', '沉重'],
      '欢快': ['欢快', '愉悦', '开心', '快乐', '轻松'],
      '紧张': ['紧张', '刺激', '惊险', '悬疑', '危急'],
      '温馨': ['温馨', '温暖', '亲切', '温和', '柔和']
    };

    const toneCounts: Record<string, number> = {};

    for (const [tone, keywords] of Object.entries(toneKeywords)) {
      let count = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'g');
        const matches = script.match(regex);
        count += matches ? matches.length : 0;
      });
      toneCounts[tone] = count;
    }

    // Return dominant tone
    const dominantTone = Object.entries(toneCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return dominantTone ? dominantTone[0] : '中性';
  }

  /**
   * Extracts frequently used vocabulary
   */
  private extractVocabulary(script: string): string[] {
    // Tokenize Chinese and English words
    const words = script.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];

    // Count frequency
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      if (word.length >= 2) { // Skip single characters
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    // Filter common stop words
    const stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
      '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to'
    ]);

    // Return top 100 words excluding stop words
    return Object.entries(frequency)
      .filter(([word]) => !stopWords.has(word))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100)
      .map(([word]) => word);
  }

  /**
   * Analyzes sentence structure patterns
   */
  private analyzeSentencePatterns(script: string): SentencePattern[] {
    const sentences = script.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const patterns: Map<string, { count: number; examples: string[] }> = new Map();

    sentences.forEach(sentence => {
      const pattern = this.classifySentencePattern(sentence);
      const existing = patterns.get(pattern) || { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3) {
        existing.examples.push(sentence.trim().substring(0, 50));
      }
      patterns.set(pattern, existing);
    });

    const totalSentences = sentences.length;

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count / totalSentences,
        examples: data.examples
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20); // Top 20 patterns
  }

  /**
   * Classifies sentence into pattern categories
   */
  private classifySentencePattern(sentence: string): string {
    const trimmed = sentence.trim();

    // Question
    if (trimmed.includes('？') || trimmed.includes('?') ||
        trimmed.match(/^(谁|什么|哪|怎么|为什么|何时|哪里)/)) {
      return '疑问句';
    }

    // Exclamation
    if (trimmed.includes('！') || trimmed.includes('!')) {
      return '感叹句';
    }

    // Imperative
    if (trimmed.match(/^(请|让|别|不要|必须|应该)/)) {
      return '祈使句';
    }

    // Conditional
    if (trimmed.includes('如果') || trimmed.includes('假如') ||
        trimmed.includes('要是') || trimmed.includes('倘若')) {
      return '条件句';
    }

    // Causal
    if (trimmed.includes('因为') || trimmed.includes('所以') ||
        trimmed.includes('由于') || trimmed.includes('因此')) {
      return '因果句';
    }

    // Length-based classification
    const length = trimmed.length;
    if (length < 10) return '短句';
    if (length < 30) return '中等句';
    return '长句';
  }

  /**
   * Analyzes dialogue style characteristics
   */
  private analyzeDialogueStyle(lines: string[]): DialogueStyle {
    const dialogueLines: string[] = [];
    const characterSet = new Set<string>();

    lines.forEach(line => {
      // Match dialogue lines (Character: dialogue)
      const match = line.match(/^([A-Z\u4e00-\u9fa5]+)[：:]\s*(.+)/);
      if (match) {
        const [, character, dialogue] = match;
        characterSet.add(character);
        dialogueLines.push(dialogue.trim());
      }
    });

    if (dialogueLines.length === 0) {
      return {
        formalityLevel: 'mixed',
        averageLength: 0,
        commonPhrases: [],
        characterDistinction: false
      };
    }

    // Analyze formality
    const formalityLevel = this.analyzeFormalityLevel(dialogueLines);

    // Calculate average length
    const totalLength = dialogueLines.reduce((sum, d) => sum + d.length, 0);
    const averageLength = Math.round(totalLength / dialogueLines.length);

    // Extract common phrases
    const commonPhrases = this.extractCommonPhrases(dialogueLines);

    // Check if different characters have distinct speech patterns
    const characterDistinction = characterSet.size >= 3; // Simple heuristic

    return {
      formalityLevel,
      averageLength,
      commonPhrases,
      characterDistinction
    };
  }

  /**
   * Determines formality level of dialogue
   */
  private analyzeFormalityLevel(dialogueLines: string[]): 'formal' | 'casual' | 'mixed' {
    let formalCount = 0;
    let casualCount = 0;

    const formalIndicators = ['您', '请问', '敬请', '恭敬', '谨', '鄙人', '在下'];
    const casualIndicators = ['哥们', '老兄', '咱们', '俺', '哎呀', '喂', '嘿'];

    dialogueLines.forEach(line => {
      formalIndicators.forEach(indicator => {
        if (line.includes(indicator)) formalCount++;
      });
      casualIndicators.forEach(indicator => {
        if (line.includes(indicator)) casualCount++;
      });
    });

    if (formalCount > casualCount * 2) return 'formal';
    if (casualCount > formalCount * 2) return 'casual';
    return 'mixed';
  }

  /**
   * Extracts common phrases from dialogue
   */
  private extractCommonPhrases(dialogueLines: string[]): string[] {
    const phraseCounts: Record<string, number> = {};

    // Extract 2-4 character phrases
    dialogueLines.forEach(line => {
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= line.length - len; i++) {
          const phrase = line.substring(i, i + len);
          if (phrase.match(/^[\u4e00-\u9fa5]+$/)) { // Only Chinese phrases
            phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(phraseCounts)
      .filter(([, count]) => count >= 3) // Must appear at least 3 times
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([phrase]) => phrase);
  }

  /**
   * Analyzes narrative voice characteristics
   */
  private analyzeNarrativeVoice(lines: string[]): NarrativeVoice {
    // Filter non-dialogue lines for narrative analysis
    const narrativeLines = lines.filter(line => {
      return !line.match(/^([A-Z\u4e00-\u9fa5]+)[：:]\s*/) && line.trim().length > 0;
    });

    if (narrativeLines.length === 0) {
      return {
        perspective: '第三人称',
        tenseUsage: '过去时',
        descriptiveLevel: 'moderate'
      };
    }

    // Analyze perspective
    const perspective = this.analyzePerspective(narrativeLines);

    // Analyze tense
    const tenseUsage = this.analyzeTenseUsage(narrativeLines);

    // Analyze descriptive level
    const descriptiveLevel = this.analyzeDescriptiveLevel(narrativeLines);

    return {
      perspective,
      tenseUsage,
      descriptiveLevel
    };
  }

  /**
   * Determines narrative perspective
   */
  private analyzePerspective(narrativeLines: string[]): '第一人称' | '第三人称' | '混合' {
    let firstPerson = 0;
    let thirdPerson = 0;

    narrativeLines.forEach(line => {
      if (line.match(/我|我们|咱们/)) firstPerson++;
      if (line.match(/他|她|它|他们|她们/)) thirdPerson++;
    });

    if (firstPerson > thirdPerson * 2) return '第一人称';
    if (thirdPerson > firstPerson * 2) return '第三人称';
    return '混合';
  }

  /**
   * Determines tense usage
   */
  private analyzeTenseUsage(narrativeLines: string[]): '现在时' | '过去时' | '混合' {
    let presentTense = 0;
    let pastTense = 0;

    narrativeLines.forEach(line => {
      // Chinese doesn't have strict tenses, use aspect markers
      if (line.match(/着|正在|在/)) presentTense++;
      if (line.match(/了|过|曾经|已经/)) pastTense++;
    });

    if (presentTense > pastTense * 1.5) return '现在时';
    if (pastTense > presentTense * 1.5) return '过去时';
    return '混合';
  }

  /**
   * Determines level of descriptive detail
   */
  private analyzeDescriptiveLevel(narrativeLines: string[]): 'minimal' | 'moderate' | 'rich' {
    const avgLength = narrativeLines.reduce((sum, l) => sum + l.length, 0) / narrativeLines.length;

    // Count adjectives and adverbs
    let descriptiveWords = 0;
    const descriptivePatterns = [
      /[的地得]\s*[\u4e00-\u9fa5]{2,}/g,  // Modifiers
      /很|非常|特别|十分|极其|相当/g,      // Intensifiers
      /慢慢|缓缓|轻轻|悄悄|静静/g          // Manner adverbs
    ];

    narrativeLines.forEach(line => {
      descriptivePatterns.forEach(pattern => {
        const matches = line.match(pattern);
        descriptiveWords += matches ? matches.length : 0;
      });
    });

    const descriptiveRatio = descriptiveWords / narrativeLines.length;

    if (avgLength < 20 && descriptiveRatio < 0.5) return 'minimal';
    if (avgLength > 50 && descriptiveRatio > 2) return 'rich';
    return 'moderate';
  }

  /**
   * Analyzes pacing characteristics
   */
  private analyzePacing(lines: string[]): PacingProfile {
    // Identify scenes
    const scenes = this.identifyScenes(lines);
    const sceneCount = scenes.length;

    if (sceneCount === 0) {
      return {
        averageSceneLength: 0,
        actionDensity: 0,
        dialogueRatio: 0,
        descriptionRatio: 0
      };
    }

    // Calculate average scene length
    const totalLines = lines.length;
    const averageSceneLength = Math.round(totalLines / sceneCount);

    // Count action, dialogue, and description lines
    let actionLines = 0;
    let dialogueLines = 0;
    let descriptionLines = 0;

    lines.forEach(line => {
      if (line.match(/^([A-Z\u4e00-\u9fa5]+)[：:]/)) {
        dialogueLines++;
      } else if (line.match(/^[\u4e00-\u9fa5]+(走|跑|坐|站|拿|放|打|推|拉|开|关)/)) {
        actionLines++;
      } else if (line.trim().length > 0) {
        descriptionLines++;
      }
    });

    const totalContent = actionLines + dialogueLines + descriptionLines || 1;

    return {
      averageSceneLength,
      actionDensity: actionLines / sceneCount,
      dialogueRatio: dialogueLines / totalContent,
      descriptionRatio: descriptionLines / totalContent
    };
  }

  /**
   * Identifies scene boundaries
   */
  private identifyScenes(lines: string[]): number[] {
    const sceneIndices: number[] = [];
    const sceneMarkers = [
      /^场景/,
      /^SCENE/i,
      /^INT\./i,
      /^EXT\./i,
      /^INT\/EXT\./i
    ];

    lines.forEach((line, index) => {
      if (sceneMarkers.some(marker => marker.test(line.trim()))) {
        sceneIndices.push(index);
      }
    });

    return sceneIndices;
  }

  /**
   * Validates style profile completeness
   */
  validateProfile(profile: StyleProfile): boolean {
    if (!profile.tone || profile.tone.length === 0) return false;
    if (!profile.vocabulary || profile.vocabulary.length === 0) return false;
    if (!profile.sentencePatterns || profile.sentencePatterns.length === 0) return false;
    if (!profile.dialogueStyle) return false;
    if (!profile.narrativeVoice) return false;
    if (!profile.pacing) return false;

    return true;
  }
}

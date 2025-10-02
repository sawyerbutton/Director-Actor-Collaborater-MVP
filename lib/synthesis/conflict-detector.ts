/**
 * Epic 007: Conflict Detection System
 *
 * Identifies contradictions and conflicts between decisions from different acts
 * to ensure coherent synthesis.
 */

import { ActType } from '@prisma/client';
import {
  Conflict,
  ConflictType,
  ConflictSeverity,
  ConflictReport,
  ConflictResolution,
  ResolutionStrategy,
  SynthesisDecision,
  GroupedDecisions
} from '@/types/synthesis';

export class ConflictDetector {
  /**
   * Detects conflicts among all decisions
   */
  async detectConflicts(decisions: GroupedDecisions): Promise<ConflictReport> {
    const allDecisions = this.flattenDecisions(decisions);
    const conflicts: Conflict[] = [];

    // Pairwise conflict detection
    for (let i = 0; i < allDecisions.length; i++) {
      for (let j = i + 1; j < allDecisions.length; j++) {
        const conflict = await this.checkPairConflict(allDecisions[i], allDecisions[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Auto-resolve conflicts where possible
    const resolutions = await this.autoResolveConflicts(conflicts);
    const unresolvedConflicts = conflicts.filter(
      c => !resolutions.find(r => r.conflictId === c.id)
    );

    return {
      totalConflicts: conflicts.length,
      conflicts,
      resolutions,
      unresolvedConflicts
    };
  }

  /**
   * Flattens grouped decisions for analysis
   */
  private flattenDecisions(grouped: GroupedDecisions): Array<SynthesisDecision & { act: ActType, focusName: string }> {
    const flat: Array<SynthesisDecision & { act: ActType, focusName: string }> = [];

    for (const [key, group] of Object.entries(grouped)) {
      group.decisions.forEach(decision => {
        flat.push({
          ...decision,
          act: group.act,
          focusName: group.focusName
        });
      });
    }

    return flat;
  }

  /**
   * Checks for conflict between two decisions
   */
  private async checkPairConflict(
    d1: SynthesisDecision & { act: ActType, focusName: string },
    d2: SynthesisDecision & { act: ActType, focusName: string }
  ): Promise<Conflict | null> {
    // Character contradiction check
    const charConflict = this.checkCharacterContradiction(d1, d2);
    if (charConflict) return charConflict;

    // Timeline overlap check
    const timelineConflict = this.checkTimelineOverlap(d1, d2);
    if (timelineConflict) return timelineConflict;

    // Setting inconsistency check
    const settingConflict = this.checkSettingInconsistency(d1, d2);
    if (settingConflict) return settingConflict;

    // Plot conflict check
    const plotConflict = this.checkPlotConflict(d1, d2);
    if (plotConflict) return plotConflict;

    // Theme divergence check
    const themeConflict = this.checkThemeDivergence(d1, d2);
    if (themeConflict) return themeConflict;

    return null;
  }

  /**
   * Checks for character contradictions
   */
  private checkCharacterContradiction(
    d1: SynthesisDecision & { act: ActType, focusName: string },
    d2: SynthesisDecision & { act: ActType, focusName: string }
  ): Conflict | null {
    // Same character modified in different acts
    if (d1.focusName !== d2.focusName) {
      return null;
    }

    // ACT2 (character arc) vs ACT5 (theme/core beliefs)
    if ((d1.act === 'ACT2_CHARACTER' && d2.act === 'ACT5_THEME') ||
        (d1.act === 'ACT5_THEME' && d2.act === 'ACT2_CHARACTER')) {

      const act2Decision = d1.act === 'ACT2_CHARACTER' ? d1 : d2;
      const act5Decision = d1.act === 'ACT5_THEME' ? d1 : d2;

      // Check if character core beliefs contradict dramatic actions
      const act2Changes = act2Decision.generatedChanges;
      const act5Changes = act5Decision.generatedChanges;

      if (act2Changes?.dramaticActions && act5Changes?.characterCore) {
        const actions = act2Changes.dramaticActions.overallArc || '';
        const coreFear = act5Changes.characterCore.coreFear || '';
        const coreBelief = act5Changes.characterCore.coreBelief || '';

        // Simple heuristic: check for contradictory keywords
        if (this.containsContradiction(actions, `${coreFear} ${coreBelief}`)) {
          return {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'character_contradiction',
            severity: 'high',
            decision1: {
              id: d1.id,
              act: d1.act,
              focusName: d1.focusName
            },
            decision2: {
              id: d2.id,
              act: d2.act,
              focusName: d2.focusName
            },
            description: `角色 "${d1.focusName}" 的Act 2弧光设定与Act 5核心信念可能存在矛盾`,
            suggestedResolution: `优先保留Act 5的核心信念定义，调整Act 2的戏剧动作以符合角色深层动机`
          };
        }
      }
    }

    return null;
  }

  /**
   * Checks for timeline overlaps
   */
  private checkTimelineOverlap(
    d1: SynthesisDecision & { act: ActType, focusName: string },
    d2: SynthesisDecision & { act: ActType, focusName: string }
  ): Conflict | null {
    // ACT4 (pacing) might affect timeline
    if (d1.act !== 'ACT4_PACING' && d2.act !== 'ACT4_PACING') {
      return null;
    }

    const act4Decision = d1.act === 'ACT4_PACING' ? d1 : d2;
    const otherDecision = d1.act === 'ACT4_PACING' ? d2 : d1;

    const act4Changes = act4Decision.generatedChanges;
    if (!act4Changes?.restructureStrategy) {
      return null;
    }

    const affectedScenes = act4Changes.restructureStrategy.affectedScenes || [];

    // Check if other decision affects same scenes
    const otherScenes = this.extractAffectedScenes(otherDecision.generatedChanges);
    const overlap = affectedScenes.filter((scene: number) => otherScenes.includes(scene));

    if (overlap.length > 0) {
      return {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'timeline_overlap',
        severity: 'medium',
        decision1: {
          id: d1.id,
          act: d1.act,
          focusName: d1.focusName
        },
        decision2: {
          id: d2.id,
          act: d2.act,
          focusName: d2.focusName
        },
        description: `Act 4节奏调整与${otherDecision.act}的变更影响相同场景: ${overlap.join(', ')}`,
        suggestedResolution: `在合成时协调两个决策，确保场景变更一致`
      };
    }

    return null;
  }

  /**
   * Checks for setting inconsistencies
   */
  private checkSettingInconsistency(
    d1: SynthesisDecision & { act: ActType, focusName: string },
    d2: SynthesisDecision & { act: ActType, focusName: string }
  ): Conflict | null {
    // ACT3 (worldbuilding) vs other acts
    if (d1.act !== 'ACT3_WORLDBUILDING' && d2.act !== 'ACT3_WORLDBUILDING') {
      return null;
    }

    const act3Decision = d1.act === 'ACT3_WORLDBUILDING' ? d1 : d2;
    const otherDecision = d1.act === 'ACT3_WORLDBUILDING' ? d2 : d1;

    const act3Changes = act3Decision.generatedChanges;
    if (!act3Changes?.settingThemeAlignment) {
      return null;
    }

    // Check if world rules contradict with character actions (ACT2) or pacing changes (ACT4)
    if (otherDecision.act === 'ACT2_CHARACTER' || otherDecision.act === 'ACT4_PACING') {
      const coreCorrection = act3Changes.settingThemeAlignment.coreCorrection || '';
      const otherChangesStr = JSON.stringify(otherDecision.generatedChanges);

      if (this.containsContradiction(coreCorrection, otherChangesStr)) {
        return {
          id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'setting_inconsistency',
          severity: 'high',
          decision1: {
            id: d1.id,
            act: d1.act,
            focusName: d1.focusName
          },
          decision2: {
            id: d2.id,
            act: d2.act,
            focusName: d2.focusName
          },
          description: `Act 3世界规则修正与${otherDecision.act}的变更可能不兼容`,
          suggestedResolution: `优先保留Act 3的世界规则，调整其他决策以符合设定逻辑`
        };
      }
    }

    return null;
  }

  /**
   * Checks for plot conflicts
   */
  private checkPlotConflict(
    d1: SynthesisDecision & { act: ActType, focusName: string },
    d2: SynthesisDecision & { act: ActType, focusName: string }
  ): Conflict | null {
    // Check if multiple acts modify plot structure
    if (d1.act === 'ACT2_CHARACTER' && d2.act === 'ACT4_PACING') {
      // Character arc changes might conflict with pacing restructure
      const act2Changes = d1.generatedChanges;
      const act4Changes = d2.generatedChanges;

      if (act2Changes?.dramaticActions && act4Changes?.restructureStrategy) {
        const act2Scenes = this.extractAffectedScenes(act2Changes);
        const act4Scenes = act4Changes.restructureStrategy.affectedScenes || [];

        const overlap = act2Scenes.filter(scene => act4Scenes.includes(scene));

        if (overlap.length > 2) { // Significant overlap
          return {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'plot_conflict',
            severity: 'medium',
            decision1: {
              id: d1.id,
              act: d1.act,
              focusName: d1.focusName
            },
            decision2: {
              id: d2.id,
              act: d2.act,
              focusName: d2.focusName
            },
            description: `角色弧光修改与节奏重组都影响场景 ${overlap.join(', ')}`,
            suggestedResolution: `合并两个决策的场景变更，确保角色发展和节奏优化协调一致`
          };
        }
      }
    }

    return null;
  }

  /**
   * Checks for theme divergence
   */
  private checkThemeDivergence(
    d1: SynthesisDecision & { act: ActType, focusName: string },
    d2: SynthesisDecision & { act: ActType, focusName: string }
  ): Conflict | null {
    // ACT5 (theme) should align with all other acts
    if (d1.act !== 'ACT5_THEME' && d2.act !== 'ACT5_THEME') {
      return null;
    }

    const act5Decision = d1.act === 'ACT5_THEME' ? d1 : d2;
    const otherDecision = d1.act === 'ACT5_THEME' ? d2 : d1;

    const act5Changes = act5Decision.generatedChanges;
    if (!act5Changes?.characterCore) {
      return null;
    }

    // Check if theme enhancement contradicts other changes
    const coreFear = act5Changes.characterCore.coreFear || '';
    const coreBelief = act5Changes.characterCore.coreBelief || '';
    const otherChangesStr = JSON.stringify(otherDecision.generatedChanges);

    if (this.containsContradiction(`${coreFear} ${coreBelief}`, otherChangesStr)) {
      return {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'theme_divergence',
        severity: 'low', // Usually low because theme is layered on top
        decision1: {
          id: d1.id,
          act: d1.act,
          focusName: d1.focusName
        },
        decision2: {
          id: d2.id,
          act: d2.act,
          focusName: d2.focusName
        },
        description: `角色 "${act5Decision.focusName}" 的主题定义与${otherDecision.act}的变更存在轻微分歧`,
        suggestedResolution: `保留Act 5的主题深化，微调其他决策以强化主题表达`
      };
    }

    return null;
  }

  /**
   * Auto-resolves conflicts where possible
   */
  private async autoResolveConflicts(conflicts: Conflict[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution = this.attemptAutoResolution(conflict);
      if (resolution) {
        resolutions.push(resolution);
      }
    }

    return resolutions;
  }

  /**
   * Attempts to auto-resolve a single conflict
   */
  private attemptAutoResolution(conflict: Conflict): ConflictResolution | null {
    let strategy: ResolutionStrategy;
    let confidence: number;

    switch (conflict.type) {
      case 'character_contradiction':
        // ACT5 (theme) takes precedence over ACT2 (character arc)
        if (conflict.decision1.act === 'ACT5_THEME' || conflict.decision2.act === 'ACT5_THEME') {
          strategy = 'prioritize_by_severity';
          confidence = 0.8;
        } else {
          strategy = 'manual_review_required';
          confidence = 0.0;
          return null; // Can't auto-resolve
        }
        break;

      case 'timeline_overlap':
        // Try to merge if both affect same scenes
        strategy = 'merge_compatible';
        confidence = 0.7;
        break;

      case 'setting_inconsistency':
        // ACT3 (worldbuilding) takes precedence
        strategy = 'prioritize_by_severity';
        confidence = 0.85;
        break;

      case 'plot_conflict':
        // Requires manual review for plot structure changes
        strategy = 'manual_review_required';
        confidence = 0.0;
        return null;

      case 'theme_divergence':
        // ACT5 theme enhancement usually compatible
        strategy = 'auto_reconcile';
        confidence = 0.9;
        break;

      default:
        return null;
    }

    return {
      conflictId: conflict.id,
      strategy,
      appliedChanges: [conflict.decision1.id, conflict.decision2.id],
      confidence,
      manual: false
    };
  }

  /**
   * Extracts affected scene numbers from changes
   */
  private extractAffectedScenes(changes: any): number[] {
    const scenes: number[] = [];

    if (!changes) return scenes;

    // Extract from ACT2 dramatic actions
    if (changes.dramaticActions?.actions) {
      changes.dramaticActions.actions.forEach((action: any) => {
        if (action.sceneNumber) {
          scenes.push(action.sceneNumber);
        }
      });
    }

    // Extract from ACT4 restructure strategy
    if (changes.restructureStrategy?.affectedScenes) {
      scenes.push(...changes.restructureStrategy.affectedScenes);
    }

    return [...new Set(scenes)]; // Deduplicate
  }

  /**
   * Simple contradiction detection using keywords
   */
  private containsContradiction(text1: string, text2: string): boolean {
    const contradictionPairs = [
      ['勇敢', '胆怯'],
      ['诚实', '撒谎'],
      ['信任', '怀疑'],
      ['爱', '恨'],
      ['希望', '绝望'],
      ['团结', '分裂'],
      ['成功', '失败'],
      ['光明', '黑暗'],
      ['正义', '邪恶'],
      ['真相', '谎言']
    ];

    const lower1 = text1.toLowerCase();
    const lower2 = text2.toLowerCase();

    for (const [word1, word2] of contradictionPairs) {
      if ((lower1.includes(word1) && lower2.includes(word2)) ||
          (lower1.includes(word2) && lower2.includes(word1))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validates conflict report
   */
  validateReport(report: ConflictReport): boolean {
    if (report.totalConflicts !== report.conflicts.length) {
      return false;
    }

    const resolvedIds = new Set(report.resolutions.map(r => r.conflictId));
    const unresolvedIds = new Set(report.unresolvedConflicts.map(c => c.id));

    // Check that resolved and unresolved don't overlap
    for (const id of resolvedIds) {
      if (unresolvedIds.has(id)) {
        return false;
      }
    }

    return true;
  }
}

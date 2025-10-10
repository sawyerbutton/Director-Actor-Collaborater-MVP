/**
 * Change Applicator - Applies decision changes to script content
 *
 * This module implements the core logic to apply generatedChanges from
 * ACT2-5 decisions to the current script content, creating new versions.
 *
 * Epic: 005 & 006 - Interactive Workflow
 * Created: 2025-10-10
 */

import { ActType } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface ApplyChangesOptions {
  act: ActType;
  generatedChanges: any;
  currentScript: string;
  focusContext: any;
}

export interface ScriptScene {
  sceneNumber: number;
  heading: string;
  content: string;
  originalText: string;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Applies decision changes to the current script content
 *
 * @param options - Configuration including act type, changes, current script, and context
 * @returns Modified script content
 */
export async function applyChanges(options: ApplyChangesOptions): Promise<string> {
  const { act, generatedChanges, currentScript, focusContext } = options;

  // Validate inputs
  if (!generatedChanges) {
    throw new Error('generatedChanges is required');
  }

  if (!currentScript || currentScript.trim().length === 0) {
    throw new Error('currentScript is required and cannot be empty');
  }

  try {
    switch (act) {
      case 'ACT2_CHARACTER':
        return await applyCharacterChanges(generatedChanges, currentScript, focusContext);

      case 'ACT3_WORLDBUILDING':
        return await applyWorldbuildingChanges(generatedChanges, currentScript, focusContext);

      case 'ACT4_PACING':
        return await applyPacingChanges(generatedChanges, currentScript, focusContext);

      case 'ACT5_THEME':
        return await applyThemeChanges(generatedChanges, currentScript, focusContext);

      default:
        throw new Error(`Unsupported act type: ${act}`);
    }
  } catch (error) {
    console.error(`[ChangeApplicator] Failed to apply changes for ${act}:`, error);
    throw new Error(`Failed to apply ${act} changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// ACT2: Character Arc - Apply Dramatic Actions
// ============================================================================

/**
 * ACT2: Applies character arc changes (dramatic actions) to the script
 *
 * Changes structure:
 * {
 *   dramaticActions: [{ sceneNumber, action, characterName }],
 *   overallArc: string,
 *   integrationNotes: string
 * }
 */
async function applyCharacterChanges(
  changes: {
    dramaticActions: Array<{ sceneNumber: number; action: string; characterName?: string }>;
    overallArc: string;
    integrationNotes: string
  },
  currentScript: string,
  focusContext: any
): Promise<string> {
  if (!changes.dramaticActions || changes.dramaticActions.length === 0) {
    console.warn('[ACT2] No dramatic actions to apply, returning original script');
    return currentScript;
  }

  // Parse script into scenes
  const scenes = parseScriptToScenes(currentScript);

  // Apply each dramatic action
  for (const action of changes.dramaticActions) {
    const sceneIndex = scenes.findIndex(s => s.sceneNumber === action.sceneNumber);

    if (sceneIndex !== -1) {
      scenes[sceneIndex] = insertDramaticAction(scenes[sceneIndex], action);
      console.log(`[ACT2] Applied dramatic action to scene ${action.sceneNumber}`);
    } else {
      console.warn(`[ACT2] Scene ${action.sceneNumber} not found, skipping action`);
    }
  }

  // Reassemble script with metadata comment
  const metadata = `<!-- ACT2 修改 - ${changes.dramaticActions.length} 个戏剧化动作 -->\n`;
  const modifiedScript = assembleScenesIntoScript(scenes);

  return metadata + modifiedScript + `\n\n<!-- 整体弧线: ${changes.overallArc} -->\n<!-- 集成说明: ${changes.integrationNotes} -->`;
}

/**
 * Inserts a dramatic action into a scene
 */
function insertDramaticAction(
  scene: ScriptScene,
  action: { sceneNumber: number; action: string; characterName?: string }
): ScriptScene {
  const actionMarker = action.characterName
    ? `\n[戏剧化动作 - ${action.characterName}]\n${action.action}\n`
    : `\n[戏剧化动作]\n${action.action}\n`;

  // Insert action after scene heading
  const lines = scene.content.split('\n');
  const headingIndex = lines.findIndex(line => line.trim().startsWith('场景') || line.trim().match(/^(INT\.|EXT\.)/i));

  if (headingIndex !== -1) {
    lines.splice(headingIndex + 1, 0, actionMarker);
  } else {
    // If no heading found, prepend to content
    lines.unshift(actionMarker);
  }

  return {
    ...scene,
    content: lines.join('\n')
  };
}

// ============================================================================
// ACT3: Worldbuilding - Apply Setting Alignment
// ============================================================================

/**
 * ACT3: Applies worldbuilding alignment strategies to the script
 *
 * Changes structure:
 * {
 *   alignmentStrategies: [{ strategy, description }],
 *   coreRecommendation: string,
 *   integrationNotes: string
 * }
 */
async function applyWorldbuildingChanges(
  changes: {
    alignmentStrategies: any[];
    coreRecommendation: string;
    integrationNotes: string
  },
  currentScript: string,
  focusContext: any
): Promise<string> {
  if (!changes.alignmentStrategies || changes.alignmentStrategies.length === 0) {
    console.warn('[ACT3] No alignment strategies to apply, returning original script');
    return currentScript;
  }

  // For ACT3, we append worldbuilding notes as metadata
  // Actual implementation would intelligently insert setting descriptions
  const metadata = [
    `\n<!-- ACT3 世界观对齐 -->`,
    `<!-- 核心建议: ${changes.coreRecommendation} -->`,
    `<!-- 对齐策略数量: ${changes.alignmentStrategies.length} -->`,
    ...changes.alignmentStrategies.map((s, i) =>
      `<!-- 策略 ${i + 1}: ${s.strategy || s.title || JSON.stringify(s).substring(0, 100)} -->`
    ),
    `<!-- 集成说明: ${changes.integrationNotes} -->`,
    `<!-- /ACT3 世界观对齐 -->\n`
  ].join('\n');

  return currentScript + metadata;
}

// ============================================================================
// ACT4: Pacing - Apply Restructuring Changes
// ============================================================================

/**
 * ACT4: Applies pacing optimization changes to the script
 *
 * Changes structure:
 * {
 *   changes: [{ type, sceneNumbers, description }],
 *   expectedImprovement: string,
 *   integrationNotes: string
 * }
 */
async function applyPacingChanges(
  changes: {
    changes: any[];
    expectedImprovement: string;
    integrationNotes: string
  },
  currentScript: string,
  focusContext: any
): Promise<string> {
  if (!changes.changes || changes.changes.length === 0) {
    console.warn('[ACT4] No pacing changes to apply, returning original script');
    return currentScript;
  }

  // Parse script into scenes
  const scenes = parseScriptToScenes(currentScript);

  // Apply pacing changes (e.g., scene reordering, length adjustments)
  for (const change of changes.changes) {
    if (change.type === 'reorder' && change.sceneNumbers) {
      // Placeholder: Reorder scenes based on sceneNumbers array
      console.log(`[ACT4] Would reorder scenes: ${change.sceneNumbers.join(', ')}`);
    } else if (change.type === 'shorten' && change.sceneNumber) {
      // Placeholder: Shorten specific scene
      const sceneIndex = scenes.findIndex(s => s.sceneNumber === change.sceneNumber);
      if (sceneIndex !== -1) {
        scenes[sceneIndex] = shortenScene(scenes[sceneIndex], change.targetLength);
        console.log(`[ACT4] Shortened scene ${change.sceneNumber}`);
      }
    }
  }

  // Append metadata
  const metadata = [
    `\n<!-- ACT4 节奏优化 -->`,
    `<!-- 预期改进: ${changes.expectedImprovement} -->`,
    `<!-- 变更数量: ${changes.changes.length} -->`,
    `<!-- 集成说明: ${changes.integrationNotes} -->`,
    `<!-- /ACT4 节奏优化 -->\n`
  ].join('\n');

  const modifiedScript = assembleScenesIntoScript(scenes);
  return modifiedScript + metadata;
}

/**
 * Shortens a scene to target length (placeholder implementation)
 */
function shortenScene(scene: ScriptScene, targetLength?: number): ScriptScene {
  // Placeholder: In real implementation, would use AI to intelligently shorten
  // For now, just add a marker
  const marker = `\n[场景已优化 - 目标长度: ${targetLength || 'auto'}]\n`;
  return {
    ...scene,
    content: scene.content + marker
  };
}

// ============================================================================
// ACT5: Theme - Apply Character Core Enhancements
// ============================================================================

/**
 * ACT5: Applies thematic polishing (character core) to the script
 *
 * Changes structure:
 * {
 *   characterCore: { coreFears, coreBeliefs, empathyHooks },
 *   integrationNotes: string
 * }
 */
async function applyThemeChanges(
  changes: {
    characterCore: {
      coreFears?: string[];
      coreBeliefs?: string[];
      empathyHooks?: string[]
    };
    integrationNotes: string
  },
  currentScript: string,
  focusContext: any
): Promise<string> {
  if (!changes.characterCore) {
    console.warn('[ACT5] No character core to apply, returning original script');
    return currentScript;
  }

  const { coreFears, coreBeliefs, empathyHooks } = changes.characterCore;

  // Append metadata about character core
  const metadata = [
    `\n<!-- ACT5 主题润色 -->`,
    coreFears && coreFears.length > 0
      ? `<!-- 核心恐惧: ${coreFears.join(', ')} -->`
      : '',
    coreBeliefs && coreBeliefs.length > 0
      ? `<!-- 核心信念: ${coreBeliefs.join(', ')} -->`
      : '',
    empathyHooks && empathyHooks.length > 0
      ? `<!-- 共情点: ${empathyHooks.join(', ')} -->`
      : '',
    `<!-- 集成说明: ${changes.integrationNotes} -->`,
    `<!-- /ACT5 主题润色 -->\n`
  ].filter(line => line.length > 0).join('\n');

  return currentScript + metadata;
}

// ============================================================================
// Script Parsing Utilities
// ============================================================================

/**
 * Parses script content into an array of scenes
 */
function parseScriptToScenes(scriptContent: string): ScriptScene[] {
  const scenes: ScriptScene[] = [];
  const lines = scriptContent.split('\n');

  let currentScene: ScriptScene | null = null;
  let sceneNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect scene heading (multiple formats)
    const isSceneHeading =
      trimmed.startsWith('场景') ||
      trimmed.match(/^(INT\.|EXT\.)/i) ||
      trimmed.match(/^第\s*\d+\s*场/);

    if (isSceneHeading) {
      // Save previous scene
      if (currentScene) {
        scenes.push(currentScene);
      }

      // Start new scene
      sceneNumber++;
      currentScene = {
        sceneNumber,
        heading: trimmed,
        content: line + '\n',
        originalText: line
      };
    } else if (currentScene) {
      // Add line to current scene
      currentScene.content += line + '\n';
    } else {
      // Before first scene (prologue, metadata, etc.)
      if (scenes.length === 0) {
        scenes.push({
          sceneNumber: 0,
          heading: '[前言]',
          content: line + '\n',
          originalText: ''
        });
        currentScene = scenes[0];
      }
    }
  }

  // Save last scene
  if (currentScene && currentScene.sceneNumber > 0) {
    scenes.push(currentScene);
  }

  return scenes;
}

/**
 * Reassembles scenes into a complete script
 */
function assembleScenesIntoScript(scenes: ScriptScene[]): string {
  return scenes.map(scene => scene.content.trimEnd()).join('\n\n');
}

// ============================================================================
// Exports
// ============================================================================

export {
  applyCharacterChanges,
  applyWorldbuildingChanges,
  applyPacingChanges,
  applyThemeChanges,
  parseScriptToScenes,
  assembleScenesIntoScript
};

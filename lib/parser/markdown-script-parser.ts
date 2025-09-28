import { ParsedScript, Scene, Character, Dialogue, Action } from '@/types/script';

interface MarkdownElement {
  type: 'scene' | 'character' | 'dialogue' | 'action' | 'description' | 'transition';
  content: string;
  lineNumber: number;
  metadata?: Record<string, any>;
}

interface SceneInfo {
  index: number;
  title: string;
  location: string;
  time: string;
  setting: 'INT' | 'EXT' | '';
}

export class MarkdownScriptParser {
  private patterns = {
    // # 场景 1 - 内景 - 咖啡店 - 日
    sceneZh: /^#\s+场景\s+(\d+)\s*[-–]\s*(.*)$/,
    // # SCENE 1 - INT - COFFEE SHOP - DAY
    sceneEn: /^#\s+(?:SCENE|Scene)\s+(\d+)\s*[-–]\s*(.*)$/i,
    // **角色名**: 对话内容
    character: /^\*\*([^:*]+)\*\*:\s*/,
    // *(动作描述)*
    action: /^\*\((.*?)\)\*$/,
    // ## 转场 or ## CUT TO
    transition: /^##\s+(.+)$/,
    // 检测内景/外景
    location: /^(内景|外景|INT|EXT|内|外)\s*[-–.]?\s*(.+)$/i
  };

  parse(markdown: string): ParsedScript {
    try {
      const lines = markdown.split('\n');
      const elements = this.extractElements(lines);
      return this.buildScriptStructure(elements);
    } catch (error) {
      return this.createErrorScript(markdown, error as Error);
    }
  }

  private extractElements(lines: string[]): MarkdownElement[] {
    const elements: MarkdownElement[] = [];
    let currentScene: MarkdownElement | null = null;
    let pendingDialogue: { character: string; lines: string[]; lineNumber: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const lineNumber = i + 1;

      // Skip empty lines
      if (!trimmedLine) {
        // If we have pending dialogue, empty line might end it
        if (pendingDialogue && pendingDialogue.lines.length > 0) {
          elements.push({
            type: 'dialogue',
            content: pendingDialogue.lines.join('\n'),
            lineNumber: pendingDialogue.lineNumber,
            metadata: { character: pendingDialogue.character }
          });
          pendingDialogue = null;
        }
        continue;
      }

      // Check for scene heading (Chinese)
      const sceneZhMatch = trimmedLine.match(this.patterns.sceneZh);
      if (sceneZhMatch) {
        // Save pending dialogue
        if (pendingDialogue && pendingDialogue.lines.length > 0) {
          elements.push({
            type: 'dialogue',
            content: pendingDialogue.lines.join('\n'),
            lineNumber: pendingDialogue.lineNumber,
            metadata: { character: pendingDialogue.character }
          });
          pendingDialogue = null;
        }

        currentScene = {
          type: 'scene',
          content: trimmedLine,
          lineNumber,
          metadata: {
            index: parseInt(sceneZhMatch[1]),
            title: sceneZhMatch[2]
          }
        };
        elements.push(currentScene);
        continue;
      }

      // Check for scene heading (English)
      const sceneEnMatch = trimmedLine.match(this.patterns.sceneEn);
      if (sceneEnMatch) {
        // Save pending dialogue
        if (pendingDialogue && pendingDialogue.lines.length > 0) {
          elements.push({
            type: 'dialogue',
            content: pendingDialogue.lines.join('\n'),
            lineNumber: pendingDialogue.lineNumber,
            metadata: { character: pendingDialogue.character }
          });
          pendingDialogue = null;
        }

        currentScene = {
          type: 'scene',
          content: trimmedLine,
          lineNumber,
          metadata: {
            index: parseInt(sceneEnMatch[1]),
            title: sceneEnMatch[2]
          }
        };
        elements.push(currentScene);
        continue;
      }

      // Check for character dialogue
      const characterMatch = trimmedLine.match(this.patterns.character);
      if (characterMatch) {
        // Save any pending dialogue first
        if (pendingDialogue && pendingDialogue.lines.length > 0) {
          elements.push({
            type: 'dialogue',
            content: pendingDialogue.lines.join('\n'),
            lineNumber: pendingDialogue.lineNumber,
            metadata: { character: pendingDialogue.character }
          });
        }

        const character = characterMatch[1].trim();
        const dialogueStart = trimmedLine.substring(characterMatch[0].length);

        pendingDialogue = {
          character,
          lines: dialogueStart ? [dialogueStart] : [],
          lineNumber
        };
        continue;
      }

      // Check for action/stage direction
      const actionMatch = trimmedLine.match(this.patterns.action);
      if (actionMatch) {
        // Save pending dialogue
        if (pendingDialogue && pendingDialogue.lines.length > 0) {
          elements.push({
            type: 'dialogue',
            content: pendingDialogue.lines.join('\n'),
            lineNumber: pendingDialogue.lineNumber,
            metadata: { character: pendingDialogue.character }
          });
          pendingDialogue = null;
        }

        elements.push({
          type: 'action',
          content: actionMatch[1],
          lineNumber
        });
        continue;
      }

      // Check for transition
      const transitionMatch = trimmedLine.match(this.patterns.transition);
      if (transitionMatch) {
        // Save pending dialogue
        if (pendingDialogue && pendingDialogue.lines.length > 0) {
          elements.push({
            type: 'dialogue',
            content: pendingDialogue.lines.join('\n'),
            lineNumber: pendingDialogue.lineNumber,
            metadata: { character: pendingDialogue.character }
          });
          pendingDialogue = null;
        }

        elements.push({
          type: 'transition',
          content: transitionMatch[1],
          lineNumber
        });
        continue;
      }

      // If we have a pending dialogue, this line continues it
      if (pendingDialogue) {
        pendingDialogue.lines.push(trimmedLine);
      } else {
        // Otherwise, it's a description
        elements.push({
          type: 'description',
          content: trimmedLine,
          lineNumber
        });
      }
    }

    // Don't forget the last pending dialogue
    if (pendingDialogue && pendingDialogue.lines.length > 0) {
      elements.push({
        type: 'dialogue',
        content: pendingDialogue.lines.join('\n'),
        lineNumber: pendingDialogue.lineNumber,
        metadata: { character: pendingDialogue.character }
      });
    }

    return elements;
  }

  private buildScriptStructure(elements: MarkdownElement[]): ParsedScript {
    const scenes: Scene[] = [];
    const characters = new Map<string, Character>();
    const dialogues: Dialogue[] = [];
    const actions: Action[] = [];

    let currentScene: Scene | null = null;
    let currentSceneElements: MarkdownElement[] = [];
    let dialogueIdCounter = 0;
    let actionIdCounter = 0;

    for (const element of elements) {
      if (element.type === 'scene') {
        // Process previous scene
        if (currentScene && currentSceneElements.length > 0) {
          this.processSceneElements(
            currentScene,
            currentSceneElements,
            characters,
            dialogues,
            actions,
            dialogueIdCounter,
            actionIdCounter
          );
          dialogueIdCounter = dialogues.length;
          actionIdCounter = actions.length;
        }

        // Parse scene info
        const sceneInfo = this.parseSceneHeading(
          element.metadata?.title || '',
          element.metadata?.index || scenes.length + 1
        );

        currentScene = {
          id: `scene-${sceneInfo.index}`,
          index: sceneInfo.index,
          title: sceneInfo.title,
          location: sceneInfo.location,
          timeOfDay: sceneInfo.time,
          description: '',
          characters: [],
          dialogues: [],
          actions: []
        };

        scenes.push(currentScene);
        currentSceneElements = [];
      } else {
        currentSceneElements.push(element);
      }
    }

    // Process last scene
    if (currentScene && currentSceneElements.length > 0) {
      this.processSceneElements(
        currentScene,
        currentSceneElements,
        characters,
        dialogues,
        actions,
        dialogueIdCounter,
        actionIdCounter
      );
    }

    return {
      metadata: {
        parseVersion: '1.0.0',
        parseTime: new Date(),
        language: 'mixed' as const,
        originalLength: elements.reduce((sum, el) => sum + el.content.length, 0)
      },
      scenes,
      characters: Array.from(characters.values()),
      dialogues,
      actions,
      totalDialogues: dialogues.length,
      totalActions: actions.length,
      errors: []
    };
  }

  private processSceneElements(
    scene: Scene,
    elements: MarkdownElement[],
    characters: Map<string, Character>,
    dialogues: Dialogue[],
    actions: Action[],
    dialogueIdStart: number,
    actionIdStart: number
  ): void {
    const descriptions: string[] = [];

    for (const element of elements) {
      switch (element.type) {
        case 'dialogue': {
          const characterName = this.normalizeCharacterName(
            element.metadata?.character || 'UNKNOWN'
          );

          // Update or create character
          if (!characters.has(characterName)) {
            characters.set(characterName, {
              id: `char-${characterName.toLowerCase().replace(/\s+/g, '-')}`,
              name: characterName,
              aliases: [],
              dialogueCount: 0,
              scenes: [],
              firstAppearance: {
                sceneId: scene.id,
                lineNumber: element.lineNumber
              }
            });
          }

          const character = characters.get(characterName)!;
          character.dialogueCount++;
          if (!character.scenes.includes(scene.id)) {
            character.scenes.push(scene.id);
          }

          // Create dialogue
          const dialogueId = `dialogue-${dialogues.length + 1}`;
          const newDialogue: Dialogue = {
            id: dialogueId,
            characterId: character.id,
            characterName: character.name,
            content: element.content,
            sceneId: scene.id,
            lineNumber: element.lineNumber
          };
          dialogues.push(newDialogue);

          scene.dialogues.push(newDialogue);
          break;
        }

        case 'action': {
          const actionId = `action-${actions.length + 1}`;
          const newAction: Action = {
            id: actionId,
            sceneId: scene.id,
            description: element.content,
            lineNumber: element.lineNumber
          };
          actions.push(newAction);

          scene.actions.push(newAction);
          break;
        }

        case 'description':
          descriptions.push(element.content);
          break;

        case 'transition':
          // Add as a special action
          const transitionId = `action-${actions.length + 1}`;
          const transitionAction: Action = {
            id: transitionId,
            sceneId: scene.id,
            description: `[转场: ${element.content}]`,
            type: 'transition' as const,
            lineNumber: element.lineNumber
          };
          actions.push(transitionAction);
          scene.actions.push(transitionAction);
          break;
      }
    }

    if (descriptions.length > 0) {
      scene.description = descriptions.join('\n');
    }
  }

  private parseSceneHeading(heading: string, defaultIndex: number): SceneInfo {
    const parts = heading.split(/[-–]/);
    let location = '';
    let time = '';
    let setting: 'INT' | 'EXT' | '' = '';

    for (const part of parts) {
      const trimmed = part.trim();

      // Check for location setting (INT/EXT)
      const locationMatch = trimmed.match(this.patterns.location);
      if (locationMatch) {
        const settingText = locationMatch[1].toUpperCase();
        if (settingText === '内景' || settingText === '内' || settingText === 'INT') {
          setting = 'INT';
        } else if (settingText === '外景' || settingText === '外' || settingText === 'EXT') {
          setting = 'EXT';
        }
        location = locationMatch[2].trim();
      } else if (this.isTimeIndicator(trimmed)) {
        time = trimmed;
      } else if (!location) {
        location = trimmed;
      }
    }

    const fullHeading = heading || `场景 ${defaultIndex}`;

    return {
      index: defaultIndex,
      title: fullHeading,
      location: location || '未指定地点',
      time: time || '未指定时间',
      setting
    };
  }

  private isTimeIndicator(text: string): boolean {
    const timePatterns = [
      /^(日|夜|晨|晚|黄昏|黎明|午后|凌晨|深夜)$/,
      /^(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|AFTERNOON|CONTINUOUS)$/i,
      /\d{1,2}:\d{2}/,
      /\d{1,2}点/
    ];

    return timePatterns.some(pattern => pattern.test(text.trim()));
  }

  private normalizeCharacterName(name: string): string {
    // Convert to uppercase and trim
    return name.toUpperCase().trim()
      .replace(/\s+/g, ' ')  // Normalize spaces
      .replace(/[''""`]/g, ''); // Remove quotes
  }

  private createErrorScript(originalText: string, error: Error): ParsedScript {
    return {
      metadata: {
        parseVersion: '1.0.0',
        parseTime: new Date(),
        language: 'mixed' as const,
        originalLength: originalText.length
      },
      scenes: [],
      characters: [],
      dialogues: [],
      actions: [],
      totalDialogues: 0,
      totalActions: 0,
      errors: [{
        type: 'error',
        message: `Markdown解析失败: ${error.message}`,
        lineNumber: 1
      }]
    };
  }
}
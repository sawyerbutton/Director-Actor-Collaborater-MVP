import { MarkdownScriptParser } from '../markdown-script-parser';
import { MarkdownScriptValidator } from '../validators/markdown-validator';
import { ParsedScript } from '@/types/script';

export class MarkdownToScriptConverter {
  private parser: MarkdownScriptParser;
  private validator: MarkdownScriptValidator;

  constructor() {
    this.parser = new MarkdownScriptParser();
    this.validator = new MarkdownScriptValidator();
  }

  /**
   * Convert Markdown content to ParsedScript format
   */
  convert(markdownContent: string): ParsedScript {
    // Validate the markdown first
    const validation = this.validator.validate(markdownContent);

    if (!validation.valid) {
      return this.createErrorScript(
        markdownContent,
        validation.errors.map(e => e.message).join('; ')
      );
    }

    // Parse the markdown
    const parsedScript = this.parser.parse(markdownContent);

    // Add validation warnings as non-critical errors
    if (validation.warnings.length > 0) {
      parsedScript.errors = parsedScript.errors || [];
      validation.warnings.forEach(warning => {
        parsedScript.errors!.push({
          type: 'warning',
          message: warning.message,
          lineNumber: warning.lineNumber || 0
        });
      });
    }

    return parsedScript;
  }

  /**
   * Convert ParsedScript back to Markdown format
   */
  async toMarkdown(script: ParsedScript): Promise<string> {
    const lines: string[] = [];

    for (const scene of script.scenes) {
      // Add scene heading
      lines.push(`# 场景 ${scene.index} - ${scene.title}`);
      lines.push('');

      // Add scene description
      if (scene.description) {
        lines.push(scene.description);
        lines.push('');
      }

      // Add dialogues and actions
      const elements: Array<{ type: 'dialogue' | 'action'; content: any; order: number }> = [];

      // Collect dialogues from scene
      scene.dialogues.forEach((dialogue, index) => {
        const character = script.characters.find(c => c.id === dialogue.characterId);
        elements.push({
          type: 'dialogue',
          content: { character: dialogue.characterName || character?.name || 'UNKNOWN', text: dialogue.content },
          order: dialogue.lineNumber || index
        });
      });

      // Collect actions from scene
      if (scene.actions) {
        scene.actions.forEach((action, index) => {
          elements.push({
            type: 'action',
            content: action.description,
            order: action.lineNumber || index + 1000 // Put actions after dialogues if no line number
          });
        });
      }

      // Sort by order/line number
      elements.sort((a, b) => a.order - b.order);

      // Output elements
      for (const element of elements) {
        if (element.type === 'dialogue') {
          lines.push(`**${element.content.character}**: ${element.content.text}`);
        } else if (element.type === 'action') {
          // Check if it's a transition
          if (element.content.startsWith('[转场:')) {
            const transition = element.content.replace(/^\[转场:\s*|\]$/g, '');
            lines.push(`## ${transition}`);
          } else {
            lines.push(`*(${element.content})*`);
          }
        }
        lines.push('');
      }

      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Get a sample Markdown script template
   */
  getTemplate(): string {
    return `# 场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往，午后的阳光透过窗户洒在木质桌面上。

**服务员**: 欢迎光临！请问需要点什么？

**顾客**: 一杯拿铁，谢谢。

*(服务员微笑着记下订单)*

**服务员**: 好的，请稍等。

## 淡出

# 场景 2 - 外景 - 街道 - 夜

繁忙的街道上，霓虹灯闪烁。

**路人甲**: 这个城市从不睡觉。

*(镜头缓缓拉远，城市夜景尽收眼底)*`;
  }

  /**
   * Validate if a file is valid Markdown script
   */
  isValidMarkdownScript(content: string): boolean {
    const validation = this.validator.validate(content);
    return validation.valid && validation.errors.length === 0;
  }

  private createErrorScript(originalText: string, errorMessage: string): ParsedScript {
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
        message: errorMessage,
        lineNumber: 1
      }]
    };
  }
}
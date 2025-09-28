export interface ValidationError {
  type: 'MISSING_SCENES' | 'INVALID_FORMAT' | 'ENCODING_ERROR';
  message: string;
  lineNumber?: number;
}

export interface ValidationWarning {
  type: 'NO_DIALOGUE' | 'DUPLICATE_SCENE' | 'MISSING_TIME' | 'MISSING_LOCATION';
  message: string;
  lineNumber?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class MarkdownScriptValidator {
  private scenePatterns = {
    zh: /^#\s+场景\s+\d+/m,
    en: /^#\s+(?:SCENE|Scene)\s+\d+/im
  };

  private dialoguePattern = /^\*\*[^:*]+\*\*:/m;

  validate(markdown: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!markdown || markdown.trim().length === 0) {
      errors.push({
        type: 'INVALID_FORMAT',
        message: 'Markdown内容为空'
      });
      return { valid: false, errors, warnings };
    }

    // Check for scenes
    if (!this.hasSceneHeadings(markdown)) {
      errors.push({
        type: 'MISSING_SCENES',
        message: '未找到场景标记。请使用 "# 场景 N" 或 "# SCENE N" 格式'
      });
    }

    // Check dialogue format
    this.checkDialogueFormat(markdown, errors, warnings);

    // Check for duplicate scene numbers
    this.checkDuplicateScenes(markdown, warnings);

    // Check scene completeness
    this.checkSceneCompleteness(markdown, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private hasSceneHeadings(markdown: string): boolean {
    return this.scenePatterns.zh.test(markdown) || this.scenePatterns.en.test(markdown);
  }

  private checkDialogueFormat(
    markdown: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const lines = markdown.split('\n');
    const hasDialogue = this.dialoguePattern.test(markdown);

    if (!hasDialogue && this.hasSceneHeadings(markdown)) {
      warnings.push({
        type: 'NO_DIALOGUE',
        message: '未找到对话。对话格式应为: **角色名**: 对话内容'
      });
    }

    // Check for malformed dialogue
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check for partial bold formatting that might be a mistake
      if (trimmed.includes('**') && !trimmed.match(/^\*\*[^*]+\*\*/)) {
        if (trimmed.includes(':')) {
          warnings.push({
            type: 'NO_DIALOGUE',
            message: `第 ${index + 1} 行: 可能的对话格式错误，请确保角色名用 ** 完整包围`,
            lineNumber: index + 1
          });
        }
      }
    });
  }

  private checkDuplicateScenes(markdown: string, warnings: ValidationWarning[]): void {
    const lines = markdown.split('\n');
    const sceneNumbers = new Map<number, number[]>();

    lines.forEach((line, index) => {
      const zhMatch = line.match(/^#\s+场景\s+(\d+)/);
      const enMatch = line.match(/^#\s+(?:SCENE|Scene)\s+(\d+)/i);
      const match = zhMatch || enMatch;

      if (match) {
        const sceneNum = parseInt(match[1]);
        if (!sceneNumbers.has(sceneNum)) {
          sceneNumbers.set(sceneNum, []);
        }
        sceneNumbers.get(sceneNum)!.push(index + 1);
      }
    });

    sceneNumbers.forEach((lineNumbers, sceneNum) => {
      if (lineNumbers.length > 1) {
        warnings.push({
          type: 'DUPLICATE_SCENE',
          message: `场景 ${sceneNum} 出现了 ${lineNumbers.length} 次 (行 ${lineNumbers.join(', ')})`,
          lineNumber: lineNumbers[1]
        });
      }
    });
  }

  private checkSceneCompleteness(markdown: string, warnings: ValidationWarning[]): void {
    const lines = markdown.split('\n');

    lines.forEach((line, index) => {
      const isScene = /^#\s+(场景|SCENE|Scene)\s+\d+/.test(line);

      if (isScene) {
        const heading = line.substring(line.indexOf('-') + 1 || line.length).trim();

        if (!heading || heading.length === 0) {
          warnings.push({
            type: 'MISSING_LOCATION',
            message: `第 ${index + 1} 行: 场景缺少地点信息`,
            lineNumber: index + 1
          });
        }

        // Check for time indicator
        const hasTime = /[日夜晨晚]|DAY|NIGHT|MORNING|EVENING/i.test(heading);
        if (!hasTime) {
          warnings.push({
            type: 'MISSING_TIME',
            message: `第 ${index + 1} 行: 场景缺少时间信息（如：日/夜）`,
            lineNumber: index + 1
          });
        }
      }
    });
  }

  validateForProduction(markdown: string): ValidationResult {
    // More strict validation for production
    const result = this.validate(markdown);

    // In production, warnings become errors
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => {
        result.errors.push({
          type: 'INVALID_FORMAT',
          message: `严格模式: ${warning.message}`,
          lineNumber: warning.lineNumber
        });
      });
      result.valid = false;
    }

    return result;
  }
}
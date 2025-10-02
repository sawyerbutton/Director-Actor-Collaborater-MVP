import { MarkdownScriptParser } from '@/lib/parser/markdown-script-parser';
import { MarkdownScriptValidator } from '@/lib/parser/validators/markdown-validator';
import { MarkdownToScriptConverter } from '@/lib/parser/converters/markdown-to-script';

describe('MarkdownScriptParser', () => {
  let parser: MarkdownScriptParser;

  beforeEach(() => {
    parser = new MarkdownScriptParser();
  });

  describe('Scene Parsing', () => {
    it('should parse Chinese scene headings correctly', () => {
      const markdown = `# 场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往。

# 场景 2 - 外景 - 街道 - 夜

夜晚的街道很安静。`;

      const result = parser.parse(markdown);

      expect(result.scenes).toHaveLength(2);
      expect(result.scenes[0].number).toBe(1);
      expect(result.scenes[0].location).toContain('咖啡店');
      expect(result.scenes[0].time).toContain('日');
      expect(result.scenes[1].number).toBe(2);
      expect(result.scenes[1].location).toContain('街道');
      expect(result.scenes[1].time).toContain('夜');
    });

    it('should parse English scene headings correctly', () => {
      const markdown = `# SCENE 1 - INT - COFFEE SHOP - DAY

A busy coffee shop.

# Scene 2 - EXT - STREET - NIGHT

The street is quiet at night.`;

      const result = parser.parse(markdown);

      expect(result.scenes).toHaveLength(2);
      expect(result.scenes[0].number).toBe(1);
      expect(result.scenes[0].heading).toContain('COFFEE SHOP');
      expect(result.scenes[1].number).toBe(2);
      expect(result.scenes[1].heading).toContain('STREET');
    });
  });

  describe('Character and Dialogue Parsing', () => {
    it('should extract character names correctly', () => {
      const markdown = `# 场景 1 - 内景 - 咖啡店 - 日

**服务员**: 欢迎光临！

**顾客**: 我要一杯咖啡。

**服务员**: 好的，马上来。`;

      const result = parser.parse(markdown);

      expect(result.characters).toHaveLength(2);
      expect(result.characters.map(c => c.name)).toContain('服务员');
      expect(result.characters.map(c => c.name)).toContain('顾客');
    });

    it('should handle multi-line dialogue', () => {
      const markdown = `# 场景 1 - 内景 - 办公室 - 日

**老板**: 这个项目很重要。
我们需要在月底前完成。
不能有任何差错。

**员工**: 明白了，我会全力以赴。`;

      const result = parser.parse(markdown);

      expect(result.dialogues).toHaveLength(2);
      expect(result.dialogues[0].text).toContain('这个项目很重要');
      expect(result.dialogues[0].text).toContain('月底前完成');
      expect(result.dialogues[0].text).toContain('不能有任何差错');
    });

    it('should normalize character names to uppercase', () => {
      const markdown = `# SCENE 1 - INT - OFFICE - DAY

**john**: Hello there.

**MARY**: Hi John.

**John**: How are you?`;

      const result = parser.parse(markdown);

      const johnCharacter = result.characters.find(c => c.name.includes('JOHN'));
      expect(johnCharacter).toBeDefined();
      expect(johnCharacter?.dialogueCount).toBe(2);
    });
  });

  describe('Action and Stage Direction Parsing', () => {
    it('should parse action descriptions correctly', () => {
      const markdown = `# 场景 1 - 内景 - 办公室 - 日

*(门突然打开)*

**老板**: 谁在这里？

*(环顾四周)*

**员工**: 是我。`;

      const result = parser.parse(markdown);

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].description).toBe('门突然打开');
      expect(result.actions[1].description).toBe('环顾四周');
    });

    it('should handle transitions', () => {
      const markdown = `# 场景 1 - 内景 - 办公室 - 日

**老板**: 会议结束。

## 淡出

# 场景 2 - 外景 - 停车场 - 日`;

      const result = parser.parse(markdown);

      const transitionAction = result.actions.find(a => a.description.includes('转场'));
      expect(transitionAction).toBeDefined();
      expect(transitionAction?.description).toContain('淡出');
    });
  });

  describe('Scene Descriptions', () => {
    it('should capture scene descriptions', () => {
      const markdown = `# 场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往。
午后的阳光透过窗户洒进来。
背景音乐轻柔。

**服务员**: 欢迎光临！`;

      const result = parser.parse(markdown);

      expect(result.scenes[0].description).toContain('人来人往');
      expect(result.scenes[0].description).toContain('阳光透过窗户');
      expect(result.scenes[0].description).toContain('背景音乐轻柔');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty markdown gracefully', () => {
      const result = parser.parse('');

      expect(result.scenes).toHaveLength(0);
      expect(result.characters).toHaveLength(0);
      expect(result.dialogues).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed markdown', () => {
      const markdown = `This is not a properly formatted script.
Just some random text.`;

      const result = parser.parse(markdown);

      expect(result.scenes).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed Chinese and English content', () => {
      const markdown = `# 场景 1 - INT - 办公室 - DAY

**Manager**: Good morning, 大家好。

**员工A**: Morning, boss.

**经理**: Let's start the meeting. 我们开始会议吧。`;

      const result = parser.parse(markdown);

      expect(result.characters).toHaveLength(3);
      expect(result.dialogues).toHaveLength(3);
    });

    it('should maintain scene order and dialogue sequence', () => {
      const markdown = `# 场景 1 - 内景 - 办公室 - 日

**A**: First line.

**B**: Second line.

# 场景 2 - 外景 - 街道 - 夜

**C**: Third line.

**A**: Fourth line.`;

      const result = parser.parse(markdown);

      expect(result.scenes[0].dialogueIds).toHaveLength(2);
      expect(result.scenes[1].dialogueIds).toHaveLength(2);
      expect(result.totalDialogues).toBe(4);
    });
  });
});

describe('MarkdownScriptValidator', () => {
  let validator: MarkdownScriptValidator;

  beforeEach(() => {
    validator = new MarkdownScriptValidator();
  });

  it('should validate correct markdown format', () => {
    const markdown = `# 场景 1 - 内景 - 办公室 - 日

**老板**: 开会了。`;

    const result = validator.validate(markdown);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing scene headings', () => {
    const markdown = `**老板**: 开会了。

**员工**: 好的。`;

    const result = validator.validate(markdown);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.type === 'MISSING_SCENES')).toBe(true);
  });

  it('should warn about duplicate scene numbers', () => {
    const markdown = `# 场景 1 - 内景 - 办公室 - 日

对话1

# 场景 1 - 外景 - 街道 - 夜

对话2`;

    const result = validator.validate(markdown);

    expect(result.warnings.some(w => w.type === 'DUPLICATE_SCENE')).toBe(true);
  });

  it('should warn about missing dialogue', () => {
    const markdown = `# 场景 1 - 内景 - 办公室 - 日

只有场景描述，没有对话。`;

    const result = validator.validate(markdown);

    expect(result.warnings.some(w => w.type === 'NO_DIALOGUE')).toBe(true);
  });

  it('should check for missing time/location info', () => {
    const markdown = `# 场景 1

**角色**: 对话`;

    const result = validator.validate(markdown);

    expect(result.warnings.some(w => w.type === 'MISSING_LOCATION')).toBe(true);
    expect(result.warnings.some(w => w.type === 'MISSING_TIME')).toBe(true);
  });
});

describe('MarkdownToScriptConverter', () => {
  let converter: MarkdownToScriptConverter;

  beforeEach(() => {
    converter = new MarkdownToScriptConverter();
  });

  it('should convert markdown to ParsedScript format', async () => {
    const markdown = `# 场景 1 - 内景 - 办公室 - 日

**老板**: 开会了。`;

    const result = await converter.convert(markdown);

    expect(result.scenes).toHaveLength(1);
    expect(result.characters).toHaveLength(1);
    expect(result.dialogues).toHaveLength(1);
  });

  it('should convert ParsedScript back to markdown', async () => {
    const markdown = `# 场景 1 - 内景 - 办公室 - 日

办公室描述。

**老板**: 开会了。

*(站起来)*

**员工**: 好的。`;

    const parsed = await converter.convert(markdown);
    const backToMarkdown = await converter.toMarkdown(parsed);

    expect(backToMarkdown).toContain('# 场景 1');
    expect(backToMarkdown).toContain('**老板**:');
    expect(backToMarkdown).toContain('**员工**:');
    expect(backToMarkdown).toContain('*(站起来)*');
  });

  it('should provide a valid template', () => {
    const template = converter.getTemplate();

    expect(template).toContain('# 场景');
    expect(template).toContain('**');
    expect(template).toContain('*(');
  });

  it('should validate markdown script format', () => {
    const validMarkdown = `# 场景 1 - 内景 - 办公室 - 日

**老板**: 开会了。`;

    const invalidMarkdown = `This is just plain text.`;

    expect(converter.isValidMarkdownScript(validMarkdown)).toBe(true);
    expect(converter.isValidMarkdownScript(invalidMarkdown)).toBe(false);
  });
});
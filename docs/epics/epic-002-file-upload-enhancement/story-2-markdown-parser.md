# Story 2: Markdown解析器集成

**Story Points**: 8
**优先级**: 🟡 High
**预计时间**: 3天

## 用户故事

作为一名**技术型编剧**，
我想要**上传Markdown格式的剧本文件**，
以便**使用我熟悉的Markdown编辑器编写和管理剧本**。

## 故事背景

### 现有系统集成
- **集成组件**: Script Parser (`lib/parser/script-parser.ts`)
- **技术栈**: TypeScript, 文本解析库
- **遵循模式**: 现有的剧本格式解析模式
- **触点**:
  - 文件类型验证
  - 内容解析
  - 数据结构转换
  - AI分析接口

## 验收标准

### 功能需求
1. ✅ 支持文件扩展名识别
   - `.md` 文件
   - `.markdown` 文件
   - `.mdown` 文件

2. ✅ 实现Markdown到剧本格式的转换器
   - 场景标记识别（# 场景）
   - 角色对话解析（**角色名**: 对话）
   - 动作描述提取（*斜体文本*）
   - 场景转换指令

3. ✅ 保留格式化信息
   - 加粗文本映射
   - 斜体文本映射
   - 特殊标记保留

### 集成需求
4. ✅ 扩展现有的文件类型验证白名单
5. ✅ 转换后的数据结构与现有剧本格式完全兼容
6. ✅ 与Consistency Guardian分析系统无缝对接

### 质量需求
7. ✅ 支持常见的剧本Markdown约定
8. ✅ 提供Markdown格式规范文档和示例
9. ✅ 转换准确率达到95%以上

## Markdown剧本格式规范

### 标准格式定义

```markdown
# 场景 [编号] - [内/外]景 - [地点] - [时间]

场景描述和环境说明...

**角色名**: 角色的对话内容。可以包含多行，
继续对话内容。

*(动作描述或舞台指示)*

**另一角色**: 另一段对话。

## 转场

# 场景 2 - 外景 - 街道 - 夜
```

### 解析规则

| Markdown元素 | 剧本元素 | 示例 |
|------------|---------|------|
| `# 场景 N` | 场景标题 | `# 场景 1 - 内景 - 办公室 - 日` |
| `**NAME**:` | 角色名 | `**JOHN**:` |
| 冒号后文本 | 对话 | `: 这是对话内容` |
| `*(...)*` | 动作/括号注释 | `*(站起来)*` |
| `## 转场` | 场景转换 | `## 淡出` |
| 普通段落 | 场景描述 | `房间很暗，只有...` |

## 技术实现

### 1. 解析器架构

```typescript
// lib/parser/markdown-script-parser.ts

interface MarkdownElement {
  type: 'scene' | 'character' | 'dialogue' | 'action' | 'description';
  content: string;
  metadata?: Record<string, any>;
}

class MarkdownScriptParser {
  private patterns = {
    scene: /^#\s+场景\s+(\d+)\s*[-–]\s*(.*)/,
    character: /^\*\*([^:]+)\*\*:\s*/,
    action: /^\*\((.*?)\)\*/,
    transition: /^##\s+(.+)/
  };

  parse(markdown: string): Script {
    const lines = markdown.split('\n');
    const elements = this.extractElements(lines);
    return this.buildScriptStructure(elements);
  }

  private extractElements(lines: string[]): MarkdownElement[] {
    // 逐行解析，识别元素类型
  }

  private buildScriptStructure(elements: MarkdownElement[]): Script {
    // 构建标准剧本数据结构
  }
}
```

### 2. 数据转换映射

```typescript
// lib/parser/converters/markdown-to-script.ts

interface ScriptScene {
  number: number;
  heading: string;
  location: string;
  time: string;
  description: string;
  elements: ScriptElement[];
}

interface ScriptElement {
  type: 'dialogue' | 'action' | 'transition';
  character?: string;
  text: string;
  dual?: boolean;
}

class MarkdownToScriptConverter {
  convert(markdownElements: MarkdownElement[]): ScriptScene[] {
    // 转换逻辑
  }

  private normalizeCharacterName(name: string): string {
    // 统一角色名格式（大写、去空格等）
  }

  private parseSceneHeading(heading: string): {
    location: string;
    time: string;
    setting: 'INT' | 'EXT';
  } {
    // 解析场景标题组件
  }
}
```

### 3. 验证和错误处理

```typescript
// lib/parser/validators/markdown-validator.ts

class MarkdownScriptValidator {
  validate(markdown: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查必需元素
    if (!this.hasSceneHeadings(markdown)) {
      errors.push({
        type: 'MISSING_SCENES',
        message: '未找到场景标记（# 场景）'
      });
    }

    // 检查格式规范
    this.checkDialogueFormat(markdown, errors, warnings);

    return { valid: errors.length === 0, errors, warnings };
  }
}
```

### 4. 与现有系统集成

```typescript
// lib/parser/script-parser.ts (更新)

export class ScriptParser {
  private markdownParser = new MarkdownScriptParser();

  async parseFile(file: File): Promise<Script> {
    const content = await this.readFileContent(file);

    if (this.isMarkdownFile(file)) {
      return this.markdownParser.parse(content);
    }

    // 现有解析逻辑
    return this.parseStandardFormat(content);
  }

  private isMarkdownFile(file: File): boolean {
    const ext = file.name.toLowerCase().split('.').pop();
    return ['md', 'markdown', 'mdown'].includes(ext);
  }
}
```

## 完成定义

- [ ] Markdown文件成功解析为标准剧本格式
- [ ] 所有剧本元素正确识别
  - 场景标题
  - 角色名
  - 对话
  - 动作描述
- [ ] 解析错误提供明确的行号和修复建议
- [ ] 性能测试通过（100页剧本<2秒）
- [ ] 添加Markdown格式指南到用户文档

## 测试计划

### 单元测试
```typescript
// tests/parser/markdown-parser.test.ts
describe('MarkdownScriptParser', () => {
  it('should parse scene headings correctly');
  it('should extract character names');
  it('should handle multi-line dialogue');
  it('should parse action descriptions');
  it('should maintain scene order');
  it('should handle edge cases (empty scenes, special chars)');
});
```

### 集成测试
```typescript
// tests/integration/markdown-pipeline.test.ts
describe('Markdown to Analysis Pipeline', () => {
  it('should parse MD file and run consistency analysis');
  it('should generate correct revision suggestions');
  it('should export back to readable format');
});
```

### 测试数据
1. **简单剧本** - 5个场景，基本对话
2. **复杂剧本** - 50个场景，多角色，复杂格式
3. **边界案例** - 特殊字符，嵌套格式，长对话
4. **错误案例** - 格式错误的文件，用于测试错误处理

## 输出交付物

1. **解析器代码**
   - `lib/parser/markdown-script-parser.ts`
   - `lib/parser/converters/markdown-to-script.ts`
   - `lib/parser/validators/markdown-validator.ts`

2. **测试套件**
   - 单元测试文件
   - 集成测试文件
   - 测试数据集

3. **文档**
   - Markdown剧本格式指南
   - 示例文件
   - API文档

4. **用户资源**
   - 格式模板文件
   - 转换工具（可选）
   - 常见问题解答

## 依赖关系

- 可独立开发，不依赖其他Story
- Story 3需要此Story完成后进行集成测试

## 性能要求

- 10页剧本: < 100ms
- 100页剧本: < 2秒
- 500页剧本: < 10秒
- 内存使用: < 100MB

## 风险

- **风险**: Markdown格式的灵活性可能导致解析歧义
- **缓解**: 提供严格的格式规范和验证，给出清晰的错误提示

## 未来增强

- 支持Fountain格式
- 支持双语剧本
- 智能格式纠正
- 实时预览功能

## 备注

- 保持解析器模块化，便于未来支持更多格式
- 考虑使用现有的Markdown解析库作为基础
- 记录所有不确定的格式决策，便于用户反馈后调整
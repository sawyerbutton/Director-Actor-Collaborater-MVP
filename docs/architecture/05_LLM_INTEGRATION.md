# 05 - LLM集成架构文档

**版本**: 1.0.0
**更新日期**: 2025-10-11
**状态**: 生产就绪 ✅

---

## 📋 目录

1. [DeepSeek API集成](#1-deepseek-api集成)
2. [AI Agents架构](#2-ai-agents架构)
3. [Prompt工程](#3-prompt工程)
4. [响应解析与验证](#4-响应解析与验证)
5. [错误处理与重试](#5-错误处理与重试)
6. [性能优化](#6-性能优化)

---

## 1. DeepSeek API集成

### 1.1 API配置

**环境变量**:
```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com
```

**模型选择**:
- **deepseek-chat**: 通用对话模型
- **温度**: 0.7（平衡创造性和一致性）
- **max_tokens**: 2000-4000（根据任务）

### 1.2 API客户端

**文件**: `lib/api/deepseek/client.ts`

```typescript
interface DeepSeekChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };  // 强制JSON输出
}

class DeepSeekClient {
  private apiKey: string;
  private baseURL: string;
  private timeout: number = 120000;  // 120秒（2025-10-09优化）

  async chat(request: DeepSeekChatRequest): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

### 1.3 请求示例

```typescript
const request: DeepSeekChatRequest = {
  model: 'deepseek-chat',
  messages: [
    {
      role: 'system',
      content: '你是一个专业的剧本分析专家...'
    },
    {
      role: 'user',
      content: `请分析以下剧本：\n\n${scriptContent}`
    }
  ],
  temperature: 0.7,
  max_tokens: 3000,
  response_format: { type: 'json_object' }  // 要求返回JSON
};

const response = await client.chat(request);
const parsed = JSON.parse(response);
```

---

## 2. AI Agents架构

### 2.1 Agent清单

| Agent | 文件 | Act | 职责 |
|-------|------|-----|------|
| **ConsistencyGuardian** | `consistency-guardian.ts` | ACT1 | 逻辑错误检测（5类） |
| **CharacterArchitect** | `character-architect.ts` | ACT2 | 角色弧线深化 |
| **RulesAuditor** | `rules-auditor.ts` | ACT3 | 世界观丰富化 |
| **PacingStrategist** | `pacing-strategist.ts` | ACT4 | 节奏优化 |
| **ThematicPolisher** | `thematic-polisher.ts` | ACT5 | 主题深化 |
| **CrossFileAdvisor** | `cross-file-advisor.ts` | Sprint 3 | 跨文件问题解决 |

### 2.2 Agent工厂模式

```typescript
// lib/agents/consistency-guardian.ts
export function createConsistencyGuardian(apiKey: string): ConsistencyGuardian {
  const client = new DeepSeekClient(apiKey);
  return new ConsistencyGuardian(client);
}

// lib/agents/character-architect.ts
export function createCharacterArchitect(apiKey: string): CharacterArchitect {
  const client = new DeepSeekClient(apiKey);
  return new CharacterArchitect(client);
}
```

**使用示例**:
```typescript
const agent = createConsistencyGuardian(process.env.DEEPSEEK_API_KEY!);
const result = await agent.analyzeScriptText(scriptContent);
```

---

## 3. Prompt工程

### 3.1 ConsistencyGuardian（ACT1）

**目标**: 快速检测5类逻辑错误

**Prompt结构**:
```typescript
// lib/agents/prompts/consistency-prompts.ts
export const SYSTEM_PROMPT = `
你是一个专业的剧本逻辑分析专家。
你的任务是识别剧本中的逻辑错误，包括：
1. 时间线错误（timeline）
2. 角色行为矛盾（character）
3. 情节逻辑问题（plot）
4. 对话不一致（dialogue）
5. 场景设置问题（scene）

请返回JSON格式：
{
  "errors": [
    {
      "type": "timeline",
      "severity": "critical",
      "location": { "line": 10, "content": "..." },
      "description": "时间跳跃不合理",
      "suggestion": "添加过渡场景",
      "confidence": 0.95
    }
  ]
}
`;

export const USER_PROMPT_TEMPLATE = (scriptContent: string) => `
请分析以下剧本中的逻辑错误：

${scriptContent}

要求：
- 仔细检查时间线连贯性
- 识别角色行为前后矛盾
- 发现情节漏洞
- 检查对话一致性
- 评估场景设置合理性

请返回完整的JSON格式分析结果。
`;
```

**关键优化**:
- **分块处理**: 剧本>10000字符 → 分3-5块并行分析
- **置信度要求**: 强制AI输出varied confidence（不全是80%）
- **严重度映射**: AI输出4级(critical/high/medium/low) → 数据库3级(critical/warning/info)

### 3.2 CharacterArchitect（ACT2）

**目标**: 深化角色弧线（创作导向）

**P4-P6提示链**:

**P4 - 分析成长潜力**:
```typescript
export const P4_SYSTEM_PROMPT = `
你是角色深度创作导师（不是错误修复者）。

重要：你不是在"修复错误"，而是在"深化创作"。
即使角色逻辑一致，也可以通过增强使其更具艺术价值。

任务：识别角色成长潜力
- 分析角色当前状态（表层vs立体）
- 识别可深化的维度（心理转变、成长弧线、内在冲突）
- 不是找矛盾，而是找"可以更丰富的地方"
`;

export const P4_USER_PROMPT = (characterName: string, scriptContext: string) => `
角色：${characterName}
剧本片段：${scriptContext}

请分析：
1. 角色当前状态（性格、动机、冲突）
2. 成长潜力维度（从"平面" → "立体"的可能性）
3. 可深化的心理转变点

返回JSON：
{
  "currentState": "...",
  "growthPotential": ["心理转变", "成长弧线", "内在冲突"],
  "focusAreas": [...]
}
`;
```

**P5 - 生成2个提案**:
```typescript
export const P5_SYSTEM_PROMPT = `
你是角色创作方案设计师。

根据P4分析结果，生成2个角色深化方案：
1. 渐进式成长（Gradual Growth）：平稳、自然的心理转变
2. 戏剧性转变（Dramatic Shift）：冲突、反转、突破性变化

每个方案包含：
- title: 方案标题
- description: 核心策略
- pros: 优点（艺术价值）
- cons: 缺点（实施难度）
- dramaticImpact: 戏剧效果预测
`;
```

**P6 - "Show Don't Tell"执行**:
```typescript
export const P6_SYSTEM_PROMPT = `
你是戏剧动作生成器。

根据用户选择的方案（0或1），生成"Show, Don't Tell"戏剧化呈现：
- 不要写"他很害怕"（Tell）
- 要写"他双手颤抖，汗水滴落"（Show）

返回JSON：
{
  "dramaticActions": [
    {
      "scene": "场景描述",
      "before": "原始对话/描述",
      "after": "戏剧化改写",
      "impact": "情感效果"
    }
  ],
  "overallArc": "整体角色弧线",
  "integrationNotes": "整合建议"
}
`;
```

### 3.3 RulesAuditor（ACT3）

**目标**: 丰富世界观（不是审计错误）

**P7-P9提示链**:

**P7 - 分析世界观深度潜力**:
```typescript
export const P7_SYSTEM_PROMPT = `
你是世界观丰富化导师（不是审计员）。

重要：你不是在"审计不一致"，而是在"丰富世界"。
合理的世界观可以通过增加细节、设定、张力变得引人入胜。

任务：识别世界观丰富化机会
- 评估设定深度（表面vs立体）
- 发现可深化的维度（历史、规则、冲突）
- 提出戏剧化潜力点
`;
```

**P8 - 生成丰富化路径**:
```typescript
export const P8_SYSTEM_PROMPT = `
你是世界观增强方案设计师。

生成2-3个世界观丰富化方案，每个方案：
- title: 方案名称
- description: 核心策略
- enrichmentDetails: 具体增强内容（细节、规则、冲突）
- rippleEffects: 连锁影响（对角色、情节的影响）
- difficulty: 实施难度
`;
```

**P9 - 设定-主题对齐**:
```typescript
export const P9_SYSTEM_PROMPT = `
你是设定-主题整合专家。

根据用户选择的方案，生成具体的设定增强内容：
- 深化世界观细节
- 建立设定与主题的共鸣
- 增强戏剧张力

返回：
- enrichedSetting: 增强后的设定描述
- themeAlignment: 与主题的对应关系
- dramaticOpportunities: 戏剧化场景机会
`;
```

### 3.4 PacingStrategist（ACT4）

**P10-P11提示链**:

**P10 - 节奏增强分析**:
```typescript
export const P10_SYSTEM_PROMPT = `
你是节奏优化大师（不是问题识别者）。

重要：你不是在"识别节奏问题"，而是在"优化体验"。
流畅的节奏可以通过调整变得扣人心弦。

任务：识别节奏增强机会
- 分析当前节奏状态（平稳vs起伏）
- 发现可优化维度（悬念、高潮、留白）
- 提出戏剧化增强点
`;
```

**P11 - 节奏重构策略**:
```typescript
export const P11_SYSTEM_PROMPT = `
你是节奏重构方案设计师。

生成2-3个节奏优化策略：
1. 悬念增强（Suspense Building）
2. 高潮重组（Climax Restructuring）
3. 张力分布（Tension Distribution）

每个策略包含：
- restructureStrategy: 具体调整方法
- affectedScenes: 影响的场景
- dramaticImpact: 情感强度预测
`;
```

### 3.5 ThematicPolisher（ACT5）

**P12-P13提示链**:

**P12 - 角色精神深度增强**:
```typescript
export const P12_SYSTEM_PROMPT = `
你是角色精神深度导师（不是标签去除者）。

重要：你不是在"去除标签"，而是在"深化内核"。
任务：定义角色精神世界
- 去标签化（从"勇敢" → "为何勇敢"）
- 深化心理动机（核心恐惧、信念、渴望）
- 建立情感共鸣点
`;
```

**P13 - 定义角色内核**:
```typescript
export const P13_SYSTEM_PROMPT = `
你是角色内核定义专家。

生成角色精神档案：
{
  "coreFears": ["核心恐惧1", "核心恐惧2"],
  "coreBeliefs": ["核心信念1", "核心信念2"],
  "empathyHooks": ["共鸣点1", "共鸣点2"],
  "thematicResonance": "与主题的共鸣"
}
`;
```

### 3.6 CrossFileAdvisor（Sprint 3）

**目标**: 跨文件问题解决策略

**Prompt结构**:
```typescript
export const SYSTEM_PROMPT = `
你是跨文件一致性解决方案专家。

任务：为跨文件问题生成2-3个可行的解决方案。

类型：
- cross_file_timeline: 跨集时间线问题
- cross_file_character: 跨集角色不一致
- cross_file_plot: 跨集情节断裂
- cross_file_setting: 跨集设定冲突

返回JSON：
{
  "analysis": "问题分析",
  "solutions": [
    {
      "title": "方案1",
      "description": "具体步骤",
      "impact": "影响范围",
      "difficulty": "easy|medium|hard"
    }
  ],
  "recommendedSolutionIndex": 0
}
`;
```

---

## 4. 响应解析与验证

### 4.1 JSON强制模式

**关键配置**:
```typescript
const request = {
  model: 'deepseek-chat',
  messages: [...],
  response_format: { type: 'json_object' }  // ✅ 强制JSON输出
};
```

**效果**: DeepSeek保证返回合法JSON（不会返回Markdown代码块）

### 4.2 Zod验证Schema

**ACT2示例**:
```typescript
// lib/agents/character-architect.ts
const P5ProposalSchema = z.object({
  proposals: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      approach: z.enum(['gradual', 'dramatic']).optional(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      dramaticImpact: z.string().optional()
    })
  ).length(2),  // 必须恰好2个
  recommendation: z.string()
});

// 使用
const parsed = JSON.parse(response);
const result = P5ProposalSchema.parse(parsed);  // 验证并获取类型安全对象
```

### 4.3 验证失败处理

```typescript
try {
  const parsed = JSON.parse(response);
  const validated = schema.parse(parsed);
  return validated;
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
    throw new Error(`Invalid AI response format: ${error.message}`);
  }
  throw error;
}
```

---

## 5. 错误处理与重试

### 5.1 超时配置

```typescript
class DeepSeekClient {
  private timeout = 120000;  // 120秒（2025-10-09优化，从9秒增加）

  async chat(request: DeepSeekChatRequest): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('API调用超时（120秒）');
      }
      throw error;
    }
  }
}
```

### 5.2 重试策略

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // 指数退避
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.warn(`Retry ${attempt}/${maxRetries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries exceeded');
}

// 使用
const result = await callWithRetry(
  () => agent.analyzeScriptText(script),
  3,  // 最多重试3次
  1000  // 初始延迟1秒
);
```

### 5.3 错误类型处理

```typescript
try {
  const response = await client.chat(request);
} catch (error) {
  if (error.message.includes('timeout')) {
    // 超时错误 → 用户友好消息
    throw new Error('分析超时：剧本可能过长或API响应缓慢');
  } else if (error.message.includes('429')) {
    // 限流错误
    throw new Error('API调用频率超限，请稍后重试');
  } else if (error.message.includes('network')) {
    // 网络错误
    throw new Error('API连接失败，请检查网络或稍后重试');
  } else {
    // 其他错误
    throw new Error(`AI分析失败: ${error.message}`);
  }
}
```

---

## 6. 性能优化

### 6.1 分块并行处理（ConsistencyGuardian）

**问题**: 长剧本（>10000字符）单次分析慢

**解决方案**: 分块 + 并行

```typescript
async analyzeScriptText(scriptText: string): Promise<AnalysisResult> {
  const CHUNK_SIZE = 3000;  // 每块3000字符

  if (scriptText.length <= CHUNK_SIZE) {
    // 短剧本：直接分析
    return this.analyzeSingleChunk(scriptText);
  }

  // 长剧本：分块并行
  const chunks = this.splitIntoChunks(scriptText, CHUNK_SIZE);

  const results = await Promise.all(
    chunks.map((chunk, index) =>
      this.analyzeSingleChunk(chunk).catch(error => {
        console.error(`Chunk ${index} failed:`, error);
        return { errors: [] };  // 失败块返回空结果
      })
    )
  );

  // 合并结果
  return this.mergeResults(results);
}

private splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

private mergeResults(results: AnalysisResult[]): AnalysisResult {
  const allErrors = results.flatMap(r => r.errors);

  // 去重（基于description相似度）
  const uniqueErrors = this.deduplicateErrors(allErrors);

  return {
    errors: uniqueErrors,
    statistics: {
      total: uniqueErrors.length,
      bySeverity: this.groupBySeverity(uniqueErrors)
    }
  };
}
```

**性能对比**:
- 单块10000字符: ~60秒
- 3块3333字符（并行）: ~25秒（提升60%）

### 6.2 动态导入（Serverless优化）

**问题**: Serverless冷启动慢（加载所有Agent代码）

**解决方案**: 按需动态导入

```typescript
// WorkflowQueue.processIteration()
async processIteration(job: AnalysisJob) {
  const { act } = job.input;

  // ✅ 动态导入（只加载需要的Agent）
  let agent;
  if (act === 'ACT2_CHARACTER') {
    const { createCharacterArchitect } = await import('@/lib/agents/character-architect');
    agent = createCharacterArchitect(apiKey);
  } else if (act === 'ACT3_WORLDBUILDING') {
    const { createRulesAuditor } = await import('@/lib/agents/rules-auditor');
    agent = createRulesAuditor(apiKey);
  }
  // ...

  return agent.process(...);
}
```

**效果**:
- 减少冷启动时间30-50%
- 减少内存占用

### 6.3 缓存响应（未实现，可选）

```typescript
// 可选：缓存相同输入的AI响应
const cacheKey = `${act}:${md5(focusName + contradiction)}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const result = await agent.process(...);
await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);  // 1小时
return result;
```

---

## 7. Agent详细实现

### 7.1 ConsistencyGuardian

**文件**: `lib/agents/consistency-guardian.ts`

**核心方法**:
```typescript
class ConsistencyGuardian {
  constructor(private client: DeepSeekClient) {}

  async analyzeScriptText(scriptText: string): Promise<AnalysisResult> {
    // 1. 构建Prompt
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT_TEMPLATE(scriptText) }
    ];

    // 2. 调用API
    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    // 3. 解析和验证
    const parsed = JSON.parse(response);
    const validated = ConsistencyResultSchema.parse(parsed);

    // 4. 映射严重度（4级 → 3级）
    return {
      errors: validated.errors.map(error => ({
        ...error,
        severity: this.mapSeverity(error.severity)
      }))
    };
  }

  private mapSeverity(severity: string): 'critical' | 'warning' | 'info' {
    if (severity === 'critical' || severity === 'high') return 'critical';
    if (severity === 'medium') return 'warning';
    return 'info';
  }
}
```

### 7.2 CharacterArchitect

**核心方法**:
```typescript
class CharacterArchitect {
  // P4: 分析成长潜力
  async analyzeGrowthPotential(characterName: string, scriptContext: string) {
    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: P4_SYSTEM_PROMPT },
        { role: 'user', content: P4_USER_PROMPT(characterName, scriptContext) }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    return P4ResultSchema.parse(JSON.parse(response));
  }

  // P5: 生成2个提案
  async generateProposals(growthPotential: P4Result) {
    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: P5_SYSTEM_PROMPT },
        { role: 'user', content: P5_USER_PROMPT(growthPotential) }
      ],
      temperature: 0.8,  // 更高创造性
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const result = P5ProposalSchema.parse(JSON.parse(response));
    return result;  // { proposals: [2个], recommendation: "prop-1" }
  }

  // P6: 执行选中提案
  async executeProposal(proposal: Proposal, scriptContext: string) {
    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: P6_SYSTEM_PROMPT },
        { role: 'user', content: P6_USER_PROMPT(proposal, scriptContext) }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    return P6ResultSchema.parse(JSON.parse(response));
  }

  // 高层接口（供WorkflowQueue调用）
  async process(focusName: string, contradiction: string, scriptContext: string) {
    const p4Result = await this.analyzeGrowthPotential(focusName, contradiction);
    const p5Result = await this.generateProposals(p4Result);
    return p5Result;  // 返回提案供用户选择
  }
}
```

### 7.3 RulesAuditor, PacingStrategist, ThematicPolisher

**结构相同**:
- 每个Agent有自己的P7-P9/P10-P11/P12-P13提示链
- 实现`process()`方法生成提案
- 实现`execute()`方法应用选中提案

---

## 8. Token使用优化

### 8.1 Token计算

**估算**:
- 中文：1字 ≈ 1.5-2 tokens
- 英文：1词 ≈ 1 token

**典型消耗**:
```
ConsistencyGuardian (ACT1):
  输入: 3000字剧本 → ~5000 tokens
  输出: 10个错误 → ~1000 tokens
  总计: ~6000 tokens

CharacterArchitect (ACT2):
  P4输入: 500字上下文 → ~800 tokens
  P4输出: 分析结果 → ~300 tokens
  P5输入: P4结果 → ~500 tokens
  P5输出: 2个提案 → ~600 tokens
  P6输入: 1个提案 → ~400 tokens
  P6输出: 戏剧动作 → ~800 tokens
  总计: ~3400 tokens
```

### 8.2 降低Token消耗

**策略**:
1. **Prompt简化**: 去除冗余说明
2. **上下文截取**: 只传递相关片段（不是全剧本）
3. **分块处理**: 长剧本分块
4. **结果缓存**: 避免重复调用

**示例**:
```typescript
// ❌ 坏：传递全剧本（10000字）
const result = await agent.process(characterName, fullScript);

// ✅ 好：只传递相关片段（500字）
const relevantContext = extractCharacterScenes(fullScript, characterName);
const result = await agent.process(characterName, relevantContext);
```

---

## 9. 测试策略

### 9.1 单元测试（Mock AI）

```typescript
// tests/unit/character-architect.test.ts
import { createCharacterArchitect } from '@/lib/agents/character-architect';

describe('CharacterArchitect', () => {
  let mockClient: jest.Mocked<DeepSeekClient>;
  let agent: CharacterArchitect;

  beforeEach(() => {
    mockClient = {
      chat: jest.fn()
    } as any;

    agent = new CharacterArchitect(mockClient);
  });

  it('should generate 2 proposals (P5)', async () => {
    // Mock AI响应
    mockClient.chat.mockResolvedValue(JSON.stringify({
      proposals: [
        { id: 'prop-1', title: '渐进式', pros: ['...'], cons: ['...'] },
        { id: 'prop-2', title: '戏剧性', pros: ['...'], cons: ['...'] }
      ],
      recommendation: 'prop-1'
    }));

    const result = await agent.generateProposals({
      currentState: '...',
      growthPotential: ['...']
    });

    expect(result.proposals).toHaveLength(2);
    expect(result.recommendation).toBe('prop-1');
  });
});
```

### 9.2 集成测试（真实AI）

```typescript
// tests/integration/act2-flow.test.ts
describe('ACT2 Full Flow', () => {
  it('should complete P4 → P5 → P6 chain', async () => {
    const agent = createCharacterArchitect(process.env.DEEPSEEK_API_KEY!);

    // P4: 分析
    const p4Result = await agent.analyzeGrowthPotential('张三', '剧本片段...');
    expect(p4Result.growthPotential).toBeDefined();

    // P5: 提案
    const p5Result = await agent.generateProposals(p4Result);
    expect(p5Result.proposals).toHaveLength(2);

    // P6: 执行
    const p6Result = await agent.executeProposal(p5Result.proposals[0], '上下文...');
    expect(p6Result.dramaticActions).toBeDefined();
  }, 120000);  // 120秒超时
});
```

---

## 10. 监控与日志

### 10.1 关键指标

| 指标 | 目标 | 监控方式 |
|-----|------|---------|
| **API调用成功率** | >95% | 日志统计 |
| **平均响应时间** | <30秒 | 时间戳diff |
| **Token消耗** | <10000/请求 | API响应头 |
| **错误率** | <5% | 错误日志 |

### 10.2 日志规范

```typescript
// 请求开始
console.log('[ConsistencyGuardian] Starting analysis', {
  scriptLength: script.length,
  timestamp: Date.now()
});

// 请求成功
console.log('[ConsistencyGuardian] Analysis complete', {
  errorsFound: result.errors.length,
  duration: Date.now() - startTime,
  tokensUsed: response.usage?.total_tokens
});

// 请求失败
console.error('[ConsistencyGuardian] Analysis failed', {
  error: error.message,
  duration: Date.now() - startTime,
  retryAttempt: attempt
});
```

---

## 附录A：Prompt设计原则

### A.1 创作导向原则（ACT2-5）

**✅ 推荐语言**:
- "深化创作"、"丰富细节"、"增强张力"
- "识别潜力"、"优化体验"、"精神共鸣"

**❌ 避免语言**:
- "修复错误"、"解决矛盾"、"审计问题"
- "识别缺陷"、"纠正不一致"

**关键声明**（必须包含）:
```
重要：你不是在"修复错误"，而是在"深化创作"。
即使逻辑一致，也可以通过增强使其更具艺术价值。
```

### A.2 结构化输出

**✅ 好的Prompt**:
```
请返回JSON格式：
{
  "analysis": "...",
  "proposals": [...]
}

确保JSON格式正确，不要包含Markdown代码块。
```

**配合API设置**:
```typescript
response_format: { type: 'json_object' }
```

### A.3 温度设置

| 任务类型 | 温度 | 说明 |
|---------|------|------|
| 逻辑分析 | 0.5-0.7 | 需要准确性 |
| 创意生成 | 0.7-0.9 | 需要多样性 |
| 执行转换 | 0.6-0.8 | 平衡准确与创意 |

---

## 附录B：常见问题

### B.1 AI返回非JSON

**问题**: 即使设置`response_format: { type: 'json_object' }`，仍返回Markdown

**解决方案**:
```typescript
let response = await client.chat(request);

// 去除Markdown代码块（兼容旧行为）
if (response.startsWith('```json')) {
  response = response.replace(/```json\n/g, '').replace(/\n```/g, '');
}

const parsed = JSON.parse(response);
```

### B.2 Timeout错误

**问题**: 长剧本分析超时（120秒）

**解决方案**:
1. **分块处理**: 剧本>10000字符 → 分块并行
2. **增加超时**: 120秒 → 180秒（需Vercel配置支持）
3. **优化Prompt**: 减少输出要求

### B.3 Confidence全是80%

**问题**: AI输出的confidence score全部相同

**解决方案**: 在Prompt中明确要求
```
请根据错误的明确程度输出varied confidence：
- 90-100: 明确的逻辑错误（时间线矛盾）
- 70-89: 可能的问题（缺少setup）
- 50-69: 不确定的问题（可能是风格选择）
```

---

**文档结束** | 下一篇: [06 - 部署架构](./06_DEPLOYMENT_ARCHITECTURE.md)

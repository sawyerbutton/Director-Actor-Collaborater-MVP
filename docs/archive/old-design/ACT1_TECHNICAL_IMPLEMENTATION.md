# ACT1 技术实现详解

> ScriptAI - ACT1 逻辑诊断模块技术实现文档
>
> 本文档详细说明 ACT1 (逻辑快速修复) 的完整技术实现，包括业务逻辑、代码架构、数据流向和关键实现细节。

**文档版本**: v1.0
**最后更新**: 2025-11-03
**相关文档**: `BUSINESS_FLOW.md` (业务流程总览), `CLAUDE.md` (开发指南)

---

## 📋 目录

- [核心定位](#核心定位)
- [技术架构总览](#技术架构总览)
- [核心组件详解](#核心组件详解)
  - [1. ConsistencyGuardian - AI 分析引擎](#1-consistencyguardian---ai-分析引擎)
  - [2. PromptBuilder - 提示词构建器](#2-promptbuilder---提示词构建器)
  - [3. WorkflowQueue - 异步作业队列](#3-workflowqueue---异步作业队列)
  - [4. API 路由层](#4-api-路由层)
  - [5. 数据库服务层](#5-数据库服务层)
  - [6. 前端页面](#6-前端页面)
- [完整数据流](#完整数据流)
- [关键技术决策](#关键技术决策)
- [性能优化策略](#性能优化策略)
- [错误处理机制](#错误处理机制)
- [Serverless 适配](#serverless-适配)
- [常见问题排查](#常见问题排查)

---

## 核心定位

**ACT1 的产品定位**: 逻辑快速修复（修Bug）

- **时间**: 5-10 分钟
- **目标**: 修复客观的逻辑错误（时间线矛盾、角色前后不一致、剧情漏洞、对话逻辑错误、场景转换问题）
- **输出**: V1 版本剧本（逻辑一致性）
- **用户决策**:
  - 选项 A: 直接使用修复后的剧本（导出）
  - 选项 B: 继续进入 ACT2-5 创作深化阶段

**与 ACT2-5 的区别**:
- ACT1 = **修复导向** (找错误、改错误)
- ACT2-5 = **创作导向** (找机会、提升质量)

---

## 技术架构总览

### 系统组件图

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (Next.js Client)                     │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ Dashboard Page   │────────▶│ Analysis Page    │          │
│  │ (上传剧本)        │         │ (查看诊断报告)    │          │
│  └──────────────────┘         └──────────────────┘          │
│           │                              ▲                   │
│           │                              │                   │
│           ▼                              │                   │
│  ┌──────────────────────────────────────────────┐           │
│  │        v1ApiService (API 客户端)              │           │
│  │  - createProject()                            │           │
│  │  - startAnalysis()                            │           │
│  │  - pollJobStatus()                            │           │
│  │  - getDiagnosticReport()                      │           │
│  │  - triggerProcessing() [Serverless]           │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/JSON
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 后端 API 路由 (Next.js API)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ POST /api/v1/projects        - 创建项目              │    │
│  │ POST /api/v1/analyze         - 提交 ACT1 分析        │    │
│  │ GET  /api/v1/analyze/jobs/:id - 轮询作业状态        │    │
│  │ POST /api/v1/analyze/process  - 手动触发处理        │    │
│  │ GET  /api/v1/projects/:id/report - 获取诊断报告     │    │
│  │ POST /api/v1/projects/:id/apply-act1-repair         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              WorkflowQueue (异步作业队列 - 单例)             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ submitAct1Analysis()  - 创建 ACT1_ANALYSIS 作业      │    │
│  │ processNext()         - 处理队列中的作业              │    │
│  │ processAct1Analysis() - 执行 ACT1 分析逻辑          │    │
│  │ processNextManually() - Serverless 手动处理         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│             ConsistencyGuardian (AI 分析引擎)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ analyzeScriptText()   - 分析原始剧本文本              │    │
│  │ - 调用 DeepSeek API                                  │    │
│  │ - 检测 5 类逻辑错误                                   │    │
│  │ - 分块处理（并行）                                    │    │
│  │ - 去重和严重度映射                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   DeepSeek API Integration                   │
│  - Model: deepseek-chat                                     │
│  - Timeout: 120 秒                                           │
│  - Response Format: { type: 'json_object' }                 │
│  - 中文语言优化                                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL (Prisma ORM)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ Project        │  │ AnalysisJob    │  │ DiagnosticRpt│  │
│  │ - content      │  │ - type         │  │ - findings   │  │
│  │ - workflowSts  │  │ - status       │  │ - summary    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心组件详解

### 1. ConsistencyGuardian - AI 分析引擎

**文件路径**: `lib/agents/consistency-guardian.ts`

#### 1.1 类结构

```typescript
export class ConsistencyGuardian {
  private client: DeepSeekClient;
  private config: ConsistencyAgentConfig;
  private cache: Map<string, { result: ConsistencyAnalysisResult; expires: number }>;

  constructor(apiKey: string, config?: Partial<ConsistencyAgentConfig>)

  // 核心方法
  async analyzeScriptText(
    scriptText: string,
    scriptId: string,
    checkTypes?: LogicErrorType[],
    maxErrors: number = 50
  ): Promise<AnalysisReport>

  async analyzeScript(request: ConsistencyCheckRequest): Promise<AnalysisReport>

  // 私有辅助方法
  private async analyzeChunk(...)
  private preprocessScript(...)
  private createAnalysisChunks(...)
  private parseAIResponse(...)
  private validateAndNormalizeError(...)
  private filterAndDeduplicateErrors(...)
  private generateReport(...)
}
```

#### 1.2 核心方法：analyzeScriptText()

**为什么使用这个方法而不是 analyzeScript()?**

- **目的**: 避免解析器产生的 artifacts（例如 `Location: undefined`）
- **输入**: 原始剧本文本（字符串）
- **输出**: `AnalysisReport` 包含错误列表和统计信息

**执行流程**:

```typescript
// Step 1: 构建提示词
const promptBuilder = new PromptBuilder(
  scriptText,
  ['timeline', 'character', 'plot', 'dialogue', 'scene'],
  50  // maxErrors
);
const prompt = promptBuilder.buildFullPrompt();

// Step 2: 调用 DeepSeek API
const request: DeepSeekChatRequest = {
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user }
  ],
  temperature: 0.7,
  max_tokens: 2000,
  response_format: { type: 'json_object' }  // 强制 JSON 输出
};

const response = await this.client.chat(request);

// Step 3: 解析 AI 响应
const errors = this.parseAIResponse(response.choices[0].message.content);

// Step 4: 构建分析结果
const analysisResult: ConsistencyAnalysisResult = {
  scriptId,
  analyzedAt: new Date(),
  totalErrors: errors.length,
  errors,
  errorsByType: this.groupErrorsByType(errors),
  errorsBySeverity: this.groupErrorsBySeverity(errors),
  analysisMetadata: {
    processingTime: Date.now() - startTime,
    tokensUsed: response.usage?.total_tokens || 0,
    modelUsed: 'deepseek-chat',
    version: '1.0.0'
  }
};

// Step 5: 生成报告
return this.generateReport(analysisResult);
```

#### 1.3 错误解析和验证

**parseAIResponse() 方法**:

```typescript
private parseAIResponse(response: string): LogicError[] {
  // Step 1: 清理响应（移除 Markdown 代码块标记）
  let cleanedResponse = response.trim();
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.substring(7);
  }
  if (cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
  }

  // Step 2: 解析 JSON
  const parsed = JSON.parse(cleanedResponse);

  // Step 3: 提取错误数组
  if (Array.isArray(parsed)) {
    return parsed.map(error => this.validateAndNormalizeError(error));
  } else if (parsed.errors && Array.isArray(parsed.errors)) {
    return parsed.errors.map((error: any) => this.validateAndNormalizeError(error));
  }

  return [];
}
```

**validateAndNormalizeError() 方法**:

```typescript
private validateAndNormalizeError(error: any): LogicError {
  // 归一化置信度 (0-100 范围)
  let confidence = 80; // 默认值
  if (typeof error.confidence === 'number') {
    confidence = Math.min(Math.max(error.confidence, 0), 100);
  }

  return {
    id: error.id || uuidv4(),
    type: this.normalizeErrorType(error.type),      // timeline/character/plot/dialogue/scene
    severity: this.normalizeSeverity(error.severity), // critical/high/medium/low
    location: error.location || {},
    description: error.description || 'Unspecified error',
    suggestion: error.suggestion,
    context: error.context,
    relatedElements: error.relatedElements,
    confidence
  };
}
```

#### 1.4 严重度映射

**AI 输出 → 数据库存储**:

```typescript
// AI 输出 4 个等级
AI: critical, high, medium, low

// 数据库存储 3 个等级 (在 WorkflowQueue 中映射)
severity: (error.severity === 'critical' || error.severity === 'high') ? 'critical' :
         error.severity === 'medium' ? 'warning' : 'info'

// 前端显示
critical → '高'
warning  → '中'
info     → '低'
```

#### 1.5 分块处理（analyzeScript 方法）

**大型剧本优化**:

```typescript
private createAnalysisChunks(
  scriptContent: string,
  script: ParsedScript
): AnalysisChunk[] {
  const chunks: AnalysisChunk[] = [];
  const scenesPerChunk = this.config.chunkSize; // 默认 3-5 场

  for (let i = 0; i < script.scenes.length; i += scenesPerChunk) {
    const endIndex = Math.min(i + scenesPerChunk, script.scenes.length);
    const chunkScenes = script.scenes.slice(i, endIndex);

    chunks.push({
      startScene: i + 1,
      endScene: endIndex,
      content: this.preprocessScript({ ...script, scenes: chunkScenes }),
      characterContext: new Set(chunkScenes.flatMap(s => s.dialogues.map(d => d.character)))
    });
  }

  return chunks;
}
```

**并行处理批次**:

```typescript
// 最大并发数: 3 个分块
const MAX_CONCURRENT_CHUNKS = 3;

for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
  const batch = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);
  const results = await Promise.allSettled(
    batch.map((chunk, idx) => this.analyzeChunk(chunk, i + idx, chunks.length, ...))
  );

  // 合并结果
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allErrors.push(...result.value.errors);
    }
  }
}
```

---

### 2. PromptBuilder - 提示词构建器

**文件路径**: `lib/agents/prompts/consistency-prompts.ts`

#### 2.1 系统提示词

```typescript
export const SYSTEM_PROMPT = `【Prompt 1：设定角色与目标】

你的角色：一个顶级的剧本医生，沟通风格绝对客观、理智、精准，专注于结构化分析。

你的核心任务：为我检查剧本，专注于检测并列出以下几类核心逻辑错误：
1. 角色不一致（角色行为与动机矛盾、性格前后不符）
2. 时间线冲突（时间顺序混乱、时间跳跃不合理、同时性矛盾）
3. 情节漏洞（因果关系断裂、缺失关键铺垫、plot hole）
4. 对话逻辑错误（答非所问、信息凭空出现、对话不连贯）
5. 场景转换问题（空间逻辑矛盾、缺少必要过渡、位置冲突）

【关键要求】：
- 你必须用批判性思维，像侦探一样寻找每一个可疑之处
- 任何逻辑上说不通、需要观众"脑补"才能理解的地方，都要标记出来
- 宁可多报告潜在问题，也不要遗漏真实存在的硬伤
- 每个错误必须指明：错误类型、具体位置、问题描述、修复建议

你必须以有效的JSON格式输出分析结果。
请使用中文描述所有的错误和建议。`;
```

#### 2.2 用户提示词构建

```typescript
export function buildUserPrompt(
  scriptContent: string,
  checkTypes: LogicErrorType[] = ['timeline', 'character', 'plot', 'dialogue', 'scene'],
  maxErrors: number = 50
): string {
  return `【Prompt 2：输入剧本并要求分析】

这是需要诊断的剧本内容，请你开始执行核心任务。

## 剧本内容：
${scriptContent}

【Prompt 3：要求结构化反馈】

请以结构化报告的形式，向我呈现你的分析结果。报告需要明确指出每一个发现的潜在逻辑问题...

## 检测重点：
${rulesSection}

## 分析流程：
1. 逐场景扫描，建立时间线和角色状态追踪表
2. 交叉验证场景之间的信息一致性
3. 检查角色动机与行为的因果链条
4. 验证对话的逻辑连贯性和信息来源
5. 检查场景转换的空间和时间合理性
6. 返回最多${maxErrors}个最严重的错误（优先级：high > medium > low）

【重要】：如果发现逻辑问题，必须在location.content字段中包含问题所在的原始文本摘录

## 输出格式：
...（JSON 结构定义）
`;
}
```

#### 2.3 输出格式约束

```typescript
{
  "type": "timeline|character|plot|dialogue|scene",
  "severity": "critical|high|medium|low",
  "location": {
    "sceneNumber": <number>,
    "line": <line number>,
    "characterName": "<character name if applicable>",
    "dialogueIndex": <index if applicable>,
    "timeReference": "<time reference if applicable>",
    "content": "<原文：问题所在的原始文本摘录>"  // 必填
  },
  "description": "<不一致性的清晰、具体描述（中文）>",
  "suggestion": "<修复问题的具体建议（中文）>",
  "context": "<Relevant excerpt from the script>",
  "confidence": <0-100>,  // 置信度评分
  "relatedElements": ["<scene id>", "<character name>", etc.]
}
```

#### 2.4 置信度评分标准

```
90-100: 明确的逻辑错误（如时间线矛盾、角色信息冲突）
70-89:  很可能的问题（需要轻微推理才能发现）
50-69:  可能的问题（存在模糊性，但值得注意）
30-49:  不太确定的问题（可能是风格选择）
```

---

### 3. WorkflowQueue - 异步作业队列

**文件路径**: `lib/api/workflow-queue.ts`

#### 3.1 单例模式设计

```typescript
class WorkflowQueue {
  private static instance: WorkflowQueue;
  private processing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;
  private consistencyGuardian: ConsistencyGuardian;

  private constructor() {
    // 初始化 ConsistencyGuardian
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }
    this.consistencyGuardian = new ConsistencyGuardian(apiKey);

    // Serverless 环境检测
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (!isServerless) {
      // 传统服务器: 使用 setInterval
      this.processInterval = setInterval(() => {
        this.processNext();
      }, 3000);
      console.log('✅ WorkflowQueue: Started background processing');
    } else {
      // Serverless: 依赖手动触发
      console.log('⚡ WorkflowQueue: Serverless mode - use manual processing');
    }
  }

  static getInstance(): WorkflowQueue {
    if (!WorkflowQueue.instance) {
      WorkflowQueue.instance = new WorkflowQueue();
    }
    return WorkflowQueue.instance;
  }
}

export const workflowQueue = WorkflowQueue.getInstance();
```

#### 3.2 提交 ACT1 分析作业

```typescript
async submitAct1Analysis(projectId: string, scriptContent: string): Promise<string> {
  // Step 1: 更新工作流状态
  await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ACT1_RUNNING);

  // Step 2: 保存脚本版本 (V0 - 原始版本)
  await scriptVersionService.create({
    projectId,
    content: scriptContent,
    changeLog: 'Initial script for Act 1 analysis'
  });

  // Step 3: 创建分析作业
  const job = await analysisJobService.create({
    projectId,
    type: JobType.ACT1_ANALYSIS,
    metadata: {
      scriptLength: scriptContent.length,
      submittedAt: new Date().toISOString()
    }
  });

  // Step 4: 立即触发处理
  if (!this.processing) {
    setImmediate(() => this.processNext());
  }

  return job.id;
}
```

#### 3.3 处理 ACT1 分析作业

```typescript
private async processAct1Analysis(jobId: string, projectId: string): Promise<void> {
  try {
    // Step 1: 获取项目和最新脚本版本
    const [project, scriptVersion] = await Promise.all([
      projectService.findById(projectId),
      scriptVersionService.getLatest(projectId)
    ]);

    if (!project || !scriptVersion) {
      throw new Error('Project or script version not found');
    }

    // Step 2: 调用 ConsistencyGuardian 进行 AI 分析
    console.log('🚀 [ACT1 DEBUG] Starting AI analysis...');
    const analysisReport = await this.consistencyGuardian.analyzeScriptText(
      scriptVersion.content,
      `script-${projectId}`,
      ['timeline', 'character', 'plot', 'dialogue', 'scene'],
      50  // maxErrors
    );

    // Step 3: 转换为诊断报告格式
    const diagnosticData: DiagnosticReportData = {
      findings: (analysisReport.errors || []).map((error: LogicError) => ({
        type: this.mapErrorType(error.type),
        // 严重度映射: AI (critical/high/medium/low) → 数据库 (critical/warning/info)
        severity: (error.severity === 'critical' || error.severity === 'high') ? 'critical' :
                 error.severity === 'medium' ? 'warning' : 'info',
        location: {
          scene: error.location?.sceneNumber,
          line: error.location?.line,
          character: error.location?.characterName,
          content: error.location?.content  // 原始文本内容
        },
        description: error.description,
        suggestion: error.suggestion,
        // 归一化置信度 (0-1 范围)
        confidence: ((error as any).confidence || 80) > 1
          ? ((error as any).confidence || 80) / 100
          : (error as any).confidence || 0.8
      })),
      summary: `Detected ${(analysisReport.errors || []).length} logic errors`,
      overallConfidence: analysisReport.confidence || 0.85,
      metadata: {
        analysisTime: Date.now(),
        modelUsed: 'ConsistencyGuardian-v1',
        version: '1.0.0'
      }
    };

    // Step 4: 保存诊断报告
    await diagnosticReportService.upsert(projectId, diagnosticData);

    // Step 5: 完成作业
    await analysisJobService.complete(jobId, {
      errorCount: analysisReport.errors.length,
      confidence: analysisReport.confidence,
      completedAt: new Date().toISOString()
    });

    // Step 6: 更新工作流状态
    await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ACT1_COMPLETE);

  } catch (error) {
    console.error(`Failed to process Act 1 analysis for job ${jobId}:`, error);

    // 创建用户友好的错误消息
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
      // 超时提示
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        errorMessage = `分析超时：剧本可能过长或API响应缓慢。(${errorMessage})`;
      }
      // 频率限制
      else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = `API调用频率超限，请稍后重试。(${errorMessage})`;
      }
      // 网络错误
      else if (errorMessage.includes('API') || errorMessage.includes('network')) {
        errorMessage = `API连接失败，请检查网络或稍后重试。(${errorMessage})`;
      }
    }

    // 标记作业失败
    await analysisJobService.fail(jobId, errorMessage);

    // 重置工作流状态
    await projectService.updateWorkflowStatus(projectId, WorkflowStatus.INITIALIZED);

    throw error;
  }
}
```

#### 3.4 Serverless 手动处理

```typescript
async processNextManually(): Promise<{ processed: boolean; message: string; jobId?: string }> {
  if (this.processing) {
    return { processed: false, message: 'Already processing a job' };
  }

  const job = await analysisJobService.getNextQueued();

  if (!job) {
    return { processed: false, message: 'No jobs in queue' };
  }

  try {
    this.processing = true;
    await analysisJobService.startProcessing(job.id);

    // 同步执行（确保 Serverless 函数终止前完成）
    switch (job.type) {
      case JobType.ACT1_ANALYSIS:
        await this.processAct1Analysis(job.id, job.projectId);
        break;
      // ... 其他作业类型
    }

    return {
      processed: true,
      message: `Successfully processed job ${job.id}`,
      jobId: job.id
    };
  } catch (error) {
    return {
      processed: false,
      message: `Failed to process job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      jobId: job.id
    };
  } finally {
    this.processing = false;
  }
}
```

---

### 4. API 路由层

#### 4.1 POST /api/v1/analyze - 提交分析请求

**文件路径**: `app/api/v1/analyze/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      const userId = 'demo-user';

      // 解析和验证请求
      const body = await request.json();
      const validatedData = analyzeRequestSchema.parse(body);

      // 验证项目存在且用户有权限
      const project = await projectService.findById(validatedData.projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // 获取脚本内容
      let scriptContent = validatedData.scriptContent || project.content;
      if (!scriptContent) {
        throw new ValidationError('Script content is required');
      }

      // 提交 ACT1 分析作业
      const jobId = await workflowQueue.submitAct1Analysis(
        validatedData.projectId,
        scriptContent
      );

      // 返回 202 Accepted
      return NextResponse.json(
        createApiResponse({
          jobId,
          projectId: validatedData.projectId,
          status: 'processing',
          message: 'Act 1 analysis started successfully'
        }),
        { status: HTTP_STATUS.ACCEPTED }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
```

#### 4.2 GET /api/v1/analyze/jobs/:jobId - 轮询作业状态

**文件路径**: `app/api/v1/analyze/jobs/[jobId]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const jobStatus = await workflowQueue.getJobStatus(params.jobId);

      return NextResponse.json(
        createApiResponse({
          jobId: params.jobId,
          status: jobStatus.status,
          progress: jobStatus.progress,
          result: jobStatus.result,
          error: jobStatus.error
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
```

#### 4.3 POST /api/v1/analyze/process - Serverless 手动触发

**文件路径**: `app/api/v1/analyze/process/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      const result = await workflowQueue.processNextManually();

      return NextResponse.json(
        createApiResponse({
          processed: result.processed,
          message: result.message,
          jobId: result.jobId
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
```

#### 4.4 GET /api/v1/projects/:id/report - 获取诊断报告

**文件路径**: `app/api/v1/projects/[id]/report/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const projectId = params.id;

      // 获取诊断报告
      const report = await diagnosticReportService.getParsedReport(projectId);

      if (!report) {
        return NextResponse.json(
          createApiResponse({
            projectId,
            report: null
          }),
          { status: HTTP_STATUS.OK }
        );
      }

      // 计算统计信息
      const statistics = await diagnosticReportService.getStatistics(projectId);

      return NextResponse.json(
        createApiResponse({
          projectId,
          report: {
            id: report.id,
            findings: report.parsedFindings,
            summary: {
              totalErrors: statistics?.total || 0,
              highSeverity: statistics?.bySeverity?.critical || 0,
              mediumSeverity: statistics?.bySeverity?.warning || 0,
              lowSeverity: statistics?.bySeverity?.info || 0
            },
            confidence: report.confidence,
            statistics,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt
          }
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
```

#### 4.5 POST /api/v1/projects/:id/apply-act1-repair - 应用修复

**文件路径**: `app/api/v1/projects/[id]/apply-act1-repair/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const projectId = params.id;

      // 验证请求数据
      const body = await request.json();
      const validationResult = applyRepairSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', validationResult.error.message),
          { status: 400 }
        );
      }

      const { repairedScript, acceptedErrors, metadata } = validationResult.data;

      // 验证项目存在
      const project = await projectService.findById(projectId);
      if (!project) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', 'Project not found'),
          { status: 404 }
        );
      }

      // 创建 VersionManager 实例
      const versionManager = new VersionManager();

      // 创建新脚本版本 (V1 或下一个版本)
      const version = await versionManager.createVersion(
        projectId,
        repairedScript,
        {
          synthesisLog: [],
          decisionsApplied: ['ACT1_SMART_REPAIR'],
          confidence: acceptedErrors.length > 0
            ? acceptedErrors.reduce((sum, e) => sum + e.confidence, 0) / acceptedErrors.length
            : 0.9,
          timestamp: new Date(),
          previousVersion: 0  // ACT1 修复是第一个版本
        }
      );

      // 更新 Project.content
      await projectService.updateContent(projectId, repairedScript);

      // 更新工作流状态为 ITERATING (准备 ACT2-5)
      await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ITERATING);

      return NextResponse.json(
        createApiResponse({
          versionId: version.id,
          version: version.version,
          projectId,
          message: 'ACT1 修复已成功保存到项目',
          details: {
            errorsApplied: acceptedErrors.length,
            scriptLength: repairedScript.length,
            confidence: version.confidence
          }
        }),
        { status: 200 }
      );
    } catch (error) {
      // 总是返回 JSON，不抛出异常 (Serverless 兼容性)
      console.error('[ACT1 Repair] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : { error: String(error) };

      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', errorMessage, errorDetails),
        { status: 500 }
      );
    }
  });
}
```

---

### 5. 数据库服务层

#### 5.1 DiagnosticReportService

**文件路径**: `lib/db/services/diagnostic-report.service.ts`

**核心方法**:

```typescript
export class DiagnosticReportService extends BaseService {
  // Upsert 诊断报告
  async upsert(projectId: string, data: DiagnosticReportData): Promise<DiagnosticReport> {
    return await prisma.diagnosticReport.upsert({
      where: { projectId },
      create: {
        projectId,
        findings: data.findings as any,
        summary: data.summary,
        confidence: data.overallConfidence
      },
      update: {
        findings: data.findings as any,
        summary: data.summary,
        confidence: data.overallConfidence,
        updatedAt: new Date()
      }
    });
  }

  // 获取解析后的报告
  async getParsedReport(projectId: string): Promise<...> {
    const report = await this.getByProjectId(projectId);
    if (!report) return null;

    return {
      ...report,
      parsedFindings: report.findings as unknown as DiagnosticFinding[]
    };
  }

  // 按类型筛选
  async getFindingsByType(projectId: string, type: DiagnosticFinding['type']): Promise<...> {
    const report = await this.getParsedReport(projectId);
    if (!report) return [];

    return report.parsedFindings.filter(finding => finding.type === type);
  }

  // 统计信息
  async getStatistics(projectId: string): Promise<...> {
    const report = await this.getParsedReport(projectId);
    if (!report) return null;

    const findings = report.parsedFindings;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let totalConfidence = 0;

    findings.forEach(finding => {
      byType[finding.type] = (byType[finding.type] || 0) + 1;
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
      totalConfidence += finding.confidence;
    });

    return {
      total: findings.length,
      byType,
      bySeverity,
      averageConfidence: findings.length > 0 ? totalConfidence / findings.length : 0
    };
  }
}
```

---

### 6. 前端页面

#### 6.1 Analysis Page 核心逻辑

**文件路径**: `app/analysis/[id]/page.tsx`

**状态管理**:

```typescript
const [analysis, setAnalysis] = useState<any>(null);
const [errors, setErrors] = useState<AnalysisError[]>([]);
const [loading, setLoading] = useState(true);
const [jobStatus, setJobStatus] = useState<JobStatusData | null>(null);
const [pollingError, setPollingError] = useState<string | null>(null);
const [shouldPoll, setShouldPoll] = useState(true);
const [repairedScript, setRepairedScript] = useState('');
```

**轮询逻辑**:

```typescript
useEffect(() => {
  let isMounted = true;

  const fetchAnalysisStatus = async () => {
    if (!isMounted || !shouldPoll) return;

    try {
      // Step 1: 获取工作流状态
      const workflowStatus = await v1ApiService.getWorkflowStatus(params.id);

      if (!isMounted || !shouldPoll) return;

      // Step 2: 如果有活跃作业，轮询作业状态
      if (workflowStatus.latestJob) {
        // Serverless: 手动触发处理
        await v1ApiService.triggerProcessing();

        // 获取作业状态
        const status = await v1ApiService.getJobStatus(workflowStatus.latestJob.id);

        if (!isMounted || !shouldPoll) return;

        setJobStatus(status);

        // Step 3: 作业完成，获取诊断报告
        if (status.status === 'COMPLETED') {
          const report = await v1ApiService.getDiagnosticReport(params.id);

          if (!isMounted) return;

          if (report.report) {
            // 转换报告数据为前端格式
            const transformedErrors: AnalysisError[] = report.report.findings.map((finding, idx) => ({
              id: `error-${idx}`,
              type: finding.type,
              typeName: finding.type,
              severity: finding.severity as 'critical' | 'warning' | 'info',
              line: finding.location?.line || 0,
              content: finding.location?.content || '',
              description: finding.description,
              suggestion: finding.suggestion || '',
              confidence: finding.confidence
            }));

            setAnalysis(report.report);
            setErrors(transformedErrors);
          }
          setLoading(false);
          setShouldPoll(false);  // 停止轮询
        }
        // Step 4: 作业失败
        else if (status.status === 'FAILED') {
          setPollingError(status.error || '分析失败');
          setLoading(false);
          setShouldPoll(false);
        }
      } else {
        setLoading(false);
        setShouldPoll(false);
      }
    } catch (error) {
      if (!isMounted) return;
      console.error('获取分析状态失败:', error);
      setPollingError(error instanceof Error ? error.message : '获取分析状态失败');
    }
  };

  // 初始加载
  fetchAnalysisStatus();

  // 每 5 秒轮询一次
  const pollInterval = setInterval(fetchAnalysisStatus, 5000);

  return () => {
    isMounted = false;
    clearInterval(pollInterval);
  };
}, [params.id, shouldPoll]);
```

**用户交互**:

```typescript
// 接受错误修改
const handleAccept = (errorId: string) => {
  setErrors(prev => prev.map(error =>
    error.id === errorId ? { ...error, accepted: true } : error
  ));
};

// 拒绝错误修改
const handleReject = (errorId: string) => {
  setErrors(prev => prev.map(error =>
    error.id === errorId ? { ...error, accepted: false } : error
  ));
};

// AI 智能修复
const handleSmartRepair = async () => {
  const acceptedErrors = errors.filter(e => e.accepted === true);

  if (acceptedErrors.length === 0) {
    alert('请先选择要接受的修改建议');
    return;
  }

  setIsRepairing(true);

  try {
    const response = await fetch('/api/script-repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalScript: modifiedScript,
        acceptedErrors,
        rejectedErrors: errors.filter(e => e.accepted === false)
      })
    });

    if (!response.ok) {
      throw new Error('修复失败');
    }

    const result = await response.json();
    setRepairedScript(result.data.repairedScript);
    setShowPreview(true);
  } catch (error) {
    console.error('智能修复错误:', error);
    alert('智能修复失败，请稍后重试');
  } finally {
    setIsRepairing(false);
  }
};

// 保存修复结果
const saveRepairedScript = async () => {
  if (!repairedScript) {
    alert('没有可保存的修复结果');
    return;
  }

  const acceptedErrors = errors.filter(e => e.accepted === true);
  setIsSaving(true);

  try {
    const response = await fetch(`/api/v1/projects/${params.id}/apply-act1-repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repairedScript,
        acceptedErrors,
        metadata: {
          source: 'ACT1_SMART_REPAIR',
          errorCount: acceptedErrors.length,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      // 错误处理：检查 content-type
      let errorMessage = '保存失败';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error?.message || error.error || error.message || '保存失败';
        } else {
          const text = await response.text();
          errorMessage = text || `服务器错误 (${response.status})`;
        }
      } catch (e) {
        errorMessage = `服务器错误 (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // 成功提示
    alert(`✅ ${result.data.message}\n\n已应用 ${result.data.details.errorsApplied} 项修改\n版本号: V${result.data.version}`);

    // 跳转到迭代工作区
    router.push(`/iteration/${params.id}`);
  } catch (error) {
    console.error('保存失败:', error);
    alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    setIsSaving(false);
  }
};
```

---

## 完整数据流

### 从上传到诊断报告的完整流程

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 用户上传剧本 (Dashboard Page)                         │
│  - 用户选择文件 (.txt/.md/.markdown)                           │
│  - 验证文件大小 (500-10000 行)                                 │
│  - 点击 "开始AI分析" 按钮                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 创建项目 (POST /api/v1/projects)                     │
│  - userId: 'demo-user'                                       │
│  - title: 剧本标题                                            │
│  - content: 剧本内容                                          │
│  - workflowStatus: INITIALIZED                               │
│  - 返回: projectId                                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 提交分析请求 (POST /api/v1/analyze)                   │
│  - projectId: 项目ID                                          │
│  - scriptContent: 剧本内容（可选，使用 project.content）       │
│  - 调用: workflowQueue.submitAct1Analysis()                  │
│  - 创建 AnalysisJob (type=ACT1_ANALYSIS, status=QUEUED)     │
│  - 更新 workflowStatus → ACT1_RUNNING                         │
│  - 返回: jobId (202 Accepted)                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 重定向到分析页面 (frontend)                            │
│  - router.push(`/analysis/${projectId}`)                     │
│  - 页面加载时开始轮询                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: 前端轮询作业状态 (每5秒)                               │
│  - GET /api/v1/projects/:id/status                           │
│  - 获取 latestJob.id                                         │
│  - POST /api/v1/analyze/process (Serverless 触发)           │
│  - GET /api/v1/analyze/jobs/:jobId                           │
│  - 显示进度条 (QUEUED=0%, PROCESSING=50%, COMPLETED=100%)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: 后台作业处理 (WorkflowQueue)                          │
│  - processNext() 每 3 秒检查队列                              │
│  - 或 processNextManually() (Serverless 手动触发)            │
│  - 检测到 QUEUED 作业                                          │
│  - 更新状态 → PROCESSING                                       │
│  - 调用 processAct1Analysis(jobId, projectId)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: AI 分析执行 (ConsistencyGuardian)                     │
│  - 获取最新脚本版本                                            │
│  - 调用 analyzeScriptText(scriptContent, scriptId, ...)     │
│  - 构建提示词 (PromptBuilder)                                 │
│  - 调用 DeepSeek API (timeout: 120s)                         │
│  - 解析 AI 响应 (JSON 格式)                                   │
│  - 验证和归一化错误                                            │
│  - 去重和严重度映射                                            │
│  - 生成分析报告                                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: 保存诊断报告 (DiagnosticReportService)                │
│  - 转换错误格式 (LogicError → DiagnosticFinding)             │
│  - 严重度映射:                                                 │
│    AI (critical/high) → DB (critical)                        │
│    AI (medium)       → DB (warning)                          │
│    AI (low)          → DB (info)                             │
│  - upsert DiagnosticReport:                                  │
│    - findings: DiagnosticFinding[]                           │
│    - summary: string                                         │
│    - confidence: number (0-1)                                │
│  - 计算统计信息 (byType, bySeverity)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 9: 完成作业并更新状态                                     │
│  - AnalysisJob.status → COMPLETED                            │
│  - AnalysisJob.result = { errorCount, confidence, ... }     │
│  - Project.workflowStatus → ACT1_COMPLETE                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 10: 前端获取诊断报告                                      │
│  - 轮询检测到 status=COMPLETED                                 │
│  - GET /api/v1/projects/:id/report                           │
│  - 转换 findings 为前端格式                                    │
│  - 显示诊断结果:                                               │
│    - 总错误数、高/中/低严重度统计                              │
│    - 错误列表（按类型分组）                                    │
│    - 每个错误的详细信息（位置、描述、建议、置信度）             │
│  - 停止轮询 (setShouldPoll(false))                           │
└─────────────────────────────────────────────────────────────┘
```

### 用户修复流程

```
┌─────────────────────────────────────────────────────────────┐
│ Step 11: 用户查看并选择错误修改                                │
│  - 用户点击 "接受修改" 或 "拒绝修改"                           │
│  - 前端更新 error.accepted = true/false                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 12: AI 智能修复 (可选)                                   │
│  - 用户点击 "开始AI智能修复" 按钮                              │
│  - POST /api/script-repair                                   │
│  - 输入:                                                      │
│    - originalScript: 原始剧本                                 │
│    - acceptedErrors: 用户接受的错误列表                       │
│    - rejectedErrors: 用户拒绝的错误列表                       │
│  - AI 生成修复后的剧本                                         │
│  - 前端显示预览对话框                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 13: 保存修复结果                                          │
│  - 用户点击 "保存并进入创作工作区" 按钮                        │
│  - POST /api/v1/projects/:id/apply-act1-repair               │
│  - 输入:                                                      │
│    - repairedScript: 修复后的剧本                             │
│    - acceptedErrors: 接受的错误列表                           │
│    - metadata: { source, errorCount, timestamp }            │
│  - 创建 ScriptVersion V1:                                    │
│    - content: repairedScript                                 │
│    - decisionsApplied: ['ACT1_SMART_REPAIR']                │
│    - confidence: 平均置信度                                   │
│  - 更新 Project.content = repairedScript                     │
│  - 更新 workflowStatus → ITERATING                            │
│  - 返回: versionId, version, details                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 14: 跳转到迭代工作区                                      │
│  - router.push(`/iteration/${projectId}`)                    │
│  - 用户可以继续 ACT2-5 创作深化                                │
│  - 或直接导出 V1 剧本                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键技术决策

### 1. 为什么使用 `analyzeScriptText()` 而不是 `analyzeScript()`?

**问题**:
- `analyzeScript()` 使用 `parseScriptClient()` 解析剧本
- 解析器可能生成 artifacts，例如 `Location: undefined`
- AI 会误报这些 artifacts 为错误

**解决方案**:
- ACT1 使用 `analyzeScriptText()` 直接分析原始文本
- 避免解析器引入的问题
- 提高检测准确性

**代码位置**: `lib/agents/consistency-guardian.ts:42-113`

---

### 2. 为什么需要严重度映射?

**问题**:
- AI 输出 4 个严重度等级：`critical`, `high`, `medium`, `low`
- 数据库只存储 3 个等级：`critical`, `warning`, `info`
- 前端显示也需要映射到中文标签

**映射规则**:
```
AI 输出         → 数据库存储   → 前端显示
critical        → critical    → 高
high            → critical    → 高
medium          → warning     → 中
low             → info        → 低
```

**代码位置**: `lib/api/workflow-queue.ts:259`

---

### 3. 为什么需要 Serverless 手动触发?

**问题**:
- Serverless 环境（Vercel）不支持 `setInterval()`
- 函数在请求完成后立即终止
- 所有定时器回调被清除
- 作业会永远停留在 QUEUED 状态

**解决方案**:
- **双模式架构**:
  - 传统服务器: 使用 `setInterval()` 每 3 秒处理队列
  - Serverless: 前端轮询时调用 `POST /api/v1/analyze/process` 手动触发
- **Active Polling Pattern**:
  - 前端每次轮询作业状态前，先调用 `triggerProcessing()`
  - 确保作业在 5 秒内被处理

**代码位置**:
- `lib/api/workflow-queue.ts:25-47` (环境检测)
- `lib/api/workflow-queue.ts:137-184` (手动处理)
- `lib/services/v1-api-service.ts:264-286` (前端触发)

---

### 4. 为什么置信度需要归一化?

**问题**:
- AI 可能返回 0-100 的百分比
- 也可能返回 0-1 的小数
- 数据库统一存储 0-1 范围

**归一化逻辑**:
```typescript
// AI 响应可能是百分比 (80) 或小数 (0.8)
confidence: ((error as any).confidence || 80) > 1
  ? ((error as any).confidence || 80) / 100  // 百分比 → 小数
  : (error as any).confidence || 0.8         // 已经是小数
```

**代码位置**: `lib/api/workflow-queue.ts:270-272`

---

### 5. 为什么 API 错误处理总是返回 JSON?

**问题**:
- Serverless 环境中，抛出异常会导致 Next.js 返回 HTML 错误页面
- 前端无法解析 HTML，导致错误处理失败

**解决方案**:
- **永远不要在 API handler 中 throw**
- 使用 `try-catch` 包裹所有逻辑
- 返回 `NextResponse.json(createErrorResponse(...), { status: 500 })`
- 前端检查 `content-type` 头部后再解析

**代码位置**: `app/api/v1/projects/[id]/apply-act1-repair/route.ts:146-161`

---

## 性能优化策略

### 1. 分块处理 (Chunking)

**适用场景**: 大型剧本 (>3000 行)

**策略**:
- 按场景分块（每块 3-5 场）
- 并行处理批次（最大并发 3 个）
- 保留上下文（前一块的最后 20 行）

**代码**:
```typescript
const MAX_CONCURRENT_CHUNKS = 3;

for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
  const batch = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);
  const results = await Promise.allSettled(
    batch.map((chunk, idx) => this.analyzeChunk(chunk, i + idx, ...))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allErrors.push(...result.value.errors);
    }
  }
}
```

---

### 2. 缓存机制

**实现**:
- 使用 `Map` 存储分析结果
- TTL: 15 分钟
- 最大缓存大小: 100 个项目
- FIFO 淘汰策略

**代码**:
```typescript
private cache: Map<string, { result: ConsistencyAnalysisResult; expires: number }>;

// 生成缓存键
private generateCacheKey(request: ConsistencyCheckRequest): string {
  const checkTypes = request.checkTypes?.sort().join(',') || 'all';
  const threshold = request.severityThreshold || 'none';
  return `${request.script.id}-${checkTypes}-${threshold}`;
}

// 维护缓存大小
private maintainCacheSize(): void {
  const now = Date.now();

  // 移除过期条目
  for (const [key, value] of Array.from(this.cache.entries())) {
    if (value.expires <= now) {
      this.cache.delete(key);
    }
  }

  // FIFO 淘汰
  if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
    const entriesToRemove = this.cache.size - CACHE_CONFIG.MAX_SIZE + 1;
    const keys = Array.from(this.cache.keys());
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(keys[i]);
    }
  }
}
```

---

### 3. 前端轮询优化

**策略**:
- 轮询间隔: 5 秒（降低 API 调用频率）
- 最大轮询次数: 60 次（5 分钟超时）
- 作业完成后立即停止轮询
- 使用 `AbortController` 支持取消

**代码**:
```typescript
const [shouldPoll, setShouldPoll] = useState(true);

useEffect(() => {
  let isMounted = true;
  const pollInterval = setInterval(fetchAnalysisStatus, 5000);

  return () => {
    isMounted = false;
    clearInterval(pollInterval);
  };
}, [params.id, shouldPoll]);

// 停止轮询
useEffect(() => {
  if (!shouldPoll && pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;
  }
}, [shouldPoll]);
```

---

## 错误处理机制

### 1. 超时处理

**配置**:
- DeepSeek API 超时: 120 秒
- 短时间状态检查: 10 秒
- 前端轮询总超时: 5 分钟

**用户友好的错误消息**:
```typescript
if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
  errorMessage = `分析超时：剧本可能过长或API响应缓慢。请稍后重试或联系技术支持。(${errorMessage})`;
}
```

---

### 2. API 频率限制

**处理**:
```typescript
if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
  errorMessage = `API调用频率超限，请稍后重试。(${errorMessage})`;
}
```

---

### 3. 网络错误

**处理**:
```typescript
if (errorMessage.includes('API') || errorMessage.includes('network')) {
  errorMessage = `API连接失败，请检查网络或稍后重试。(${errorMessage})`;
}
```

---

### 4. 前端错误处理模式

**content-type 检查**:
```typescript
if (!response.ok) {
  let errorMessage = '保存失败';
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      errorMessage = error.error?.message || error.error || '保存失败';
    } else {
      const text = await response.text();
      errorMessage = text || `服务器错误 (${response.status})`;
    }
  } catch (e) {
    errorMessage = `服务器错误 (${response.status})`;
  }
  throw new Error(errorMessage);
}
```

---

## Serverless 适配

### 环境检测

```typescript
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isServerless) {
  // 传统服务器模式
  this.processInterval = setInterval(() => {
    this.processNext();
  }, 3000);
} else {
  // Serverless 模式
  console.log('⚡ WorkflowQueue: Serverless mode - use manual processing');
}
```

---

### 手动触发端点

```typescript
// API Route: app/api/v1/analyze/process/route.ts
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    const result = await workflowQueue.processNextManually();
    return NextResponse.json(createApiResponse(result), { status: 200 });
  });
}
```

---

### 前端集成

```typescript
// lib/services/v1-api-service.ts
async triggerProcessing(): Promise<void> {
  try {
    await this.fetchWithTimeout(
      `${API_BASE_URL}/analyze/process`,
      { method: 'POST' },
      15000  // 15 秒超时
    );
  } catch (error) {
    // 静默失败 - 不影响轮询
    console.warn('Processing trigger error:', error);
  }
}

// 在轮询循环中调用
async pollJobStatus(jobId: string) {
  while (attempts < MAX_POLL_ATTEMPTS) {
    // Serverless: 触发处理
    await this.triggerProcessing();

    // 检查状态
    const status = await this.getJobStatus(jobId);

    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
      return status;
    }

    await this.delay(POLL_INTERVAL);
  }
}
```

---

## 常见问题排查

### 问题 1: 作业永远停留在 QUEUED 状态

**症状**:
- 作业创建成功，但一直显示 QUEUED
- 轮询超过 5 分钟仍未完成

**排查步骤**:

1. **检查环境变量**:
   ```bash
   # 确认 DeepSeek API Key 存在
   echo $DEEPSEEK_API_KEY

   # 确认数据库连接正常
   echo $DATABASE_URL
   ```

2. **检查 Serverless 模式**:
   ```bash
   # 查看后端日志
   # 应该看到: "⚡ WorkflowQueue: Serverless mode - use manual processing"
   # 而不是: "✅ WorkflowQueue: Started background processing"
   ```

3. **检查手动触发**:
   ```typescript
   // 前端应该调用 triggerProcessing()
   await v1ApiService.triggerProcessing();
   ```

4. **使用调试脚本**:
   ```bash
   npx tsx scripts/debug-act1-analysis.ts <jobId>
   ```

**解决方案**:
- 确保前端在轮询时调用 `triggerProcessing()`
- 检查 `/api/v1/analyze/process` 端点是否正常工作
- 检查 Vercel 函数日志查看错误信息

---

### 问题 2: 统计显示 0 错误但列表有项目

**症状**:
- 总错误数显示 0
- 但错误列表中有多个错误显示

**原因**:
- 严重度值不匹配
- 数据库存储 `critical/warning/info`
- 前端期望 `critical/warning/info`
- 统计计算时严重度键不匹配

**解决方案**:
- 确保严重度映射一致
- 检查 `workflowQueue.ts:259` 的映射逻辑
- 检查 `diagnosticReportService.getStatistics()` 的统计逻辑

---

### 问题 3: 所有置信度分数都是 80%

**症状**:
- 所有错误的置信度都显示 80%
- 没有差异化

**原因**:
- AI 没有输出 confidence 字段
- 使用默认值 80

**解决方案**:
- 检查 AI 提示词是否要求多样化的置信度
- 检查 `parseAIResponse()` 是否正确提取 confidence
- 更新提示词强调置信度的重要性

**提示词改进**:
```
confidence: 置信度（0-100），基于以下标准：
  * 90-100: 明确的逻辑错误
  * 70-89: 很可能的问题
  * 50-69: 可能的问题
  * 30-49: 不太确定的问题

**重要**: 必须根据问题的明确程度给出合理评分，不要都使用相同值
```

---

### 问题 4: API 返回 HTML 而不是 JSON

**症状**:
- 前端报错 "Unexpected token '<'"
- API 返回 HTML 错误页面

**原因**:
- Serverless 环境中抛出异常
- Next.js 返回 HTML 错误页面

**解决方案**:
- **永远不要在 API handler 中 throw**
- 使用 `try-catch` 包裹所有逻辑
- 返回 JSON 响应

**正确模式**:
```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // 业务逻辑
      return NextResponse.json(createApiResponse(data), { status: 200 });
    } catch (error) {
      // ✅ 返回 JSON，不抛出
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', error.message),
        { status: 500 }
      );
    }
  });
}
```

---

### 问题 5: 分析超时 (504 Gateway Timeout)

**症状**:
- 大型剧本分析失败
- Vercel 返回 504 错误

**原因**:
- Vercel Hobby Plan 限制 10 秒超时
- 大型剧本需要更长时间

**解决方案**:

1. **升级 Vercel Plan**:
   - Pro Plan: 60 秒超时
   - 在 `vercel.json` 中配置:
   ```json
   {
     "functions": {
       "app/api/v1/analyze/route.ts": {
         "maxDuration": 60
       },
       "app/api/v1/analyze/process/route.ts": {
         "maxDuration": 60
       }
     }
   }
   ```

2. **优化 DeepSeek 超时**:
   ```typescript
   // lib/agents/consistency-guardian.ts
   this.client = new DeepSeekClient({
     apiKey,
     timeout: 120000  // 120 秒
   });
   ```

3. **使用分块处理**:
   - 对于 >6000 tokens 的剧本自动分块
   - 并行处理批次

---

## 性能指标

### 典型处理时间

| 剧本大小 | 行数 | 场景数 | 处理时间 | 超时风险 |
|---------|------|-------|---------|---------|
| 小型 | 500-1000 | 10-20 | 10-20秒 | 低 |
| 中型 | 1000-3000 | 20-50 | 30-60秒 | 中 |
| 大型 | 3000-10000 | 50-150 | 2-5分钟 | 高 |

### 资源使用

- **内存**: 最大 256MB (Serverless)
- **API 调用**: 1-3 次 DeepSeek API (取决于分块)
- **数据库操作**: 约 10-15 次查询

---

## 总结

ACT1 是 ScriptAI 系统的基础模块，负责快速检测并修复剧本中的逻辑错误。通过：

1. **AI 驱动分析**: 使用 ConsistencyGuardian 和 DeepSeek API 检测 5 类逻辑错误
2. **异步作业队列**: WorkflowQueue 管理后台处理，支持 Serverless 环境
3. **实时状态轮询**: 前端每 5 秒轮询作业状态，提供实时反馈
4. **智能修复**: 用户可以接受/拒绝 AI 建议，并使用 AI 智能修复生成新剧本
5. **版本管理**: 修复结果保存为 V1 版本，为 ACT2-5 创作深化打基础

**关键特性**:
- ✅ 5-10 分钟快速分析
- ✅ 5 类逻辑错误检测
- ✅ 中文语言优化
- ✅ Serverless 完全兼容
- ✅ 用户友好的错误处理
- ✅ 实时进度反馈

**下一步**:
- 用户可以选择直接导出 V1 剧本
- 或进入 ACT2-5 创作工作区进行角色、世界观、节奏、主题的深化创作

---

**参考文档**:
- `BUSINESS_FLOW.md` - 完整业务流程
- `CLAUDE.md` - 开发指南
- `ref/AI_AGENTS.md` - AI Agents 详细文档
- `ref/API_REFERENCE.md` - API 完整文档
- `docs/fixes/` - 常见问题修复记录

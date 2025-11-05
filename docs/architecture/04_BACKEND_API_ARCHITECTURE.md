# 04 - 后端API架构文档

**版本**: 1.0.0
**更新日期**: 2025-10-11
**状态**: 生产就绪 ✅

---

## 📋 目录

1. [架构概览](#1-架构概览)
2. [API路由结构](#2-api路由结构)
3. [中间件栈](#3-中间件栈)
4. [异步任务队列](#4-异步任务队列)
5. [服务层](#5-服务层)
6. [错误处理](#6-错误处理)
7. [性能优化](#7-性能优化)

---

## 1. 架构概览

### 1.1 架构模式

```
Client Request
    ↓
API Route Handler (Next.js App Router)
    ↓
Middleware Stack (认证/限流/验证)
    ↓
Service Layer (业务逻辑)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### 1.2 设计原则

| 原则 | 实现 |
|-----|------|
| **Serverless-First** | 无状态、超时配置、连接池 |
| **API-First** | RESTful、标准化响应 |
| **类型安全** | Zod验证、TypeScript |
| **异步优先** | 长任务用Job队列 |
| **单一数据源** | 数据库是唯一真实来源 |

### 1.3 技术栈

| 技术 | 版本 | 用途 |
|-----|------|-----|
| **Next.js** | 14.2.32 | API Routes框架 |
| **Prisma** | 5.22.0 | ORM、类型生成 |
| **Zod** | 3.23.8 | Schema验证 |
| **PostgreSQL** | 16 | 数据库 |

---

## 2. API路由结构

### 2.1 V1 API完整清单

**项目管理**
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects` - 列出项目
- `GET /api/v1/projects/[id]` - 获取项目详情 ✨ NEW 2025-10-09

**ACT1分析**
- `POST /api/v1/analyze` - 启动ACT1分析
- `POST /api/v1/analyze/process` - 手动触发处理 ✨ NEW 2025-10-09（Serverless）
- `GET /api/v1/analyze/jobs/:jobId` - 查询Job状态
- `GET /api/v1/projects/[id]/status` - 查询工作流状态
- `GET /api/v1/projects/[id]/report` - 获取诊断报告
- `POST /api/v1/projects/[id]/apply-act1-repair` - 应用ACT1修复 ✨ NEW 2025-10-10

**ACT2-5迭代**
- `POST /api/v1/iteration/propose` - 生成AI提案（异步Job）✨ ASYNC 2025-10-10
- `GET /api/v1/iteration/jobs/[jobId]` - 轮询提案Job状态 ✨ NEW 2025-10-10
- `POST /api/v1/iteration/execute` - 执行选中提案
- `GET /api/v1/projects/:id/decisions` - 查询决策历史

**合成（Epic 007）**
- `POST /api/v1/synthesize` - 触发合成
- `GET /api/v1/synthesize/:jobId/status` - 查询合成状态
- `GET /api/v1/projects/:id/versions` - 列出版本
- `GET /api/v1/versions/:id` - 获取版本详情
- `GET /api/v1/versions/:id/diff/:targetId` - 版本对比

**导出**
- `POST /api/v1/export` - 导出剧本
- `GET /api/v1/export/:jobId` - 下载文件

**跨文件分析（Sprint 3）**
- `POST /api/v1/projects/[id]/analyze/cross-file` - 跨文件分析
- `GET /api/v1/projects/[id]/cross-file-findings` - 获取跨文件问题

---

### 2.2 路由实现模式

#### 标准路由Handler

**文件**: `app/api/v1/projects/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { z } from 'zod';

// Zod验证Schema
const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(100),
  description: z.string().optional()
});

// POST /api/v1/projects
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // 1. 解析请求体
      const body = await request.json();

      // 2. Zod验证
      const result = createProjectSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', result.error.message),
          { status: 400 }
        );
      }

      // 3. 业务逻辑（调用Service层）
      const project = await projectService.create({
        userId: 'demo-user',
        title: result.data.title,
        content: result.data.content,
        description: result.data.description
      });

      // 4. 标准化响应
      return NextResponse.json(
        createApiResponse(project),
        { status: 201 }
      );

    } catch (error) {
      // ✅ 关键：始终返回JSON，从不throw
      console.error('[POST /projects] Error:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error'),
        { status: 500 }
      );
    }
  });
}

// GET /api/v1/projects
export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const projects = await projectService.list('demo-user', page, limit);

    return NextResponse.json(createApiResponse(projects));
  });
}
```

#### 动态路由参数

**文件**: `app/api/v1/projects/[id]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMiddleware(request, async () => {
    const { id } = params;

    const project = await projectService.getById(id);

    if (!project) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Project not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(project));
  });
}
```

#### 异步Job创建

**文件**: `app/api/v1/analyze/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    const { projectId, scriptContent } = await request.json();

    // 创建异步Job
    const job = await prisma.analysisJob.create({
      data: {
        projectId,
        type: 'ACT1_ANALYSIS',
        status: 'QUEUED',
        input: { scriptContent }
      }
    });

    // 立即返回jobId（不等待处理）
    return NextResponse.json(
      createApiResponse({ jobId: job.id, status: 'QUEUED' }),
      { status: 202 }  // Accepted
    );
  });
}
```

---

## 3. 中间件栈

### 3.1 withMiddleware包装器

**文件**: `lib/api/middleware/index.ts`

```typescript
export async function withMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  try {
    // 1. CORS（开发环境）
    if (process.env.NODE_ENV === 'development') {
      // Allow localhost:3000
    }

    // 2. Rate Limiting（可禁用）
    if (process.env.DISABLE_RATE_LIMIT !== 'true') {
      const rateLimitResult = await checkRateLimit(request);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          createErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests'),
          { status: 429 }
        );
      }
    }

    // 3. Authentication（未来实现）
    // const user = await authenticate(request)

    // 4. 执行handler
    return await handler();

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Server error'),
      { status: 500 }
    );
  }
}
```

### 3.2 Rate Limiting

**文件**: `lib/api/middleware/rate-limit.ts`

```typescript
import { RateLimiter } from 'limiter';

// 生产环境：10 req/min
// 开发环境：100 req/min
const limiter = new RateLimiter({
  tokensPerInterval: process.env.NODE_ENV === 'production' ? 10 : 100,
  interval: 'minute'
});

export async function checkRateLimit(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const remaining = await limiter.removeTokens(1);

  return {
    success: remaining >= 0,
    remaining: Math.max(0, remaining)
  };
}
```

### 3.3 Zod验证

**共享Schema**: `lib/api/schemas/`

```typescript
// lib/api/schemas/project.schema.ts
export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(100).max(1000000),
  description: z.string().max(500).optional()
});

export const updateProjectSchema = createProjectSchema.partial();

// lib/api/schemas/iteration.schema.ts
export const proposeSchema = z.object({
  projectId: z.string().cuid(),
  act: z.enum(['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME']),
  focusName: z.string().min(1),
  contradiction: z.string().min(10),
  scriptContext: z.string().optional()
});
```

---

## 4. 异步任务队列

### 4.1 WorkflowQueue架构

**文件**: `lib/api/workflow-queue.ts`

**设计**:
- 单例模式（全局唯一实例）
- 双模式运行：传统服务器 vs Serverless
- Job类型：ACT1_ANALYSIS, ITERATION, SYNTHESIS, EXPORT

```typescript
class WorkflowQueue {
  private static instance: WorkflowQueue;
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (!isServerless) {
      // 传统服务器：后台处理
      this.processInterval = setInterval(() => {
        this.processNext();
      }, 3000);
    } else {
      // Serverless：手动触发模式
      console.log('⚡ WorkflowQueue: Serverless mode - use manual processing');
    }
  }

  static getInstance(): WorkflowQueue {
    if (!WorkflowQueue.instance) {
      WorkflowQueue.instance = new WorkflowQueue();
    }
    return WorkflowQueue.instance;
  }

  // 处理下一个Job
  async processNext() {
    if (this.processing) return;

    try {
      this.processing = true;

      // 查询最早的QUEUED job
      const job = await prisma.analysisJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' }
      });

      if (!job) {
        this.processing = false;
        return;
      }

      // 更新为PROCESSING
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'PROCESSING', startedAt: new Date() }
      });

      // 根据类型路由
      if (job.type === 'ACT1_ANALYSIS') {
        await this.processAct1Analysis(job);
      } else if (job.type === 'ITERATION') {
        await this.processIteration(job);
      } else if (job.type === 'SYNTHESIS') {
        await this.processSynthesis(job);
      }

    } catch (error) {
      console.error('[WorkflowQueue] Error:', error);
    } finally {
      this.processing = false;
    }
  }

  // 手动处理（Serverless）
  async processNextManually() {
    return this.processNext();
  }

  // ACT1分析处理
  private async processAct1Analysis(job: AnalysisJob) {
    const { projectId, input } = job;

    try {
      // 1. 获取项目
      const project = await prisma.project.findUnique({ where: { id: projectId } });

      // 2. 调用ConsistencyGuardian
      const agent = createConsistencyGuardian(process.env.DEEPSEEK_API_KEY!);
      const result = await agent.analyzeScriptText(project.content);

      // 3. 映射严重度（AI输出4级 → 数据库3级）
      const mappedFindings = result.errors.map(error => ({
        ...error,
        severity: mapSeverity(error.severity)  // critical/high → critical, medium → warning, low → info
      }));

      // 4. 创建DiagnosticReport
      await prisma.diagnosticReport.create({
        data: {
          projectId,
          findings: mappedFindings,
          summary: `发现${result.errors.length}个问题`,
          statistics: {
            total: result.errors.length,
            bySeverity: groupBySeverity(mappedFindings),
            byType: groupByType(mappedFindings)
          }
        }
      });

      // 5. 更新Project状态
      await prisma.project.update({
        where: { id: projectId },
        data: { workflowStatus: 'ACT1_COMPLETE' }
      });

      // 6. 标记Job完成
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: { errorsFound: result.errors.length }
        }
      });

    } catch (error) {
      // 标记失败
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
    }
  }

  // ITERATION处理（ACT2-5）
  private async processIteration(job: AnalysisJob) {
    const { input } = job;
    const { projectId, act, focusName, contradiction, scriptContext } = input;

    try {
      // 动态导入Agent（Code Splitting for Serverless）
      let agent;
      if (act === 'ACT2_CHARACTER') {
        const { createCharacterArchitect } = await import('@/lib/agents/character-architect');
        agent = createCharacterArchitect(process.env.DEEPSEEK_API_KEY!);
      } else if (act === 'ACT3_WORLDBUILDING') {
        const { createRulesAuditor } = await import('@/lib/agents/rules-auditor');
        agent = createRulesAuditor(process.env.DEEPSEEK_API_KEY!);
      }
      // ... ACT4, ACT5

      // 调用Agent生成提案
      const proposals = await agent.generateProposals(focusName, contradiction, scriptContext);

      // 创建RevisionDecision
      const decision = await prisma.revisionDecision.create({
        data: {
          projectId,
          act,
          focusContext: { focusName, contradiction, scriptContext },
          proposals: proposals.proposals,
          aiRecommendation: proposals.recommendation
        }
      });

      // 更新Job
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          result: {
            decisionId: decision.id,
            focusContext: decision.focusContext,
            proposals: decision.proposals,
            recommendation: decision.aiRecommendation
          },
          completedAt: new Date()
        }
      });

    } catch (error) {
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: String(error), completedAt: new Date() }
      });
    }
  }
}

export const workflowQueue = WorkflowQueue.getInstance();
```

### 4.2 手动触发端点（Serverless）

**文件**: `app/api/v1/analyze/process/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // 手动触发一次处理
      await workflowQueue.processNextManually();

      return NextResponse.json(
        createApiResponse({
          processed: 1,
          message: 'Job processing triggered'
        })
      );
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('PROCESSING_ERROR', String(error)),
        { status: 500 }
      );
    }
  });
}
```

---

## 5. 服务层

### 5.1 服务架构

**目录**: `lib/db/services/`

**职责分离**:
- Service层：业务逻辑、数据验证、事务管理
- Prisma：数据访问、类型安全

#### ProjectService

**文件**: `lib/db/services/project.service.ts`

```typescript
class ProjectService {
  // 创建项目
  async create(data: CreateProjectInput): Promise<Project> {
    return prisma.project.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
        description: data.description,
        workflowStatus: 'INITIALIZED'
      }
    });
  }

  // 获取项目（含关联数据）
  async getById(id: string): Promise<ProjectWithRelations | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        scriptVersions: true,
        diagnosticReport: true,
        analysisJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
  }

  // 列出项目（分页）
  async list(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.project.count({ where: { userId } })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 更新工作流状态
  async updateWorkflowStatus(id: string, status: WorkflowStatus): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { workflowStatus: status }
    });
  }
}

export const projectService = new ProjectService();
```

#### RevisionDecisionService

**文件**: `lib/db/services/revision-decision.service.ts`

```typescript
class RevisionDecisionService {
  // 创建决策（propose阶段）
  async create(data: CreateDecisionInput): Promise<RevisionDecision> {
    return prisma.revisionDecision.create({
      data: {
        projectId: data.projectId,
        act: data.act,
        focusContext: data.focusContext,
        proposals: data.proposals,
        aiRecommendation: data.aiRecommendation
      }
    });
  }

  // 执行决策（execute阶段）
  async execute(decisionId: string, proposalChoice: number, generatedChanges: any) {
    // 事务：更新决策 + 创建脚本版本
    return prisma.$transaction(async (tx) => {
      // 1. 更新决策
      const decision = await tx.revisionDecision.update({
        where: { id: decisionId },
        data: {
          userChoice: proposalChoice,
          generatedChanges,
          executedAt: new Date()
        }
      });

      // 2. 创建新脚本版本
      const latestVersion = await tx.scriptVersion.findFirst({
        where: { projectId: decision.projectId },
        orderBy: { version: 'desc' }
      });

      const newVersion = await tx.scriptVersion.create({
        data: {
          projectId: decision.projectId,
          version: (latestVersion?.version || 0) + 1,
          content: '...',  // 应用changes后的内容
          changeLog: `Applied ${decision.act} changes`,
          source: 'ITERATION'
        }
      });

      // 3. 更新项目工作流状态
      await tx.project.update({
        where: { id: decision.projectId },
        data: { workflowStatus: 'ITERATING' }
      });

      return { decision, version: newVersion };
    });
  }

  // 查询决策历史
  async listByProject(projectId: string, act?: string) {
    return prisma.revisionDecision.findMany({
      where: {
        projectId,
        ...(act && { act })
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 回滚决策
  async rollback(decisionId: string) {
    return prisma.revisionDecision.update({
      where: { id: decisionId },
      data: {
        userChoice: null,
        generatedChanges: null,  // ✅ 修复：使用null而非undefined
        executedAt: null
      }
    });
  }
}

export const revisionDecisionService = new RevisionDecisionService();
```

---

## 6. 错误处理

### 6.1 错误类型定义

```typescript
type ApiErrorCode =
  | 'VALIDATION_ERROR'      // 400: 请求参数错误
  | 'UNAUTHORIZED'          // 401: 未认证
  | 'FORBIDDEN'             // 403: 无权限
  | 'NOT_FOUND'             // 404: 资源不存在
  | 'CONFLICT'              // 409: 资源冲突
  | 'RATE_LIMIT_EXCEEDED'   // 429: 限流
  | 'INTERNAL_ERROR';       // 500: 服务器错误
```

### 6.2 标准化响应

**文件**: `lib/api/response.ts`

```typescript
// 成功响应
export function createApiResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

// 错误响应
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: any
) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
}
```

### 6.3 错误处理模式（CRITICAL - 2025-10-10）

**问题**: Serverless环境throw错误 → Next.js返回HTML错误页 → 前端JSON解析失败

**解决方案**: 永远返回JSON

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // 业务逻辑
      const result = await someOperation();

      return NextResponse.json(
        createApiResponse(result),
        { status: 200 }
      );

    } catch (error) {
      // ✅ 关键：捕获所有错误，返回JSON
      console.error('[Handler] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

**前端对应处理**:
```typescript
const response = await fetch('/api/v1/endpoint', { ... });

if (!response.ok) {
  let errorMessage = '操作失败';
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const error = await response.json();
      errorMessage = error.error?.message || '操作失败';
    } else {
      // HTML错误页
      const text = await response.text();
      errorMessage = `服务器错误 (${response.status})`;
    }
  } catch (e) {
    errorMessage = `服务器错误 (${response.status})`;
  }
  throw new Error(errorMessage);
}
```

---

## 7. 性能优化

### 7.1 Serverless优化

#### 函数超时配置

**vercel.json**:
```json
{
  "functions": {
    "app/api/v1/analyze/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/analyze/process/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/iteration/propose/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/synthesize/route.ts": {
      "maxDuration": 60
    }
  }
}
```

**要求**: Vercel Pro Plan（Hobby限制10秒）

#### 连接池优化

**DATABASE_URL**:
```
postgresql://user:pass@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**关键配置**:
- `pgbouncer=true`: 启用连接池
- `connection_limit=1`: Serverless每函数1连接

#### 冷启动优化

```typescript
// 动态导入（Code Splitting）
const agent = await import('@/lib/agents/character-architect')
  .then(m => m.createCharacterArchitect(apiKey));
```

### 7.2 数据库优化

#### 查询优化

```typescript
// ✅ 好：使用include避免N+1
const projects = await prisma.project.findMany({
  where: { userId },
  include: { scriptVersions: true }
});

// ❌ 坏：N+1查询
const projects = await prisma.project.findMany({ where: { userId } });
for (const project of projects) {
  const versions = await prisma.scriptVersion.findMany({ where: { projectId: project.id } });
}
```

#### 批量操作

```typescript
// ✅ 好：1次数据库往返
await prisma.scriptFile.createMany({ data: files });

// ❌ 坏：N次数据库往返
for (const file of files) {
  await prisma.scriptFile.create({ data: file });
}
```

### 7.3 AI调用优化

#### 超时配置

**lib/agents/types.ts**:
```typescript
export const DEFAULT_ANALYSIS_TIMEOUT = 120000;  // 120秒（2025-10-09优化）
```

**lib/api/deepseek/client.ts**:
```typescript
const timeout = 120000;  // 120秒
```

#### 并行分析（ConsistencyGuardian）

```typescript
// 将剧本分为N个块，并行分析
const chunks = splitIntoChunks(script, CHUNK_SIZE);
const results = await Promise.all(
  chunks.map(chunk => analyzeChunk(chunk))
);
const mergedResults = mergeResults(results);
```

---

## 8. Serverless兼容架构（2025-10-09）

### 8.1 问题背景

**传统服务器**:
```typescript
// ✅ 有效：setInterval持续运行
setInterval(() => workflowQueue.processNext(), 3000);
```

**Serverless**:
```typescript
// ❌ 无效：函数终止后回调丢失
setInterval(() => workflowQueue.processNext(), 3000);
// 请求返回后，Lambda/Vercel函数立即终止
```

### 8.2 双模式架构

```typescript
class WorkflowQueue {
  private constructor() {
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (!isServerless) {
      // 模式1：传统服务器（后台处理）
      this.processInterval = setInterval(() => {
        this.processNext();
      }, 3000);
      console.log('🖥️  Traditional server mode: background processing enabled');
    } else {
      // 模式2：Serverless（手动触发）
      console.log('⚡ Serverless mode: manual trigger required');
    }
  }

  // 公开接口供手动触发
  async processNextManually() {
    return this.processNext();
  }
}
```

### 8.3 手动触发流程

```
1. Client创建Job → POST /api/v1/analyze
   ↓
2. Job进入QUEUED状态（数据库）
   ↓
3. Client轮询（每5秒）：
   - POST /api/v1/analyze/process  ← 触发处理
   - GET /api/v1/analyze/jobs/:id  ← 检查状态
   ↓
4. WorkflowQueue.processNext()执行
   ↓
5. Job状态变为COMPLETED
   ↓
6. Client获取结果
```

---

## 9. ACT1修复API（2025-10-10）

### 9.1 端点设计

**POST /api/v1/projects/[id]/apply-act1-repair**

**职责**: 应用ACT1 AI智能修复结果

**输入**:
```typescript
{
  repairedScript: string,
  acceptedErrors: Array<{
    id: string,
    type: string,
    description: string
  }>,
  metadata: {
    source: 'ACT1_SMART_REPAIR',
    errorCount: number,
    timestamp: string
  }
}
```

**处理流程**:
```typescript
1. 获取项目（检查存在性）
2. 查找最新版本号（V0, V1, V2...）
3. 创建新ScriptVersion（version+1）
4. 更新Project.content = repairedScript
5. 更新Project.workflowStatus = 'ITERATING'（解锁ACT2-5）
6. 返回版本信息
```

**实现**:
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const { id: projectId } = params;
      const body = await request.json();

      // 1. 验证
      const { repairedScript, acceptedErrors, metadata } = body;
      if (!repairedScript || !Array.isArray(acceptedErrors)) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', 'Invalid input'),
          { status: 400 }
        );
      }

      // 2. 事务处理
      const result = await prisma.$transaction(async (tx) => {
        // 获取项目
        const project = await tx.project.findUnique({ where: { id: projectId } });
        if (!project) throw new Error('Project not found');

        // 查找最新版本
        const latestVersion = await tx.scriptVersion.findFirst({
          where: { projectId },
          orderBy: { version: 'desc' }
        });

        // 创建新版本
        const newVersionNumber = (latestVersion?.version || 0) + 1;
        const scriptVersion = await tx.scriptVersion.create({
          data: {
            projectId,
            version: newVersionNumber,
            content: repairedScript,
            source: 'ACT1_REPAIR',
            changeLog: `Applied ${acceptedErrors.length} ACT1 repairs`,
            metadata: {
              ...metadata,
              acceptedErrors
            }
          }
        });

        // 更新项目
        await tx.project.update({
          where: { id: projectId },
          data: {
            content: repairedScript,
            workflowStatus: 'ITERATING'  // 解锁ACT2-5
          }
        });

        return { scriptVersion, project };
      });

      // 3. 返回成功
      return NextResponse.json(
        createApiResponse({
          version: result.scriptVersion.version,
          message: 'ACT1 repair applied successfully',
          details: {
            errorsApplied: acceptedErrors.length,
            newWorkflowStatus: 'ITERATING'
          }
        }),
        { status: 200 }
      );

    } catch (error) {
      console.error('[apply-act1-repair] Error:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown'),
        { status: 500 }
      );
    }
  });
}
```

---

## 10. 迭代API异步化（2025-10-10）

### 10.1 问题背景

**旧方案**: 同步处理（超时）
```typescript
POST /api/v1/iteration/propose
  → 调用AI（30-60秒）
  → 返回结果
  ❌ Vercel Hobby 10秒超时 → 504错误
```

**新方案**: 异步Job模式
```typescript
POST /api/v1/iteration/propose
  → 创建ITERATION Job
  → 立即返回jobId（<1秒）

Client轮询:
  GET /api/v1/iteration/jobs/:jobId
  → 检查状态（QUEUED/PROCESSING/COMPLETED）
  → 30-60秒后COMPLETED，返回proposals
```

### 10.2 Propose端点（异步）

**文件**: `app/api/v1/iteration/propose/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      const body = await request.json();
      const { projectId, act, focusName, contradiction, scriptContext } = body;

      // 1. 创建ITERATION Job
      const job = await prisma.analysisJob.create({
        data: {
          projectId,
          type: 'ITERATION',
          status: 'QUEUED',
          input: { act, focusName, contradiction, scriptContext }
        }
      });

      // 2. 立即返回jobId
      return NextResponse.json(
        createApiResponse({
          jobId: job.id,
          message: 'Iteration job created, polling required'
        }),
        { status: 202 }  // Accepted
      );

    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', String(error)),
        { status: 500 }
      );
    }
  });
}
```

### 10.3 Job状态查询端点

**文件**: `app/api/v1/iteration/jobs/[jobId]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const { jobId } = params;

      const job = await prisma.analysisJob.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', 'Job not found'),
          { status: 404 }
        );
      }

      // 返回Job状态和结果
      return NextResponse.json(
        createApiResponse({
          jobId: job.id,
          status: job.status,
          progress: calculateProgress(job),
          result: job.status === 'COMPLETED' ? job.result : null,
          error: job.error
        })
      );

    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', String(error)),
        { status: 500 }
      );
    }
  });
}
```

---

## 11. 部署配置

### 11.1 Vercel配置

**vercel.json**:
```json
{
  "buildCommand": "npx prisma generate && npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "app/api/v1/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "env": {
    "DATABASE_URL": "@database-url",
    "DEEPSEEK_API_KEY": "@deepseek-api-key"
  }
}
```

### 11.2 环境变量

**生产环境**:
```bash
# Supabase Database (Pooler)
DATABASE_URL="postgresql://user:pass@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Supabase Database (Direct - for migrations)
DIRECT_URL="postgresql://user:pass@db.supabase.com:5432/postgres"

# DeepSeek API
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_URL=https://api.deepseek.com

# Rate Limiting (optional)
DISABLE_RATE_LIMIT=false
```

### 11.3 构建优化

**next.config.js**:
```javascript
module.exports = {
  experimental: {
    serverActions: true
  },
  // 排除Prisma生成的文件
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client');
    }
    return config;
  }
}
```

---

## 附录A：API响应格式

### A.1 成功响应

```json
{
  "success": true,
  "data": {
    "id": "clxxx",
    "title": "项目名称",
    "workflowStatus": "ACT1_COMPLETE"
  },
  "message": "Project created successfully",
  "timestamp": "2025-10-11T10:30:00.000Z"
}
```

### A.2 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "title",
      "reason": "Title is required"
    }
  },
  "timestamp": "2025-10-11T10:30:00.000Z"
}
```

### A.3 Job状态响应

```json
{
  "success": true,
  "data": {
    "jobId": "clyyyy",
    "status": "COMPLETED",
    "progress": 100,
    "result": {
      "decisionId": "clzzzz",
      "proposals": [
        {
          "id": "prop-1",
          "title": "渐进式角色成长",
          "pros": ["..."],
          "cons": ["..."]
        }
      ],
      "recommendation": "prop-1"
    }
  },
  "timestamp": "2025-10-11T10:31:00.000Z"
}
```

---

## 附录B：关键修复清单

| 日期 | 问题 | 修复 | 影响范围 |
|-----|------|-----|---------|
| 2025-10-09 | 项目详情404 | 添加GET /projects/[id] | 迭代页加载 |
| 2025-10-09 | Job卡在QUEUED | 添加/analyze/process | Serverless |
| 2025-10-10 | Propose超时 | 改异步Job模式 | ACT2-5迭代 |
| 2025-10-10 | 500返回HTML | 永远返回JSON | 所有API |
| 2025-10-10 | 修复无法保存 | 添加apply-act1-repair | ACT1修复流程 |

---

**文档结束** | 下一篇: [05 - LLM集成架构](./05_LLM_INTEGRATION.md)

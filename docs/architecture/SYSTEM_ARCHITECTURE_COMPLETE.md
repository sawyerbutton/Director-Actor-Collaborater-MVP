# ScriptAI系统架构完全指南

**文档版本**: v1.0
**创建日期**: 2025-11-05
**系统版本**: v1.0 Beta (包含Sprint 3多文件分析)
**文档类型**: 技术架构全景文档

---

## 📚 文档导航

本文档体系提供ScriptAI系统从业务到技术实现的完整视图，分为以下部分：

### 核心文档
1. **[业务流程与用户旅程](./01_BUSINESS_FLOW.md)** - 从用户视角看完整业务流程
2. **[数据库架构详解](./02_DATABASE_ARCHITECTURE.md)** - 数据模型、关系、索引策略
3. **[前端架构详解](./03_FRONTEND_ARCHITECTURE.md)** - React组件、页面流转、状态管理
4. **[后端API架构详解](./04_BACKEND_API_ARCHITECTURE.md)** - API设计、中间件、服务层
5. **[LLM集成架构详解](./05_LLM_INTEGRATION.md)** - AI代理、提示工程、响应处理
6. **[部署架构详解](./06_DEPLOYMENT_ARCHITECTURE.md)** - Vercel、Supabase、Docker、CI/CD

### 本文档内容
- 系统概览和核心概念
- 架构设计原则
- 技术栈总览
- 模块关系图
- 快速参考

---

## 🎯 系统概览

### 产品定位

**ScriptAI** 是一个AI驱动的剧本分析和优化系统，采用**五幕互动工作流**，帮助编剧发现并修复剧本中的逻辑错误，并通过迭代优化提升剧本质量。

**核心价值主张**:
- **ACT1**: 快速逻辑修复（5-10分钟识别5类逻辑错误）
- **ACT2-5**: 创作深度增强（角色弧光、世界观、节奏、主题）
- **多文件支持**: 跨集剧本一致性检查（Sprint 3新增）
- **版本管理**: 完整的修改历史和回滚能力

### 系统特点

1. **五幕互动工作流**
   - 每幕对应一个特定的分析维度
   - 用户主动参与决策，AI提供方案
   - 支持任意跳转和重做

2. **多文件分析系统** (Sprint 3)
   - 支持单个/批量上传多集剧本
   - 自动检测跨文件不一致（时间线、角色、情节、设定）
   - AI辅助决策（CrossFileAdvisor生成解决方案）

3. **异步任务队列**
   - 长时间运行的AI分析不阻塞UI
   - 支持Serverless环境（Vercel双模式）
   - 实时进度追踪和错误恢复

4. **版本化剧本管理**
   - 每次修改创建新版本（V1, V2, V3...）
   - 完整的changeLog记录
   - 版本对比和差异查看

---

## 🏗️ 架构设计原则

### 1. Serverless-First设计

**目标**: 在Vercel等Serverless平台无缝运行

**实现**:
- 无状态API设计（所有状态存储在数据库）
- 双模式WorkflowQueue（传统服务器setInterval + Serverless手动触发）
- 连接池优化（pgbouncer, connection_limit=1）
- 函数超时配置（最长60秒）

**挑战与解决**:
```typescript
// 问题: Serverless函数终止后setInterval被清除
// 解决: 环境检测 + 手动触发模式
if (!isServerless) {
  this.processInterval = setInterval(() => this.processNext(), 3000);
} else {
  // 依赖前端轮询时调用 POST /api/v1/analyze/process
  console.log('Serverless mode - manual trigger');
}
```

### 2. 数据库驱动架构

**原则**: 数据库是唯一的真实来源（Single Source of Truth）

**实现**:
- 所有状态存储在PostgreSQL（WorkflowStatus, JobStatus, etc.）
- 无客户端存储（localStorage已移除）
- 支持多设备同步和恢复

**数据流**:
```
用户操作 → API调用 → 服务层 → Prisma ORM → PostgreSQL
                ↓
         创建AnalysisJob (QUEUED)
                ↓
        WorkflowQueue处理 (PROCESSING)
                ↓
         更新结果到数据库 (COMPLETED)
                ↓
         前端轮询获取结果
```

### 3. 模块化AI代理设计

**原则**: 每个AI代理职责单一，可独立测试

**六大AI代理**:
1. **ConsistencyGuardian** - ACT1逻辑错误检测
2. **CharacterArchitect** - ACT2角色弧光深化
3. **RulesAuditor** - ACT3世界观增强
4. **PacingStrategist** - ACT4节奏优化
5. **ThematicPolisher** - ACT5主题提升
6. **CrossFileAdvisor** - 跨文件冲突解决（Sprint 3）

**代理协作模式**:
```typescript
// 标准代理接口
interface AIAgent {
  analyze(script: string, context: Context): Promise<Result>;
  validate(result: Result): boolean;
}

// 工厂模式创建
const agent = createCharacterArchitect(apiKey);
const result = await agent.analyzeCharacterArc(script, character);
```

### 4. 异步优先模式

**原则**: 所有可能超过10秒的操作都使用异步任务

**任务类型**:
- `ACT1_ANALYSIS` - 剧本诊断（30-120秒）
- `ITERATION` - ACT2-5提案生成（30-60秒）
- `SYNTHESIS` - 最终剧本合成（2-5分钟）
- `EXPORT` - 格式转换和导出（5-30秒）

**轮询模式**:
```typescript
// 客户端轮询
const pollJobStatus = async (jobId: string) => {
  while (attempts < MAX_ATTEMPTS) {
    await triggerProcessing(); // Serverless兼容
    const job = await getJobStatus(jobId);

    if (job.status === 'COMPLETED') return job.result;
    if (job.status === 'FAILED') throw new Error(job.error);

    await sleep(5000); // 5秒轮询间隔
    attempts++;
  }
};
```

### 5. 类型安全优先

**原则**: 利用TypeScript强类型系统防止运行时错误

**实现**:
- Prisma生成的类型（自动同步数据库schema）
- Zod验证所有API输入
- 完整的接口定义（lib/types/*.ts）

**示例**:
```typescript
// Zod输入验证
const CreateFileSchema = z.object({
  filename: z.string().min(1),
  episodeNumber: z.number().int().positive(),
  rawContent: z.string(),
  jsonContent: z.record(z.any()).optional()
});

// Prisma类型安全查询
const file: ScriptFile = await prisma.scriptFile.create({
  data: CreateFileSchema.parse(input)
});
```

---

## 🛠️ 技术栈总览

### 前端技术栈
```
React 18.3.1           - UI框架
Next.js 14.2.32        - 全栈框架（App Router）
TypeScript 5.5.4       - 类型系统
Tailwind CSS 3.4.1    - 样式框架
shadcn/ui              - UI组件库
React Hook Form        - 表单管理
Zod                    - Schema验证
```

### 后端技术栈
```
Next.js API Routes     - RESTful API
Prisma ORM 5.22.0     - 数据库ORM
PostgreSQL 16          - 关系型数据库
Zod                    - 输入验证
```

### AI/LLM集成
```
DeepSeek API           - LLM服务提供商
httpx (Python)         - Python转换器HTTP客户端
FastAPI (Python)       - Python转换器微服务
```

### 部署和基础设施
```
Vercel                 - 前端和API托管（Serverless）
Supabase PostgreSQL    - 生产数据库（连接池）
Docker + Docker Compose - 本地开发环境
Railway (可选)         - Python转换器托管
```

### 开发工具
```
Jest                   - 单元和集成测试
Playwright             - E2E测试
ESLint                 - 代码检查
Prettier               - 代码格式化
Git + GitHub           - 版本控制
```

---

## 📊 系统架构图

### 1. 高层架构视图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户（编剧）                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   前端应用 (Next.js)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │Dashboard页面│→ │Analysis页面  │→ │Iteration页面  │      │
│  └─────────────┘  └──────────────┘  └───────────────┘      │
│         │                 │                   │              │
│         └─────────────────┴───────────────────┘              │
│                           │ API调用                           │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  后端API (Next.js API Routes)                │
│  ┌────────────┐  ┌─────────────┐  ┌────────────────┐       │
│  │项目管理API │  │文件管理API  │  │分析和迭代API  │       │
│  └────────────┘  └─────────────┘  └────────────────┘       │
│         │                │                   │               │
│         └────────────────┴───────────────────┘               │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ↓                ↓                ↓                 │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │服务层      │  │WorkflowQueue │  │AI代理协调器  │       │
│  └────────────┘  └──────────────┘  └──────────────┘       │
└───────┬─────────────────┬───────────────────┬───────────────┘
        │                 │                   │
        │ Prisma ORM      │ 任务处理          │ DeepSeek API
        ↓                 ↓                   ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│PostgreSQL    │  │AnalysisJob   │  │6个AI代理         │
│数据库        │  │任务队列       │  │(ConsistencyGuard│
│(Supabase)    │  │              │  │ ian等)           │
└──────────────┘  └──────────────┘  └──────────────────┘
        │
        │ 跨文件分析数据
        ↓
┌─────────────────────────────────────────────┐
│ Python转换器微服务 (FastAPI)                 │
│ - 剧本格式转换                               │
│ - JSON结构化输出                             │
│ - 部署在Railway或Docker                      │
└─────────────────────────────────────────────┘
```

### 2. 数据流架构

```
┌──────────────────────────────────────────────────────────────┐
│                       数据流方向                              │
└──────────────────────────────────────────────────────────────┘

用户上传剧本
    ↓
POST /api/v1/projects (创建项目)
    ↓
Project记录 (workflowStatus: INITIALIZED)
    ↓
POST /api/v1/projects/:id/files (单文件)
或 POST /api/v1/projects/:id/files/batch (多文件)
    ↓
ScriptFile记录 (conversionStatus: pending)
    ↓
Python转换器 (异步处理)
    ↓
ScriptFile更新 (jsonContent填充, status: completed)
    ↓
POST /api/v1/analyze (触发ACT1分析)
    ↓
AnalysisJob记录 (type: ACT1_ANALYSIS, status: QUEUED)
    ↓
WorkflowQueue后台处理
    ↓
ConsistencyGuardian分析 (内部 + 跨文件检查)
    ↓
DiagnosticReport记录 (findings: {internal, crossFile})
    ↓
Project更新 (workflowStatus: ACT1_COMPLETE)
    ↓
用户查看分析结果页面
    ↓
用户选择进入迭代 (ACT2-5)
    ↓
POST /api/v1/iteration/propose (创建ITERATION任务)
    ↓
AI代理生成2个提案 (CharacterArchitect/RulesAuditor等)
    ↓
RevisionDecision记录 (proposals填充)
    ↓
用户选择提案
    ↓
POST /api/v1/iteration/execute (执行选中提案)
    ↓
RevisionDecision更新 (userChoice, generatedChanges)
    ↓
ScriptVersion记录 (V2, V3, V4...)
    ↓
用户完成所有迭代
    ↓
POST /api/v1/synthesize (触发最终合成)
    ↓
SynthesisEngine整合所有决策
    ↓
ScriptVersion记录 (V2最终版, 包含synthesisMetadata)
    ↓
用户下载或导出
```

### 3. 模块依赖关系

```
前端层
  ├── components/workspace/* (复用组件)
  │   ├── act-progress-bar.tsx
  │   ├── findings-selector.tsx
  │   ├── proposal-comparison.tsx
  │   └── changes-display.tsx
  │
  ├── app/dashboard/page.tsx (入口)
  │   ↓ 调用
  ├── lib/services/v1-api-service.ts (API客户端)
  │   ↓ HTTP请求
  └── app/api/v1/* (API路由)

API层
  ├── app/api/v1/projects/route.ts
  ├── app/api/v1/projects/[id]/files/route.ts
  ├── app/api/v1/analyze/route.ts
  ├── app/api/v1/iteration/propose/route.ts
  ├── app/api/v1/iteration/execute/route.ts
  └── app/api/v1/synthesize/route.ts
      ↓ 使用
  ├── lib/api/middleware/* (中间件)
  └── lib/db/services/* (服务层)

服务层
  ├── lib/db/services/project.service.ts
  ├── lib/db/services/script-file.service.ts
  ├── lib/db/services/multi-file-analysis.service.ts
  ├── lib/db/services/revision-decision.service.ts
  └── lib/api/workflow-queue.ts (任务队列)
      ↓ 使用
  ├── lib/agents/* (AI代理)
  └── lib/analysis/* (分析引擎)

AI代理层
  ├── lib/agents/consistency-guardian.ts (ACT1)
  ├── lib/agents/character-architect.ts (ACT2)
  ├── lib/agents/rules-auditor.ts (ACT3)
  ├── lib/agents/pacing-strategist.ts (ACT4)
  ├── lib/agents/thematic-polisher.ts (ACT5)
  ├── lib/agents/cross-file-advisor.ts (跨文件)
  └── lib/synthesis/synthesis-engine.ts (合成)
      ↓ 调用
  └── lib/api/deepseek/client.ts (DeepSeek API)

数据层
  └── Prisma Client (自动生成)
      ↓ 连接
  └── PostgreSQL数据库 (Supabase)
```

---

## 🔑 核心概念

### 1. 五幕工作流（Five-Act Workflow）

**工作流状态机**:
```
INITIALIZED → ACT1_RUNNING → ACT1_COMPLETE → ITERATING → SYNTHESIZING → COMPLETED
```

**各幕职责**:

| 幕 | 名称 | 核心功能 | 输出 | AI代理 |
|----|------|---------|------|--------|
| ACT1 | 逻辑诊断 | 识别5类逻辑错误 | DiagnosticReport | ConsistencyGuardian |
| ACT2 | 角色深化 | 角色弧光和心理复杂度 | 2个角色发展提案 | CharacterArchitect |
| ACT3 | 世界观丰富 | 设定细节和戏剧潜力 | 2个世界观方案 | RulesAuditor |
| ACT4 | 节奏优化 | 紧张度和情感强度 | 2个节奏策略 | PacingStrategist |
| ACT5 | 主题提升 | 精神深度和共鸣 | 增强角色档案 | ThematicPolisher |
| 合成 | 最终整合 | 所有决策合并 | V2剧本 + 元数据 | SynthesisEngine |

### 2. 异步任务队列（Async Job Queue）

**任务生命周期**:
```
创建 (API调用) → QUEUED → PROCESSING → COMPLETED/FAILED
                    ↑          ↓
                    └─ 重试机制 ─┘
```

**任务类型与预期时长**:
- ACT1_ANALYSIS: 30-120秒（取决于剧本长度）
- ITERATION: 30-60秒（AI提案生成）
- SYNTHESIS: 2-5分钟（合成V2剧本）
- EXPORT: 5-30秒（格式转换）

**Serverless兼容性**:
```typescript
// WorkflowQueue双模式设计
class WorkflowQueue {
  constructor() {
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA;

    if (!isServerless) {
      // 传统服务器: 自动后台处理
      this.processInterval = setInterval(() => {
        this.processNext();
      }, 3000);
    } else {
      // Serverless: 依赖手动触发
      // 由前端轮询调用 POST /api/v1/analyze/process
    }
  }

  // 公开方法供Serverless调用
  async processNextManually() {
    return await this.processNext();
  }
}
```

### 3. 多文件分析系统（Sprint 3新增）

**核心组件**:

1. **ScriptFile模型** - 存储多个剧本文件
   - 支持单个/批量上传（最多50个文件）
   - 自动提取episodeNumber（从文件名）
   - contentHash防重复（Beta版不提示）

2. **CrossFileAnalyzer** - 跨文件一致性检查
   - 4种检查类型: timeline, character, plot, setting
   - 快速检查（timeline/character）: 35+ files/sec
   - 慢速检查（plot/setting）: 3 files/81s（需优化）

3. **CrossFileAdvisor** - AI辅助决策
   - 分析跨文件冲突
   - 生成2-3个解决方案
   - 提供影响分析和难度评级

**数据流**:
```
用户上传5个文件 (第1-5集.md)
    ↓
批量创建ScriptFile记录
    ↓
Python转换器异步处理（并行）
    ↓
POST /api/v1/projects/:id/analyze/cross-file
    ↓
CrossFileAnalyzer执行检查
    ↓
发现10个跨文件问题（角色名称不一致）
    ↓
CrossFileFinding记录（存储到DiagnosticReport.findings.crossFileFindings）
    ↓
用户查看findings，选择一个问题
    ↓
调用CrossFileAdvisor生成解决方案
    ↓
显示3个方案: 统一为"张三" / 保留差异作为绰号 / 按时间线修正
    ↓
用户选择方案，系统应用修改
```

### 4. 版本管理系统

**版本命名规则**:
- V0: 原始上传剧本
- V1: ACT1修复后剧本
- V2, V3, V4...: ACT2-5每次执行后创建新版本
- V2（最终）: Synthesis合成的最终剧本

**ScriptVersion字段**:
```typescript
{
  id: string,
  projectId: string,
  version: number,           // 版本号（自增）
  content: string,           // 剧本内容
  changeLog: string,         // 人类可读的变更说明
  synthesisMetadata: {       // 合成元数据（仅V2最终版）
    decisionsApplied: number,
    conflictsResolved: number,
    styleProfile: StyleProfile,
    confidence: 0.85
  },
  createdAt: Date
}
```

---

## 🚀 快速参考

### API端点速查

**项目管理**:
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects` - 列出项目
- `GET /api/v1/projects/:id` - 获取项目详情

**多文件管理** (Sprint 3):
- `POST /api/v1/projects/:id/files` - 上传单文件
- `POST /api/v1/projects/:id/files/batch` - 批量上传
- `GET /api/v1/projects/:id/files` - 列出文件
- `POST /api/v1/projects/:id/analyze/cross-file` - 跨文件分析

**分析和迭代**:
- `POST /api/v1/analyze` - 触发ACT1分析
- `POST /api/v1/analyze/process` - 手动触发任务处理（Serverless）
- `GET /api/v1/analyze/jobs/:jobId` - 查询任务状态
- `POST /api/v1/iteration/propose` - 生成ACT2-5提案
- `POST /api/v1/iteration/execute` - 执行选中提案

**合成和导出**:
- `POST /api/v1/synthesize` - 触发最终合成
- `GET /api/v1/synthesize/:jobId/status` - 查询合成状态
- `POST /api/v1/export` - 导出剧本

### 关键配置

**环境变量**:
```bash
# 数据库
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://...@pooler.supabase.com:5432/postgres

# AI服务
DEEPSEEK_API_KEY=sk-xxx...
DEEPSEEK_API_URL=https://api.deepseek.com

# Python转换器 (Sprint 3)
PYTHON_CONVERTER_URL=https://your-service.railway.app

# 应用
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_VERSION=v1
NODE_ENV=production
```

**Vercel超时配置** (vercel.json):
```json
{
  "functions": {
    "app/api/v1/analyze/route.ts": {"maxDuration": 60},
    "app/api/v1/iteration/propose/route.ts": {"maxDuration": 60},
    "app/api/v1/projects/[id]/files/batch/route.ts": {"maxDuration": 60},
    "app/api/v1/projects/[id]/analyze/cross-file/route.ts": {"maxDuration": 60},
    "app/api/v1/synthesize/route.ts": {"maxDuration": 60}
  }
}
```

### 数据库表速查

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| User | 用户账户 | email, name |
| Project | 剧本项目 | title, workflowStatus, content |
| ScriptFile | 多文件剧本 | filename, episodeNumber, jsonContent |
| AnalysisJob | 异步任务 | type, status, result |
| DiagnosticReport | ACT1报告 | findings (内部+跨文件) |
| RevisionDecision | ACT2-5决策 | act, proposals, userChoice |
| ScriptVersion | 版本历史 | version, content, changeLog |

---

## 📖 详细文档索引

完整的技术细节请参考以下文档：

1. **[业务流程与用户旅程](./01_BUSINESS_FLOW.md)**
   - 用户故事和使用场景
   - 完整的五幕工作流详解
   - 多文件分析用户流程
   - 决策点和分支路径

2. **[数据库架构详解](./02_DATABASE_ARCHITECTURE.md)**
   - 完整的Prisma Schema解析
   - 表关系和外键约束
   - 索引策略和查询优化
   - 迁移历史和版本管理

3. **[前端架构详解](./03_FRONTEND_ARCHITECTURE.md)**
   - Next.js App Router页面结构
   - React组件设计模式
   - 状态管理和数据流
   - UI组件库和样式系统

4. **[后端API架构详解](./04_BACKEND_API_ARCHITECTURE.md)**
   - RESTful API设计原则
   - 中间件栈和请求处理
   - 服务层模式和依赖注入
   - 错误处理和验证

5. **[LLM集成架构详解](./05_LLM_INTEGRATION.md)**
   - DeepSeek API集成
   - 6个AI代理详细设计
   - 提示工程和响应解析
   - 错误处理和重试机制

6. **[部署架构详解](./06_DEPLOYMENT_ARCHITECTURE.md)**
   - Vercel Serverless部署
   - Supabase数据库配置
   - Docker本地开发
   - CI/CD流程和监控

---

## 🔄 系统演进历史

### Sprint 1-2: 基础架构（2025-11-04）
- 多文件数据模型（ScriptFile）
- Python转换器微服务（FastAPI）
- 文件上传API（单个/批量）

### Sprint 3: 跨文件分析（2025-11-04）
- CrossFileAnalyzer（4种检查类型）
- CrossFileAdvisor（AI辅助决策）
- 性能优化（35+ files/sec）

### Sprint 4: 测试和部署（2025-11-05）
- 完整测试体系（32个测试用例）
- 性能基线建立
- Docker部署验证
- 生产环境配置

### 未来规划
- Plot/Setting性能优化（P0）
- 多文件上传UI（Sprint 5）
- 实时协作编辑（V1.1）

---

**文档维护**: AI Assistant + 开发团队
**最后更新**: 2025-11-05
**文档状态**: ✅ 完整且最新
**反馈渠道**: GitHub Issues

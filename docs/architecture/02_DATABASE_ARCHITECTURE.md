# 数据库架构详解

**文档版本**: v1.0
**创建日期**: 2025-11-05
**所属**: [系统架构完全指南](./SYSTEM_ARCHITECTURE_COMPLETE.md)

---

## 📋 目录

1. [数据库概览](#1-数据库概览)
2. [核心数据模型](#2-核心数据模型)
3. [表关系与外键](#3-表关系与外键)
4. [索引策略](#4-索引策略)
5. [数据流与生命周期](#5-数据流与生命周期)
6. [查询模式与优化](#6-查询模式与优化)
7. [迁移管理](#7-迁移管理)
8. [数据一致性保证](#8-数据一致性保证)

---

## 1. 数据库概览

### 1.1 技术选型

**数据库**: PostgreSQL 16 (Supabase托管 或 本地Docker)

**ORM**: Prisma 5.22.0

**选型理由**:
- **关系型需求**: 复杂的表关系（Project → ScriptFile → CrossFileFinding）
- **JSON支持**: 灵活存储findings、proposals等非结构化数据
- **事务支持**: 确保multi-step操作原子性
- **Prisma优势**: 类型安全、自动迁移、强大查询API

### 1.2 连接配置

**开发环境**:
```bash
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5433/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5433/director_actor_db?schema=public"
```

**生产环境（Supabase）**:
```bash
# Connection Pooler (应用运行时使用)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct Connection (仅用于迁移)
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**关键参数说明**:
- `pgbouncer=true`: 启用连接池（Serverless必需）
- `connection_limit=1`: 每个Serverless函数限制1个连接
- 端口6543: Pooler端口（事务模式）
- 端口5432: Direct端口（迁移专用）

### 1.3 数据库规模估算

**存储估算**（10000用户，每用户5个项目）:

| 表 | 行数估算 | 平均行大小 | 总大小 |
|----|---------|-----------|--------|
| User | 10,000 | 500B | 5MB |
| Project | 50,000 | 1KB | 50MB |
| ScriptFile | 250,000 | 50KB | 12.5GB |
| ScriptVersion | 200,000 | 100KB | 20GB |
| AnalysisJob | 100,000 | 2KB | 200MB |
| DiagnosticReport | 50,000 | 10KB | 500MB |
| RevisionDecision | 150,000 | 5KB | 750MB |
| **总计** | **810,000** | - | **~34GB** |

**查询负载估算**:
- **读操作**: ~1000 QPS（高峰）
- **写操作**: ~100 QPS（高峰）
- **长查询**: ACT1分析（30-120秒）

---

## 2. 核心数据模型

### 2.1 User - 用户模型

**用途**: 存储用户账户信息

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // 哈希后的密码，OAuth用户可为null
  image         String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联关系
  projects      Project[]

  @@index([email])
}
```

**字段说明**:
- `id`: CUID格式（cuid库生成，如"ckxxx"）
- `email`: 唯一邮箱，用于登录
- `password`: bcrypt哈希（OAuth用户为null）
- `image`: 头像URL（来自OAuth或上传）
- `emailVerified`: 邮箱验证时间（NextAuth管理）

**索引**:
- `@@index([email])`: 加速登录查询

**示例数据**:
```json
{
  "id": "clr1a2b3c4d5e6f7g8h9i0",
  "email": "user@example.com",
  "name": "李华",
  "password": "$2b$10$abcdefghijklmnopqrstuvwxyz",
  "image": "https://avatars.com/user123.jpg",
  "emailVerified": "2025-11-01T08:00:00.000Z",
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-11-05T14:20:00.000Z"
}
```

---

### 2.2 Project - 项目模型

**用途**: 代表用户的一个剧本工程

```prisma
model Project {
  id              String            @id @default(cuid())
  userId          String
  title           String
  description     String?
  content         String            @db.Text // 剧本内容（单文件模式，保留兼容）
  status          String            @default("draft")
  workflowStatus  WorkflowStatus    @default(INITIALIZED)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // 关联关系
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  analyses        Analysis[]
  scriptVersions  ScriptVersion[]
  analysisJobs    AnalysisJob[]
  diagnosticReport DiagnosticReport?
  revisionDecisions RevisionDecision[]
  scriptFiles     ScriptFile[]      // 多文件模式（Sprint 3新增）

  @@index([userId])
  @@index([status])
  @@index([workflowStatus])
}
```

**字段说明**:
- `content`: 单文件模式的剧本内容（兼容旧版本）
- `status`: 项目状态（draft/active/archived）
- `workflowStatus`: 五幕工作流状态（枚举）

**WorkflowStatus枚举**:
```prisma
enum WorkflowStatus {
  INITIALIZED     // 初始化（刚创建）
  ACT1_RUNNING    // Act 1 正在执行
  ACT1_COMPLETE   // Act 1 完成
  ITERATING       // 迭代阶段（ACT2-5）
  SYNTHESIZING    // 综合阶段
  COMPLETED       // 全部完成
}
```

**状态转换规则**:
```
INITIALIZED → ACT1_RUNNING → ACT1_COMPLETE
                                   ↓
                              ITERATING → SYNTHESIZING → COMPLETED
                                   ↓
                              COMPLETED (快速修复路径)
```

**索引**:
- `@@index([userId])`: 查询用户所有项目
- `@@index([status])`: 按状态筛选
- `@@index([workflowStatus])`: 查询特定工作流阶段项目

**示例数据**:
```json
{
  "id": "proj_abc123",
  "userId": "clr1a2b3c4d5e6f7g8h9i0",
  "title": "我的网剧第一季",
  "description": "都市职场剧，5集",
  "content": "", // 多文件模式为空
  "status": "active",
  "workflowStatus": "ACT1_COMPLETE",
  "createdAt": "2025-11-05T09:00:00.000Z",
  "updatedAt": "2025-11-05T09:30:00.000Z"
}
```

---

### 2.3 ScriptFile - 剧本文件模型（Sprint 3）

**用途**: 存储项目的多个剧本文件

```prisma
model ScriptFile {
  id                String   @id @default(cuid())
  projectId         String
  filename          String   // 原始文件名（如"第1集.md"）
  episodeNumber     Int?     // 集数编号（用于排序）
  rawContent        String   @db.Text // 原始文本内容
  jsonContent       Json?    // 转换后的结构化JSON
  contentHash       String   // SHA256哈希
  fileSize          Int      // 文件大小（bytes）
  conversionStatus  String   @default("pending") // pending/processing/completed/failed
  conversionError   String?  @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 关联关系
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, filename])
  @@index([projectId])
  @@index([projectId, episodeNumber])
}
```

**字段说明**:
- `filename`: 用户上传的原始文件名
- `episodeNumber`: 从文件名提取（如"第3集.md" → 3）
- `rawContent`: Markdown/纯文本原始内容
- `jsonContent`: Python转换器生成的结构化JSON
- `contentHash`: SHA256哈希（用于检测重复，Beta版不提示）
- `conversionStatus`: 转换状态（pending→processing→completed/failed）

**jsonContent结构示例**:
```json
{
  "metadata": {
    "title": "第1集",
    "episodeNumber": 1,
    "totalScenes": 15
  },
  "scenes": [
    {
      "id": "S01E01",
      "heading": "场景1 - 咖啡馆 - 白天",
      "timestamp": "09:00",
      "location": "咖啡馆",
      "timeOfDay": "白天",
      "characters": ["张三", "李四"],
      "dialogues": [
        {"character": "张三", "line": "早上好！"}
      ],
      "action": "张三推开玻璃门...",
      "plotPoints": ["初次见面"],
      "description": "温馨咖啡馆"
    }
  ]
}
```

**唯一约束**:
- `@@unique([projectId, filename])`: 同一项目内文件名唯一

**示例数据**:
```json
{
  "id": "file_xyz789",
  "projectId": "proj_abc123",
  "filename": "第1集.md",
  "episodeNumber": 1,
  "rawContent": "# 第1集\n\n## 场景1...",
  "jsonContent": { /* 见上方示例 */ },
  "contentHash": "sha256:abcdef123456...",
  "fileSize": 52340,
  "conversionStatus": "completed",
  "conversionError": null,
  "createdAt": "2025-11-05T09:10:00.000Z",
  "updatedAt": "2025-11-05T09:15:00.000Z"
}
```

---

### 2.4 AnalysisJob - 异步任务模型

**用途**: 管理所有异步分析任务

```prisma
model AnalysisJob {
  id        String      @id @default(cuid())
  projectId String
  type      JobType     // ACT1_ANALYSIS/SYNTHESIS/ITERATION/EXPORT
  status    JobStatus   @default(QUEUED) // QUEUED/PROCESSING/COMPLETED/FAILED
  result    Json?       // 任务结果（JSON格式）
  error     String?     // 错误消息
  metadata  Json?       // 额外元数据
  startedAt DateTime?
  completedAt DateTime?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  // 关联关系
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([status])
  @@index([type])
}
```

**JobType枚举**:
```prisma
enum JobType {
  ACT1_ANALYSIS   // Act 1 基础诊断
  SYNTHESIS       // 剧本合成
  ITERATION       // 迭代优化（ACT2-5提案生成）
  EXPORT          // 导出任务
}
```

**JobStatus枚举**:
```prisma
enum JobStatus {
  QUEUED          // 队列中
  PROCESSING      // 处理中
  COMPLETED       // 完成
  FAILED          // 失败
  CANCELLED       // 已取消
}
```

**result字段结构**（根据type不同）:

**ACT1_ANALYSIS result**:
```json
{
  "reportId": "report_123",
  "internalErrorCount": 15,
  "crossFileErrorCount": 10,
  "duration": 45000 // ms
}
```

**ITERATION result**:
```json
{
  "decisionId": "dec_456",
  "act": "ACT2_CHARACTER",
  "focusName": "张三",
  "proposals": [
    {
      "id": "prop1",
      "approach": "渐进式成长",
      "pros": ["真实可信"],
      "cons": ["前期慢热"]
    },
    {
      "id": "prop2",
      "approach": "戏剧性转变",
      "pros": ["冲突强烈"],
      "cons": ["可能突兀"]
    }
  ],
  "recommendation": "prop1"
}
```

**SYNTHESIS result**:
```json
{
  "versionId": "ver_789",
  "version": 2,
  "decisionsApplied": 5,
  "conflictsResolved": 2,
  "confidence": 0.87,
  "duration": 185000 // ms
}
```

**示例数据**:
```json
{
  "id": "job_aaa111",
  "projectId": "proj_abc123",
  "type": "ACT1_ANALYSIS",
  "status": "COMPLETED",
  "result": {
    "reportId": "report_123",
    "internalErrorCount": 15,
    "crossFileErrorCount": 10
  },
  "error": null,
  "metadata": {
    "checkTypes": ["internal_only", "cross_file_timeline"]
  },
  "startedAt": "2025-11-05T09:20:00.000Z",
  "completedAt": "2025-11-05T09:22:30.000Z",
  "createdAt": "2025-11-05T09:20:00.000Z",
  "updatedAt": "2025-11-05T09:22:30.000Z"
}
```

---

### 2.5 DiagnosticReport - 诊断报告模型

**用途**: 存储ACT1分析结果

```prisma
model DiagnosticReport {
  id                    String   @id @default(cuid())
  projectId             String   @unique // 一对一关系
  findings              Json     // 结构化诊断结果
  summary               String?  @db.Text
  confidence            Float?   // 诊断置信度 (0-1)
  analyzedFileIds       String[] // 已分析文件ID列表
  checkType             String   @default("internal_only") // internal_only/cross_file/both
  internalErrorCount    Int      @default(0)
  crossFileErrorCount   Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // 关联关系
  project               Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([checkType])
  @@index([internalErrorCount])
  @@index([crossFileErrorCount])
}
```

**findings结构**:
```json
{
  "internalFindings": [
    {
      "id": "find_001",
      "type": "timeline",
      "severity": "critical",
      "confidence": 0.95,
      "location": {
        "file": "第1集.md",
        "scene": "S01E05",
        "line": 78
      },
      "description": "时间跳跃不合理：第10分钟在咖啡馆，第12分钟突然在办公室",
      "suggestedFix": "添加过渡场景：驾车前往办公室",
      "context": "相关场景片段..."
    }
  ],
  "crossFileFindings": [
    {
      "id": "find_002",
      "type": "cross_file_character",
      "severity": "warning",
      "confidence": 0.85,
      "affectedFiles": ["第1集.md", "第2集.md", "第3集.md"],
      "affectedScenes": ["S01E01", "S02E03", "S03E05"],
      "description": "角色名称不一致：'张三' vs '张三儿'",
      "suggestedFix": "统一使用'张三'",
      "context": "所有出现位置..."
    }
  ],
  "statistics": {
    "total": 25,
    "bySeverity": {
      "critical": 5,
      "warning": 12,
      "info": 8
    },
    "byType": {
      "timeline": 3,
      "character": 7,
      "plot": 8,
      "dialogue": 4,
      "scene": 3
    }
  }
}
```

**索引**:
- `@@index([internalErrorCount])`: 按错误数排序
- `@@index([crossFileErrorCount])`: 筛选跨文件问题
- `@@index([checkType])`: 按检查类型筛选

**示例数据**:
```json
{
  "id": "report_123",
  "projectId": "proj_abc123",
  "findings": { /* 见上方示例 */ },
  "summary": "发现25个问题：5个高优先级，12个中优先级，8个低优先级",
  "confidence": 0.89,
  "analyzedFileIds": ["file_xyz789", "file_xyz790"],
  "checkType": "both",
  "internalErrorCount": 15,
  "crossFileErrorCount": 10,
  "createdAt": "2025-11-05T09:22:30.000Z",
  "updatedAt": "2025-11-05T09:22:30.000Z"
}
```

---

### 2.6 RevisionDecision - 修订决策模型

**用途**: 存储ACT2-5迭代决策

```prisma
model RevisionDecision {
  id               String   @id @default(cuid())
  projectId        String
  act              ActType  // ACT2_CHARACTER/ACT3_WORLDBUILDING/ACT4_PACING/ACT5_THEME
  focusName        String   // 聚焦对象名称（如角色"张三"）
  focusContext     Json     // 聚焦上下文（如矛盾描述）
  proposals        Json     // AI生成的提案
  userChoice       String?  // 用户选择的提案ID
  generatedChanges Json?    // 最终生成的修改
  version          Int      @default(1)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // 关联关系
  project          Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([act])
  @@index([projectId, act])
}
```

**ActType枚举**:
```prisma
enum ActType {
  ACT2_CHARACTER      // Act 2: 角色弧光
  ACT3_WORLDBUILDING  // Act 3: 世界构建
  ACT4_PACING         // Act 4: 节奏
  ACT5_THEME          // Act 5: 主题
}
```

**proposals结构**（ACT2示例）:
```json
[
  {
    "id": "prop1",
    "approach": "渐进式成长",
    "trajectory": "懦弱 → 被迫选择 → 鼓起勇气 → 获得力量",
    "keyScenes": ["S01E03", "S03E07", "S05E10"],
    "changes": [
      "第1集：展现性格弱点",
      "第3集：遇到挑战",
      "第5集：成长转变"
    ],
    "pros": ["真实可信", "观众共鸣强"],
    "cons": ["前期慢热"],
    "characterArc": {
      "setup": "懦弱、犹豫",
      "catalyst": "被迫做出艰难选择",
      "transformation": "鼓起勇气面对真相",
      "resolution": "获得内心力量"
    }
  },
  {
    "id": "prop2",
    "approach": "戏剧性转变",
    /* ... */
  }
]
```

**generatedChanges结构**（ACT2执行后）:
```json
{
  "scenes": [
    {
      "file": "第1集.md",
      "scene": "S01E03",
      "original": "张三很害怕。",
      "revised": "张三的手微微颤抖，他紧咬下唇，目光不敢与对方对视。",
      "explanation": "用肢体语言展现恐惧，而非直接陈述",
      "technique": "Show Don't Tell"
    }
  ],
  "characterArc": {
    "act1Setup": "懦弱、犹豫",
    "midpointCatalyst": "被迫做出艰难选择",
    "climaxTransformation": "鼓起勇气面对真相",
    "resolution": "获得内心力量"
  },
  "integrationNotes": "在第1、3、5集分别应用修改，保持成长弧光连贯"
}
```

**示例数据**:
```json
{
  "id": "dec_456",
  "projectId": "proj_abc123",
  "act": "ACT2_CHARACTER",
  "focusName": "张三",
  "focusContext": {
    "findingId": "find_001",
    "description": "角色缺乏成长弧光",
    "scriptContext": "第1-5集相关片段..."
  },
  "proposals": [ /* 见上方示例 */ ],
  "userChoice": "prop1",
  "generatedChanges": { /* 见上方示例 */ },
  "version": 1,
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T10:15:00.000Z"
}
```

---

### 2.7 ScriptVersion - 版本历史模型

**用途**: 存储剧本版本历史

```prisma
model ScriptVersion {
  id          String   @id @default(cuid())
  projectId   String
  version     Int      // 版本号（1, 2, 3...）
  content     String   @db.Text
  changeLog   String?  @db.Text
  synthesisMetadata Json? // 合成元数据
  confidence  Float?   // 合成置信度 (0-1)
  createdAt   DateTime @default(now())

  // 关联关系
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, version])
  @@index([projectId])
  @@index([projectId, version])
}
```

**版本编号规则**:
- V0: 原始上传剧本（隐式）
- V1: ACT1修复后
- V2, V3, V4...: 每次ACT2-5 execute后
- V2（最终）: Synthesis合成的最终版本

**synthesisMetadata结构**（仅V2最终版）:
```json
{
  "decisionsApplied": 5,
  "conflictsResolved": 2,
  "styleProfile": {
    "tone": ["严肃", "温馨"],
    "vocabulary": ["专业术语", "日常口语"],
    "sentencePatterns": ["短句为主", "对话密集"],
    "dialogueStyle": {
      "formality": "mixed",
      "averageLength": 15,
      "commonPhrases": ["你知道吗", "我觉得"]
    },
    "narrativeVoice": {
      "perspective": "第三人称",
      "tense": "现在时",
      "descriptiveLevel": "moderate"
    },
    "pacingProfile": {
      "averageSceneLength": 250,
      "actionDensity": "medium",
      "dialogueRatio": 0.6
    }
  },
  "confidence": 0.87,
  "conflictDetails": [
    {
      "type": "character_contradiction",
      "severity": "medium",
      "resolution": "prioritize_act2"
    }
  ]
}
```

**示例数据**:
```json
{
  "id": "ver_789",
  "projectId": "proj_abc123",
  "version": 2,
  "content": "# 第1集（V2最终版）\n\n## 场景1...",
  "changeLog": "应用5个决策：ACT2角色深化x1, ACT3场景丰富x1, ACT4节奏x2, ACT5主题x1。解决2个冲突。",
  "synthesisMetadata": { /* 见上方示例 */ },
  "confidence": 0.87,
  "createdAt": "2025-11-05T11:20:00.000Z"
}
```

---

### 2.8 Analysis - 分析模型（遗留）

**用途**: 旧版分析结果（保留兼容性）

```prisma
model Analysis {
  id          String    @id @default(cuid())
  projectId   String
  status      String    @default("pending")
  result      Json?
  errors      Json?
  suggestions Json?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([status])
}
```

**注意**: 此模型主要用于向后兼容，新代码应使用 `AnalysisJob` + `DiagnosticReport`。

---

## 3. 表关系与外键

### 3.1 关系图

```
User (1)
  └── (N) Project
           ├── (N) ScriptFile
           ├── (N) AnalysisJob
           ├── (1) DiagnosticReport
           ├── (N) RevisionDecision
           ├── (N) ScriptVersion
           └── (N) Analysis
```

**详细关系**:
```
User.id → Project.userId (onDelete: Cascade)
  ↓
  Project.id → ScriptFile.projectId (onDelete: Cascade)
  Project.id → AnalysisJob.projectId (onDelete: Cascade)
  Project.id → DiagnosticReport.projectId (onDelete: Cascade)
  Project.id → RevisionDecision.projectId (onDelete: Cascade)
  Project.id → ScriptVersion.projectId (onDelete: Cascade)
  Project.id → Analysis.projectId (onDelete: Cascade)
```

### 3.2 Cascade删除规则

**删除User**:
```sql
-- 触发级联删除
DELETE FROM "User" WHERE id = 'user_123';

-- 自动删除:
-- 1. 所有Project (WHERE userId = 'user_123')
-- 2. 所有ScriptFile (WHERE projectId IN (...))
-- 3. 所有AnalysisJob (WHERE projectId IN (...))
-- 4. 所有DiagnosticReport (WHERE projectId IN (...))
-- 5. 所有RevisionDecision (WHERE projectId IN (...))
-- 6. 所有ScriptVersion (WHERE projectId IN (...))
```

**删除Project**:
```sql
DELETE FROM "Project" WHERE id = 'proj_123';

-- 自动删除关联数据（6个表）
-- User记录保留
```

**原子性保证**: PostgreSQL事务确保全部删除或全部失败

### 3.3 外键约束

**所有外键定义**:
```sql
-- Project → User
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE;

-- ScriptFile → Project
ALTER TABLE "ScriptFile"
  ADD CONSTRAINT "ScriptFile_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;

-- AnalysisJob → Project
ALTER TABLE "AnalysisJob"
  ADD CONSTRAINT "AnalysisJob_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;

-- DiagnosticReport → Project
ALTER TABLE "DiagnosticReport"
  ADD CONSTRAINT "DiagnosticReport_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;

-- RevisionDecision → Project
ALTER TABLE "RevisionDecision"
  ADD CONSTRAINT "RevisionDecision_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;

-- ScriptVersion → Project
ALTER TABLE "ScriptVersion"
  ADD CONSTRAINT "ScriptVersion_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;
```

---

## 4. 索引策略

### 4.1 主键索引（自动创建）

```sql
-- 每个表的@id字段自动创建主键索引
CREATE UNIQUE INDEX "User_pkey" ON "User"("id");
CREATE UNIQUE INDEX "Project_pkey" ON "Project"("id");
CREATE UNIQUE INDEX "ScriptFile_pkey" ON "ScriptFile"("id");
-- ... 其他表
```

### 4.2 唯一索引

```sql
-- User.email唯一
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Project-ScriptFile复合唯一
CREATE UNIQUE INDEX "ScriptFile_projectId_filename_key"
  ON "ScriptFile"("projectId", "filename");

-- Project-ScriptVersion复合唯一
CREATE UNIQUE INDEX "ScriptVersion_projectId_version_key"
  ON "ScriptVersion"("projectId", "version");

-- DiagnosticReport.projectId唯一（一对一关系）
CREATE UNIQUE INDEX "DiagnosticReport_projectId_key"
  ON "DiagnosticReport"("projectId");
```

### 4.3 外键索引

```sql
-- 查询用户所有项目
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- 查询项目所有文件
CREATE INDEX "ScriptFile_projectId_idx" ON "ScriptFile"("projectId");

-- 查询项目所有任务
CREATE INDEX "AnalysisJob_projectId_idx" ON "AnalysisJob"("projectId");

-- 查询项目所有决策
CREATE INDEX "RevisionDecision_projectId_idx" ON "RevisionDecision"("projectId");

-- 查询项目所有版本
CREATE INDEX "ScriptVersion_projectId_idx" ON "ScriptVersion"("projectId");
```

### 4.4 查询优化索引

```sql
-- 按工作流状态筛选项目
CREATE INDEX "Project_workflowStatus_idx" ON "Project"("workflowStatus");

-- 按任务状态查询
CREATE INDEX "AnalysisJob_status_idx" ON "AnalysisJob"("status");

-- 按任务类型查询
CREATE INDEX "AnalysisJob_type_idx" ON "AnalysisJob"("type");

-- 按集数排序文件
CREATE INDEX "ScriptFile_projectId_episodeNumber_idx"
  ON "ScriptFile"("projectId", "episodeNumber");

-- 按ACT类型筛选决策
CREATE INDEX "RevisionDecision_act_idx" ON "RevisionDecision"("act");

-- 复合索引：项目+ACT
CREATE INDEX "RevisionDecision_projectId_act_idx"
  ON "RevisionDecision"("projectId", "act");

-- 按错误数排序报告
CREATE INDEX "DiagnosticReport_internalErrorCount_idx"
  ON "DiagnosticReport"("internalErrorCount");
CREATE INDEX "DiagnosticReport_crossFileErrorCount_idx"
  ON "DiagnosticReport"("crossFileErrorCount");
```

### 4.5 索引使用示例

**查询1: 获取用户所有项目（按更新时间排序）**
```sql
-- 使用索引: Project_userId_idx
SELECT * FROM "Project"
WHERE "userId" = 'user_123'
ORDER BY "updatedAt" DESC
LIMIT 20;

-- 执行计划
Index Scan using Project_userId_idx on Project  (cost=0.29..8.30 rows=1 width=1234)
  Index Cond: (userId = 'user_123'::text)
```

**查询2: 获取ACT1_COMPLETE状态的项目**
```sql
-- 使用索引: Project_workflowStatus_idx
SELECT * FROM "Project"
WHERE "workflowStatus" = 'ACT1_COMPLETE'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**查询3: 获取项目所有文件（按集数排序）**
```sql
-- 使用索引: ScriptFile_projectId_episodeNumber_idx
SELECT * FROM "ScriptFile"
WHERE "projectId" = 'proj_123'
ORDER BY "episodeNumber" ASC;
```

**查询4: 查询QUEUED状态的任务**
```sql
-- 使用索引: AnalysisJob_status_idx
SELECT * FROM "AnalysisJob"
WHERE "status" = 'QUEUED'
ORDER BY "createdAt" ASC
LIMIT 1;
```

---

## 5. 数据流与生命周期

### 5.1 用户注册流程

```
1. NextAuth创建User记录
   INSERT INTO "User" (id, email, name, password, createdAt, updatedAt)
   VALUES ('user_123', 'user@example.com', '李华', '$2b$...', NOW(), NOW());

2. 创建Session记录（NextAuth内部表）
   INSERT INTO "Session" (sessionToken, userId, expires)
   VALUES ('token_abc', 'user_123', NOW() + INTERVAL '30 days');

3. 返回session给客户端（cookie）
```

### 5.2 项目创建流程

```
1. 创建Project记录
   INSERT INTO "Project" (id, userId, title, content, status, workflowStatus, createdAt, updatedAt)
   VALUES ('proj_123', 'user_123', '我的剧本', '', 'draft', 'INITIALIZED', NOW(), NOW());

2. 延迟500ms（Supabase复制滞后）
   await sleep(500);

3. 上传文件（单文件或批量）
   INSERT INTO "ScriptFile" (id, projectId, filename, episodeNumber, rawContent, conversionStatus, createdAt, updatedAt)
   VALUES ('file_xyz', 'proj_123', '第1集.md', 1, '# 第1集...', 'pending', NOW(), NOW());

4. Python转换器处理
   UPDATE "ScriptFile"
   SET jsonContent = '{...}', conversionStatus = 'completed', updatedAt = NOW()
   WHERE id = 'file_xyz';
```

### 5.3 ACT1分析流程

```
1. 创建AnalysisJob
   INSERT INTO "AnalysisJob" (id, projectId, type, status, createdAt, updatedAt)
   VALUES ('job_aaa', 'proj_123', 'ACT1_ANALYSIS', 'QUEUED', NOW(), NOW());

2. 更新Project状态
   UPDATE "Project"
   SET workflowStatus = 'ACT1_RUNNING', updatedAt = NOW()
   WHERE id = 'proj_123';

3. WorkflowQueue处理
   UPDATE "AnalysisJob"
   SET status = 'PROCESSING', startedAt = NOW(), updatedAt = NOW()
   WHERE id = 'job_aaa';

4. ConsistencyGuardian分析

5. 创建DiagnosticReport
   INSERT INTO "DiagnosticReport" (id, projectId, findings, internalErrorCount, crossFileErrorCount, createdAt, updatedAt)
   VALUES ('report_123', 'proj_123', '{...}', 15, 10, NOW(), NOW());

6. 更新AnalysisJob
   UPDATE "AnalysisJob"
   SET status = 'COMPLETED', result = '{"reportId": "report_123"}', completedAt = NOW(), updatedAt = NOW()
   WHERE id = 'job_aaa';

7. 更新Project状态
   UPDATE "Project"
   SET workflowStatus = 'ACT1_COMPLETE', updatedAt = NOW()
   WHERE id = 'proj_123';
```

### 5.4 ACT2-5迭代流程

```
1. 创建ITERATION任务
   INSERT INTO "AnalysisJob" (id, projectId, type, status, metadata, createdAt, updatedAt)
   VALUES ('job_bbb', 'proj_123', 'ITERATION', 'QUEUED', '{"act": "ACT2_CHARACTER", "focusName": "张三"}', NOW(), NOW());

2. 创建RevisionDecision（空proposals）
   INSERT INTO "RevisionDecision" (id, projectId, act, focusName, focusContext, version, createdAt, updatedAt)
   VALUES ('dec_456', 'proj_123', 'ACT2_CHARACTER', '张三', '{...}', 1, NOW(), NOW());

3. WorkflowQueue处理 (CharacterArchitect生成提案)

4. 更新RevisionDecision（填充proposals）
   UPDATE "RevisionDecision"
   SET proposals = '[{...}, {...}]', updatedAt = NOW()
   WHERE id = 'dec_456';

5. 更新AnalysisJob
   UPDATE "AnalysisJob"
   SET status = 'COMPLETED', result = '{"decisionId": "dec_456", "proposals": [...]}', completedAt = NOW()
   WHERE id = 'job_bbb';

6. 用户选择提案并执行

7. 更新RevisionDecision（填充userChoice和generatedChanges）
   UPDATE "RevisionDecision"
   SET userChoice = '0', generatedChanges = '{...}', updatedAt = NOW()
   WHERE id = 'dec_456';

8. 创建ScriptVersion
   INSERT INTO "ScriptVersion" (id, projectId, version, content, changeLog, createdAt)
   VALUES ('ver_789', 'proj_123', 2, '修改后的剧本', 'ACT2: 深化角色张三 - 提案1', NOW());

9. 更新Project状态
   UPDATE "Project"
   SET workflowStatus = 'ITERATING', updatedAt = NOW()
   WHERE id = 'proj_123';
```

### 5.5 Synthesis流程

```
1. 创建SYNTHESIS任务
   INSERT INTO "AnalysisJob" (id, projectId, type, status, metadata, createdAt, updatedAt)
   VALUES ('job_ccc', 'proj_123', 'SYNTHESIS', 'QUEUED', '{"options": {...}}', NOW(), NOW());

2. 更新Project状态
   UPDATE "Project"
   SET workflowStatus = 'SYNTHESIZING', updatedAt = NOW()
   WHERE id = 'proj_123';

3. WorkflowQueue处理 (SynthesisEngine合成)

4. 创建最终ScriptVersion
   INSERT INTO "ScriptVersion" (id, projectId, version, content, changeLog, synthesisMetadata, confidence, createdAt)
   VALUES ('ver_final', 'proj_123', 5, 'V2最终剧本', '应用5个决策，解决2个冲突', '{...}', 0.87, NOW());

5. 更新AnalysisJob
   UPDATE "AnalysisJob"
   SET status = 'COMPLETED', result = '{"versionId": "ver_final", "confidence": 0.87}', completedAt = NOW()
   WHERE id = 'job_ccc';

6. 更新Project状态和content
   UPDATE "Project"
   SET workflowStatus = 'COMPLETED', content = 'V2最终剧本', updatedAt = NOW()
   WHERE id = 'proj_123';
```

### 5.6 数据保留策略

**永久保留**:
- User记录（除非用户主动删除账户）
- Project记录（除非用户删除项目）
- ScriptVersion记录（完整版本历史）

**定期清理**:
- AnalysisJob: COMPLETED状态保留30天，FAILED状态保留7天
- DiagnosticReport: 保留最新版本，旧版本归档
- Session: 过期后自动删除（NextAuth管理）

**清理脚本示例**:
```sql
-- 清理30天前的COMPLETED任务
DELETE FROM "AnalysisJob"
WHERE status = 'COMPLETED'
  AND completedAt < NOW() - INTERVAL '30 days';

-- 清理7天前的FAILED任务
DELETE FROM "AnalysisJob"
WHERE status = 'FAILED'
  AND completedAt < NOW() - INTERVAL '7 days';
```

---

## 6. 查询模式与优化

### 6.1 常见查询模式

**Q1: Dashboard - 获取用户所有项目**
```typescript
// 查询
const projects = await prisma.project.findMany({
  where: { userId },
  orderBy: { updatedAt: 'desc' },
  take: 20,
  include: {
    scriptFiles: {
      select: { id: true, filename: true, episodeNumber: true }
    },
    _count: {
      select: { scriptFiles: true, scriptVersions: true }
    }
  }
});

// SQL (简化)
SELECT p.*,
       json_agg(sf.*) as scriptFiles,
       (SELECT COUNT(*) FROM "ScriptFile" WHERE "projectId" = p.id) as fileCount,
       (SELECT COUNT(*) FROM "ScriptVersion" WHERE "projectId" = p.id) as versionCount
FROM "Project" p
LEFT JOIN "ScriptFile" sf ON sf."projectId" = p.id
WHERE p."userId" = 'user_123'
GROUP BY p.id
ORDER BY p."updatedAt" DESC
LIMIT 20;

// 使用索引: Project_userId_idx
// 性能: ~5ms (20个项目)
```

**Q2: Analysis Page - 获取诊断报告**
```typescript
const report = await prisma.diagnosticReport.findUnique({
  where: { projectId },
  include: {
    project: {
      include: {
        scriptFiles: {
          orderBy: { episodeNumber: 'asc' }
        }
      }
    }
  }
});

// SQL (简化)
SELECT dr.*,
       p.*,
       json_agg(sf.* ORDER BY sf."episodeNumber") as scriptFiles
FROM "DiagnosticReport" dr
JOIN "Project" p ON p.id = dr."projectId"
LEFT JOIN "ScriptFile" sf ON sf."projectId" = p.id
WHERE dr."projectId" = 'proj_123'
GROUP BY dr.id, p.id;

// 使用索引: DiagnosticReport_projectId_key, ScriptFile_projectId_episodeNumber_idx
// 性能: ~10ms
```

**Q3: Iteration Page - 获取决策历史**
```typescript
const decisions = await prisma.revisionDecision.findMany({
  where: {
    projectId,
    generatedChanges: { not: null } // 已执行的决策
  },
  orderBy: { createdAt: 'desc' },
  include: {
    _count: {
      select: { /* related data */ }
    }
  }
});

// SQL
SELECT * FROM "RevisionDecision"
WHERE "projectId" = 'proj_123'
  AND "generatedChanges" IS NOT NULL
ORDER BY "createdAt" DESC;

// 使用索引: RevisionDecision_projectId_idx
// 性能: ~3ms
```

**Q4: WorkflowQueue - 获取待处理任务**
```typescript
const job = await prisma.analysisJob.findFirst({
  where: { status: 'QUEUED' },
  orderBy: { createdAt: 'asc' },
  include: {
    project: {
      include: {
        scriptFiles: {
          where: { conversionStatus: 'completed' }
        }
      }
    }
  }
});

// SQL
SELECT aj.*, p.*, json_agg(sf.*) as scriptFiles
FROM "AnalysisJob" aj
JOIN "Project" p ON p.id = aj."projectId"
LEFT JOIN "ScriptFile" sf ON sf."projectId" = p.id AND sf."conversionStatus" = 'completed'
WHERE aj."status" = 'QUEUED'
GROUP BY aj.id, p.id
ORDER BY aj."createdAt" ASC
LIMIT 1;

// 使用索引: AnalysisJob_status_idx
// 性能: ~2ms
```

### 6.2 N+1查询问题解决

**问题示例**:
```typescript
// ❌ 错误: N+1查询
const projects = await prisma.project.findMany({ where: { userId } });

for (const project of projects) {
  // 每个项目都执行一次查询
  const files = await prisma.scriptFile.findMany({ where: { projectId: project.id } });
}
// 总查询次数: 1 + N = 21次（N=20个项目）
```

**解决方案**:
```typescript
// ✅ 正确: 使用include
const projects = await prisma.project.findMany({
  where: { userId },
  include: {
    scriptFiles: true
  }
});
// 总查询次数: 1次（JOIN查询）
```

### 6.3 大结果集优化

**问题: 一次加载所有版本**
```typescript
// ❌ 可能导致OOM（Out of Memory）
const versions = await prisma.scriptVersion.findMany({
  where: { projectId }
});
// 如果有100个版本，每个100KB = 10MB数据
```

**解决方案: 分页查询**
```typescript
// ✅ 使用cursor分页
const PAGE_SIZE = 10;

const versions = await prisma.scriptVersion.findMany({
  where: { projectId },
  orderBy: { version: 'desc' },
  take: PAGE_SIZE,
  cursor: lastVersionId ? { id: lastVersionId } : undefined
});
```

### 6.4 JSON字段查询优化

**问题: 查询JSON字段**
```typescript
// 查询特定type的findings
const reports = await prisma.diagnosticReport.findMany({
  where: {
    // ❌ 无法直接查询JSON内部字段
    // findings.internalFindings.type: 'timeline'
  }
});
```

**解决方案1: 冗余字段**
```prisma
model DiagnosticReport {
  // ...
  findings Json
  // 冗余字段，方便查询
  internalErrorCount Int @default(0)
  crossFileErrorCount Int @default(0)

  @@index([internalErrorCount])
}
```

**解决方案2: 应用层过滤**
```typescript
// 在应用层过滤
const reports = await prisma.diagnosticReport.findMany({ where: { projectId } });

const timelineReports = reports.filter(r => {
  const findings = r.findings as any;
  return findings.internalFindings?.some(f => f.type === 'timeline');
});
```

### 6.5 批量操作优化

**问题: 逐个插入文件**
```typescript
// ❌ 慢: 50个文件 = 50次数据库往返
for (const file of files) {
  await prisma.scriptFile.create({ data: file });
}
// 总时间: ~500ms (10ms/文件 × 50)
```

**解决方案: 批量插入**
```typescript
// ✅ 快: 1次数据库往返
await prisma.scriptFile.createMany({
  data: files
});
// 总时间: ~50ms
```

---

## 7. 迁移管理

### 7.1 迁移历史

**Sprint 1 迁移**:
```
migrations/
└── 20251104092521_add_script_file_model/
    └── migration.sql
```

**迁移内容**:
```sql
-- CreateTable
CREATE TABLE "ScriptFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "episodeNumber" INTEGER,
    "rawContent" TEXT NOT NULL,
    "jsonContent" JSONB,
    "contentHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "conversionStatus" TEXT NOT NULL DEFAULT 'pending',
    "conversionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptFile_projectId_filename_key" ON "ScriptFile"("projectId", "filename");
CREATE INDEX "ScriptFile_projectId_idx" ON "ScriptFile"("projectId");
CREATE INDEX "ScriptFile_projectId_episodeNumber_idx" ON "ScriptFile"("projectId", "episodeNumber");

-- AddForeignKey
ALTER TABLE "ScriptFile" ADD CONSTRAINT "ScriptFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 7.2 执行迁移

**开发环境**:
```bash
# 1. 修改schema.prisma
# 2. 创建迁移
npx prisma migrate dev --name add_script_file_model

# 3. Prisma自动执行:
#    - 生成migration.sql
#    - 应用到数据库
#    - 重新生成Prisma Client

# 4. 验证
npx prisma studio
```

**生产环境**:
```bash
# 1. 在本地测试迁移
npx prisma migrate dev

# 2. 提交代码到Git

# 3. 在生产环境执行（使用DIRECT_URL）
npx prisma migrate deploy

# 注意:
# - 不要在build阶段执行migrate
# - 使用DIRECT_URL（不经过pgbouncer）
# - 迁移前备份数据库
```

### 7.3 回滚策略

**场景1: 迁移失败（未提交）**
```bash
# Prisma会自动回滚事务
# 修复schema.prisma后重新执行
npx prisma migrate dev
```

**场景2: 迁移成功但有问题**
```bash
# 1. 手动回滚（执行反向SQL）
psql -d director_actor_db -c "DROP TABLE ScriptFile;"

# 2. 删除迁移记录
DELETE FROM "_prisma_migrations" WHERE migration_name = '20251104092521_add_script_file_model';

# 3. 修复schema后重新迁移
npx prisma migrate dev
```

**场景3: 已部署到生产**
```bash
# ❌ 不推荐回滚（可能丢失数据）

# ✅ 推荐: 创建修复迁移
npx prisma migrate dev --name fix_script_file_model

# 在新迁移中添加ALTER TABLE等修复语句
```

### 7.4 零停机迁移策略

**添加字段**:
```sql
-- ✅ 安全: 添加nullable字段
ALTER TABLE "Project" ADD COLUMN "newField" TEXT;

-- ✅ 安全: 添加带默认值的字段
ALTER TABLE "Project" ADD COLUMN "newField" TEXT DEFAULT 'default_value';

-- ⚠️ 风险: 添加NOT NULL字段（旧数据无值）
-- 解决: 先添加nullable，填充数据，再改NOT NULL
```

**删除字段**:
```sql
-- Step 1: 停止使用该字段（代码部署）
-- Step 2: 等待1周（确保无旧代码访问）
-- Step 3: 删除字段
ALTER TABLE "Project" DROP COLUMN "oldField";
```

**重命名字段**:
```sql
-- ❌ 不要直接重命名（会导致停机）

-- ✅ 渐进式迁移:
-- Step 1: 添加新字段
ALTER TABLE "Project" ADD COLUMN "newName" TEXT;

-- Step 2: 双写（代码同时写入两个字段）
UPDATE "Project" SET "newName" = "oldName" WHERE "newName" IS NULL;

-- Step 3: 代码切换到读取新字段
-- Step 4: 停止写入旧字段
-- Step 5: 删除旧字段
ALTER TABLE "Project" DROP COLUMN "oldName";
```

---

## 8. 数据一致性保证

### 8.1 事务管理

**Prisma事务API**:
```typescript
// 示例: 创建项目 + 文件 + 触发分析（原子操作）
await prisma.$transaction(async (tx) => {
  // 1. 创建Project
  const project = await tx.project.create({
    data: {
      userId,
      title,
      content: '',
      status: 'draft',
      workflowStatus: 'INITIALIZED'
    }
  });

  // 2. 创建ScriptFile
  const file = await tx.scriptFile.create({
    data: {
      projectId: project.id,
      filename: 'script.md',
      episodeNumber: 1,
      rawContent: content,
      contentHash: generateHash(content),
      fileSize: content.length,
      conversionStatus: 'pending'
    }
  });

  // 3. 创建AnalysisJob
  const job = await tx.analysisJob.create({
    data: {
      projectId: project.id,
      type: 'ACT1_ANALYSIS',
      status: 'QUEUED'
    }
  });

  return { project, file, job };
});

// 如果任何步骤失败，全部回滚
```

**隔离级别**:
```typescript
// Prisma默认: READ COMMITTED
// 可配置: SERIALIZABLE（最强一致性，但性能较低）

await prisma.$transaction(
  async (tx) => {
    // ... 操作 ...
  },
  {
    isolationLevel: 'Serializable' // 可选: ReadCommitted, RepeatableRead, Serializable
  }
);
```

### 8.2 并发控制

**乐观锁（Optimistic Locking）**:
```prisma
model Project {
  id        String   @id
  version   Int      @default(1) // 版本号
  // ...
}
```

```typescript
// 更新时检查版本号
async function updateProject(id: string, currentVersion: int, data: any) {
  const result = await prisma.project.updateMany({
    where: {
      id,
      version: currentVersion // 必须匹配
    },
    data: {
      ...data,
      version: { increment: 1 } // 版本号+1
    }
  });

  if (result.count === 0) {
    throw new Error('并发冲突: 项目已被其他用户修改');
  }
}
```

**悲观锁（Pessimistic Locking）**:
```typescript
// 使用SELECT FOR UPDATE
await prisma.$queryRaw`
  SELECT * FROM "Project"
  WHERE id = ${projectId}
  FOR UPDATE;
`;

// 此时该行被锁定，其他事务必须等待
// 适用于高并发修改场景
```

### 8.3 唯一约束保证

**防止重复文件名**:
```prisma
@@unique([projectId, filename])
```

```typescript
// 尝试创建重复文件
try {
  await prisma.scriptFile.create({
    data: {
      projectId: 'proj_123',
      filename: '第1集.md', // 已存在
      // ...
    }
  });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw new Error('文件名已存在');
  }
}
```

### 8.4 外键级联保证

**删除Project时自动删除关联数据**:
```typescript
// 用户删除项目
await prisma.project.delete({
  where: { id: projectId }
});

// PostgreSQL自动级联删除:
// - ScriptFile (onDelete: Cascade)
// - AnalysisJob (onDelete: Cascade)
// - DiagnosticReport (onDelete: Cascade)
// - RevisionDecision (onDelete: Cascade)
// - ScriptVersion (onDelete: Cascade)

// 数据一致性: 不会留下孤儿记录
```

### 8.5 数据验证

**Prisma层验证**:
```prisma
model ScriptFile {
  episodeNumber Int? @default(1)
  fileSize      Int  @default(0)

  // Prisma只提供基础类型验证
  // 复杂验证在应用层（Zod）
}
```

**应用层验证（Zod）**:
```typescript
import { z } from 'zod';

const CreateFileSchema = z.object({
  filename: z.string().min(1, '文件名不能为空').max(255),
  episodeNumber: z.number().int().positive('集数必须为正整数'),
  rawContent: z.string().min(1, '内容不能为空'),
  fileSize: z.number().int().max(10 * 1024 * 1024, '文件不能超过10MB')
});

// 使用
const validated = CreateFileSchema.parse(input);
await prisma.scriptFile.create({ data: validated });
```

---

## 📝 总结

本文档详细描述了ScriptAI系统的数据库架构，包括：

1. **数据模型**: 8个核心表，覆盖用户、项目、文件、任务、报告、决策、版本
2. **表关系**: 级联删除、外键约束、一对多/一对一关系
3. **索引策略**: 主键、唯一、外键、查询优化索引
4. **查询优化**: N+1问题、分页、批量操作、JSON查询
5. **迁移管理**: 开发/生产迁移、回滚、零停机策略
6. **数据一致性**: 事务、并发控制、唯一约束、外键级联

**关键设计决策**:
- PostgreSQL + Prisma ORM（类型安全、自动迁移）
- 使用JSON字段存储灵活数据（findings, proposals）
- 级联删除确保数据完整性
- 索引优化高频查询
- 连接池配置适配Serverless

**下一步**:
请参考其他详细文档了解技术实现细节：
- [前端架构](./03_FRONTEND_ARCHITECTURE.md)
- [后端API](./04_BACKEND_API_ARCHITECTURE.md)
- [LLM集成](./05_LLM_INTEGRATION.md)
- [部署架构](./06_DEPLOYMENT_ARCHITECTURE.md)

---

**文档维护**: AI Assistant
**最后更新**: 2025-11-05
**文档状态**: ✅ 完整
**反馈**: GitHub Issues

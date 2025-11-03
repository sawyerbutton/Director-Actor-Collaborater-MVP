# 多剧本文件分析系统 - 需求与实施方案

**文档版本**: v1.0
**创建日期**: 2025-01-03
**分支**: `feature/multi-script-analysis`
**预计完成时间**: 10个工作日

---

## 📋 项目概述

### 背景与动机

当前ScriptAI系统的ACT1模块仅支持**单个剧本文件**的逻辑检查，但真实的编剧工作场景通常需要同时处理**多集剧本**（如电视剧系列、网剧系列等）。单文件检查无法发现**跨集矛盾**，例如：

- 第2集的时间线早于第1集结尾
- 角色在第1集死亡，却在第3集再次出现
- 第1集埋下的伏笔在后续集中未被回收
- 世界观设定在不同集之间发生冲突

本项目旨在将ACT1能力扩展到**多文件项目级分析**，支持：
1. ✅ 上传和管理多个剧本文件
2. ✅ 将剧本转换为结构化JSON（便于分析）
3. ✅ 单文件内部逻辑检查（复用现有能力）
4. ✅ 跨文件一致性检查（新增能力）
5. ✅ 统一的诊断报告展示

---

## 🎯 核心需求

### 功能需求

| 需求ID | 需求描述 | 优先级 | 涉及模块 |
|--------|---------|--------|----------|
| FR-01 | 支持批量上传多个剧本文件（.txt/.md/.markdown） | P0 | 前端+后端 |
| FR-02 | 自动识别集数编号（从文件名提取） | P1 | 后端 |
| FR-03 | 文件内容去重检测（基于Hash） | P2 | 后端 |
| FR-04 | 剧本文件→结构化JSON转换 | P0 | Python微服务 |
| FR-05 | 单文件内部逻辑检查（5类错误） | P0 | TypeScript Agent |
| FR-06 | 跨文件一致性检查（4类新错误） | P0 | TypeScript Agent + AI |
| FR-07 | 统一诊断报告（区分单文件/跨文件问题） | P0 | 前端+后端 |
| FR-08 | 文件列表管理（增删改查、排序） | P1 | 前端+后端 |
| FR-09 | 转换进度实时展示 | P2 | 前端 |
| FR-10 | 跨文件问题关联高亮 | P2 | 前端 |

### 非功能需求

| 需求ID | 需求描述 | 指标 |
|--------|---------|------|
| NFR-01 | 单个文件上传响应时间 | < 2秒 |
| NFR-02 | JSON转换时间（1000行剧本） | < 30秒 |
| NFR-03 | 多文件检查总时间（5个文件） | < 5分钟 |
| NFR-04 | 并发文件上传支持 | 10个/用户 |
| NFR-05 | 系统可用性（Docker部署） | > 99% |
| NFR-06 | 数据持久化（PostgreSQL） | 无丢失 |

---

## 🏗️ 技术架构设计

### 系统架构图

```
┌──────────────────────────────────────────────────────────────┐
│                     前端 (Next.js)                            │
│  ┌────────────────────┐      ┌──────────────────────┐       │
│  │ MultiFileUploader  │      │ DiagnosticReport     │       │
│  │ - 拖拽上传          │      │ - 单文件问题列表      │       │
│  │ - 批量处理          │      │ - 跨文件问题关联      │       │
│  │ - 进度展示          │      │ - 问题详情展开        │       │
│  └────────┬───────────┘      └──────────┬───────────┘       │
└───────────┼──────────────────────────────┼───────────────────┘
            │ HTTP/JSON                    │
            ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Next.js API Routes (TypeScript)                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ POST /api/v1/projects/:id/files        - 上传文件      │  │
│  │ POST /api/v1/projects/:id/files/batch  - 批量上传      │  │
│  │ GET  /api/v1/projects/:id/files        - 文件列表      │  │
│  │ POST /api/v1/projects/:id/files/:fileId/convert        │  │
│  │      - 触发JSON转换                                     │  │
│  │ POST /api/v1/projects/:id/analyze-multi - 多文件分析   │  │
│  └────────────────────────────────────────────────────────┘  │
└───────┬──────────────────────────────┬───────────────────────┘
        │                              │
        ▼                              ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  PostgreSQL         │      │  Python FastAPI 微服务        │
│  ┌───────────────┐  │      │  ┌────────────────────────┐  │
│  │ ScriptFile    │  │      │  │ POST /convert/script   │  │
│  │ - rawContent  │  │      │  │ POST /convert/outline  │  │
│  │ - jsonContent │  │      │  │ - DeepSeek API集成     │  │
│  │ - metadata    │  │      │  │ - Pydantic验证         │  │
│  └───────────────┘  │      │  └────────────────────────┘  │
└─────────────────────┘      └──────────────────────────────┘
        ▲                              │
        │                              │
        └──────────────────────────────┘
                    JSON存储

        ┌──────────────────────────────────────┐
        │  AI Analysis Layer                   │
        │  ┌────────────────────────────────┐  │
        │  │ ConsistencyGuardian            │  │
        │  │ - 单文件内部检查 (复用)         │  │
        │  │ - 5类错误类型                   │  │
        │  └────────────────────────────────┘  │
        │  ┌────────────────────────────────┐  │
        │  │ CrossFileAnalyzer (新增)       │  │
        │  │ - 跨文件一致性检查              │  │
        │  │ - 4类新错误类型                 │  │
        │  │ - AI辅助决策                    │  │
        │  └────────────────────────────────┘  │
        └──────────────────────────────────────┘
```

### 技术栈选型

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| 前端 | Next.js + TypeScript | 14.x | 现有技术栈 |
| 后端API | Next.js API Routes | 14.x | 统一架构 |
| 微服务 | Python FastAPI | 0.109+ | 复用现有Python转换代码 |
| 数据库 | PostgreSQL + Prisma | 16 / 5.x | 现有技术栈 |
| LLM | DeepSeek API | V3.2 | 现有集成 |
| 容器化 | Docker + Docker Compose | 24.x | 生产环境要求 |
| 文件上传 | Next.js + Multer | Latest | 标准方案 |
| 验证 | Pydantic V2 (Python) | 2.x | 现有验证逻辑 |

---

## 🗄️ 数据库Schema设计

### 新增模型：ScriptFile

```prisma
model ScriptFile {
  id                String   @id @default(cuid())
  projectId         String
  filename          String   // 原始文件名（如"第1集.md"）
  episodeNumber     Int?     // 集数编号（用于排序，从文件名提取）
  rawContent        String   @db.Text // 原始文本内容
  jsonContent       Json?    // 转换后的结构化JSON
  contentHash       String   // SHA256哈希（用于检测重复）
  fileSize          Int      // 文件大小（bytes）
  conversionStatus  String   @default("pending") // pending/processing/completed/failed
  conversionError   String?  @db.Text // 转换错误信息
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 关联关系
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, filename]) // 同一项目内文件名唯一
  @@index([projectId])
  @@index([projectId, episodeNumber])
}
```

### 扩展模型：Project

```prisma
model Project {
  // ... 现有字段保持不变
  scriptFiles     ScriptFile[] // 新增：关联多个剧本文件
}
```

### 扩展模型：DiagnosticReport

**findings JSON结构变更**：

```typescript
{
  "internalFindings": [  // 单文件内部问题（现有5类）
    {
      "fileId": "clx123...",
      "filename": "第1集.md",
      "episodeNumber": 1,
      "type": "timeline" | "character" | "plot" | "dialogue" | "scene",
      "severity": "critical" | "high" | "medium" | "low",
      "location": {
        "sceneNumber": 5,
        "line": 123,
        "content": "原文摘录..."
      },
      "description": "时间线矛盾：角色在同一天出现在两个不同城市",
      "suggestion": "调整场景时间设定",
      "confidence": 0.92
    }
  ],
  "crossFileFindings": [  // 跨文件问题（新增4类）
    {
      "id": "cross-001",
      "type": "cross_file_timeline" | "cross_file_character" | "cross_file_plot" | "cross_file_setting",
      "severity": "critical" | "high" | "medium" | "low",
      "affectedFiles": [
        {
          "fileId": "clx123...",
          "filename": "第1集.md",
          "episodeNumber": 1,
          "location": { "sceneId": "S10", "line": 450 }
        },
        {
          "fileId": "clx456...",
          "filename": "第2集.md",
          "episodeNumber": 2,
          "location": { "sceneId": "S01", "line": 15 }
        }
      ],
      "description": "第2集开场时间（2024年3月1日）早于第1集结尾（2024年3月5日）",
      "suggestion": "将第2集开场时间调整为3月6日或更晚",
      "confidence": 0.95,
      "evidence": [
        "第1集最后一场：'五天后，张三终于到达了目的地'",
        "第2集第一场：'三月初，李四开始了新的旅程'"
      ]
    }
  ],
  "summary": {
    "totalFiles": 5,
    "totalInternalErrors": 23,
    "totalCrossFileErrors": 7,
    "criticalCount": 8,
    "highCount": 12,
    "mediumCount": 7,
    "lowCount": 3
  }
}
```

---

## 🔌 API设计

### 文件管理API

#### 1. 上传单个文件

```http
POST /api/v1/projects/:projectId/files
Content-Type: multipart/form-data

file: File
episodeNumber?: number (optional)

Response:
{
  "success": true,
  "data": {
    "id": "clx123...",
    "filename": "第1集.md",
    "episodeNumber": 1,
    "fileSize": 15234,
    "contentHash": "sha256...",
    "conversionStatus": "pending"
  }
}
```

#### 2. 批量上传

```http
POST /api/v1/projects/:projectId/files/batch
Content-Type: multipart/form-data

files: File[]

Response:
{
  "success": true,
  "data": {
    "uploaded": 5,
    "failed": 0,
    "files": [...]
  }
}
```

#### 3. 获取文件列表

```http
GET /api/v1/projects/:projectId/files

Response:
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "filename": "第1集.md",
      "episodeNumber": 1,
      "fileSize": 15234,
      "conversionStatus": "completed",
      "createdAt": "2025-01-03T10:00:00Z"
    }
  ]
}
```

#### 4. 删除文件

```http
DELETE /api/v1/projects/:projectId/files/:fileId

Response:
{
  "success": true,
  "message": "文件已删除"
}
```

### JSON转换API

#### 5. 触发转换

```http
POST /api/v1/projects/:projectId/files/:fileId/convert
Content-Type: application/json

{
  "sceneType": "standard" | "outline"
}

Response:
{
  "success": true,
  "data": {
    "jobId": "conv-123...",
    "status": "processing"
  }
}
```

#### 6. 查询转换状态

```http
GET /api/v1/projects/:projectId/files/:fileId/conversion-status

Response:
{
  "success": true,
  "data": {
    "status": "completed",
    "sceneCount": 15,
    "error": null
  }
}
```

### 多文件分析API

#### 7. 触发多文件分析

```http
POST /api/v1/projects/:projectId/analyze-multi
Content-Type: application/json

{
  "fileIds": ["clx123...", "clx456..."], // optional, 默认全部
  "skipConversion": false // 是否跳过未转换的文件
}

Response:
{
  "success": true,
  "data": {
    "jobId": "job-789...",
    "status": "queued"
  }
}
```

#### 8. 查询分析状态（复用现有）

```http
GET /api/v1/analyze/jobs/:jobId

Response:
{
  "jobId": "job-789...",
  "status": "COMPLETED",
  "progress": 100,
  "result": {
    "reportId": "report-001..."
  }
}
```

---

## 📅 详细实施计划

### Sprint 1: 多文件基础架构 (3天)

| 任务ID | 任务描述 | 负责模块 | 预计耗时 | 依赖任务 |
|--------|---------|---------|---------|---------|
| T1.1 | 创建ScriptFile Prisma模型 | 数据库 | 0.5天 | - |
| T1.2 | 编写migration脚本并执行 | 数据库 | 0.5天 | T1.1 |
| T1.3 | 创建ScriptFileService（CRUD） | 后端 | 1天 | T1.2 |
| T1.4 | 文件上传API实现（单个+批量） | 后端 | 1天 | T1.3 |
| T1.5 | 文件Hash检测和去重逻辑 | 后端 | 0.5天 | T1.4 |
| T1.6 | 集数编号自动识别（正则提取） | 后端 | 0.5天 | T1.4 |
| T1.7 | MultiFileUploader组件开发 | 前端 | 1天 | T1.4 |
| T1.8 | 文件列表管理UI（增删改查） | 前端 | 0.5天 | T1.7 |
| T1.9 | 单元测试：Service层 | 测试 | 0.5天 | T1.3 |

**里程碑1**: 用户可以上传、管理多个剧本文件 ✅

---

### Sprint 2: JSON转换服务 (2天)

| 任务ID | 任务描述 | 负责模块 | 预计耗时 | 依赖任务 |
|--------|---------|---------|---------|---------|
| T2.1 | 创建FastAPI项目结构 | Python微服务 | 0.5天 | - |
| T2.2 | 复用现有Python转换代码 | Python微服务 | 0.5天 | T2.1 |
| T2.3 | 实现/convert/script endpoint | Python微服务 | 1天 | T2.2 |
| T2.4 | 实现/convert/outline endpoint | Python微服务 | 0.5天 | T2.3 |
| T2.5 | DeepSeek API集成和错误处理 | Python微服务 | 0.5天 | T2.3 |
| T2.6 | Docker镜像构建和测试 | DevOps | 0.5天 | T2.5 |
| T2.7 | 创建ConversionService客户端 | 后端 | 0.5天 | T2.5 |
| T2.8 | 转换API封装（Next.js） | 后端 | 0.5天 | T2.7 |
| T2.9 | 转换状态轮询逻辑 | 后端 | 0.5天 | T2.8 |
| T2.10 | 前端转换进度展示 | 前端 | 0.5天 | T2.9 |
| T2.11 | Docker Compose配置 | DevOps | 0.5天 | T2.6 |

**里程碑2**: 剧本文件可自动转换为结构化JSON ✅

---

### Sprint 3: 分层检查系统 (4天)

| 任务ID | 任务描述 | 负责模块 | 预计耗时 | 依赖任务 |
|--------|---------|---------|---------|---------|
| T3.1 | 扩展DiagnosticReport结构 | 数据库 | 0.5天 | Sprint 2 |
| T3.2 | 单文件检查：批量调用逻辑 | 后端 | 1天 | T3.1 |
| T3.3 | 单文件检查：结果合并 | 后端 | 0.5天 | T3.2 |
| T3.4 | 创建CrossFileAnalyzer类 | 后端 | 0.5天 | T3.3 |
| T3.5 | 实现时间线跨文件检查 | 后端+AI | 1天 | T3.4 |
| T3.6 | 实现角色跨文件检查 | 后端+AI | 1天 | T3.4 |
| T3.7 | 实现情节跨文件检查 | 后端+AI | 0.5天 | T3.4 |
| T3.8 | 实现设定跨文件检查 | 后端+AI | 0.5天 | T3.4 |
| T3.9 | AI辅助决策Prompt设计 | AI | 1天 | T3.5-T3.8 |
| T3.10 | 跨文件检查结果存储 | 后端 | 0.5天 | T3.9 |
| T3.11 | 多文件分析API实现 | 后端 | 1天 | T3.10 |
| T3.12 | 诊断报告UI重构（分组展示） | 前端 | 1天 | T3.11 |
| T3.13 | 跨文件问题关联高亮 | 前端 | 1天 | T3.12 |
| T3.14 | 单元测试：CrossFileAnalyzer | 测试 | 0.5天 | T3.10 |

**里程碑3**: 系统支持单文件+跨文件完整检查 ✅

---

### Sprint 4: 整合测试与优化 (1天)

| 任务ID | 任务描述 | 负责模块 | 预计耗时 | 依赖任务 |
|--------|---------|---------|---------|---------|
| T4.1 | 端到端功能测试 | 测试 | 0.5天 | Sprint 3 |
| T4.2 | 性能测试（大文件场景） | 测试 | 0.5天 | T4.1 |
| T4.3 | 错误边界测试 | 测试 | 0.5天 | T4.1 |
| T4.4 | 文档完善（API文档） | 文档 | 0.5天 | T4.3 |
| T4.5 | Docker部署验证 | DevOps | 0.5天 | T4.3 |
| T4.6 | 生产环境配置 | DevOps | 0.5天 | T4.5 |

**里程碑4**: 系统可在生产环境部署运行 ✅

---

## 📊 任务时间汇总

| Sprint | 核心任务 | 预计耗时 | 关键交付物 |
|--------|---------|---------|-----------|
| Sprint 1 | 多文件基础架构 | 3天 | ScriptFile模型、上传API、前端UI |
| Sprint 2 | JSON转换服务 | 2天 | Python微服务、Docker镜像、转换API |
| Sprint 3 | 分层检查系统 | 4天 | CrossFileAnalyzer、AI检查、新UI |
| Sprint 4 | 整合测试与优化 | 1天 | 测试报告、部署文档 |
| **总计** | **4个Sprint** | **10天** | **完整多文件分析系统** |

---

## ⚠️ 风险评估

### 技术风险

| 风险ID | 风险描述 | 影响等级 | 概率 | 缓解措施 |
|--------|---------|---------|------|---------|
| R-01 | Python微服务部署失败 | 高 | 低 | 提前准备Docker镜像测试 |
| R-02 | LLM上下文长度限制 | 中 | 中 | 实施chunking策略（现有技术） |
| R-03 | 跨文件检查准确率不足 | 中 | 中 | 使用更强大的Prompt+多轮验证 |
| R-04 | 数据库性能瓶颈 | 低 | 低 | 添加索引优化+分页加载 |
| R-05 | 前端上传大文件超时 | 低 | 中 | 实施分片上传（如需要） |

### 时间风险

| 风险ID | 风险描述 | 影响等级 | 缓解措施 |
|--------|---------|---------|---------|
| TR-01 | Sprint 3时间超期 | 中 | AI检查可简化为规则检查（降级方案） |
| TR-02 | 测试时间不足 | 低 | 自动化测试优先，手动测试并行 |

---

## ✅ 成功标准

### 功能验收标准

1. **多文件上传**
   - [ ] 支持拖拽上传5个以上文件
   - [ ] 自动识别集数编号准确率 > 90%
   - [ ] 重复文件检测正常工作

2. **JSON转换**
   - [ ] 标准剧本转换成功率 > 95%
   - [ ] 故事大纲转换成功率 > 90%
   - [ ] 转换时间符合NFR-02指标

3. **分层检查**
   - [ ] 单文件检查复用现有能力（5类错误）
   - [ ] 跨文件检查覆盖4类新错误
   - [ ] 检查准确率 > 85%（人工抽样验证）

4. **UI体验**
   - [ ] 文件管理操作流畅（增删改查）
   - [ ] 诊断报告清晰（单文件/跨文件问题分组）
   - [ ] 跨文件问题关联可视化

### 性能验收标准

| 指标 | 目标值 | 测试场景 |
|------|-------|---------|
| 文件上传响应 | < 2秒 | 单个10MB文件 |
| JSON转换时间 | < 30秒 | 1000行剧本 |
| 多文件检查 | < 5分钟 | 5个文件，共5000行 |
| 诊断报告加载 | < 1秒 | 50个问题 |

---

## 📦 交付清单

### 代码交付

- [ ] Prisma Schema迁移文件
- [ ] ScriptFileService完整实现
- [ ] Python FastAPI微服务代码
- [ ] CrossFileAnalyzer完整实现
- [ ] 新增API Routes（8个端点）
- [ ] 前端组件（MultiFileUploader等）
- [ ] Docker Compose配置文件
- [ ] 单元测试覆盖率 > 80%

### 文档交付

- [ ] 本需求文档
- [ ] API接口文档（Swagger/OpenAPI）
- [ ] 数据库Schema文档（更新）
- [ ] Docker部署手册
- [ ] 测试报告

### DevOps交付

- [ ] Python微服务Docker镜像
- [ ] Docker Compose生产配置
- [ ] 环境变量配置模板
- [ ] 健康检查脚本

---

## 📝 后续迭代计划（V2）

以下功能不在本期范围，计划在Phase 2实现：

1. **自动修复功能**
   - 跨文件问题自动修复策略
   - 用户确认修复方案
   - 版本对比和回滚

2. **高级功能**
   - 剧本版本对比（跨文件）
   - 问题优先级智能排序
   - 导出完整诊断报告（PDF）

3. **性能优化**
   - 增量检查（只检查变更文件）
   - 缓存策略优化
   - 分布式处理（多Worker）

---

## 📞 联系与协作

**项目负责人**: [待填写]
**技术架构**: Claude Code AI Assistant
**Git分支**: `feature/multi-script-analysis`
**Jira看板**: [待创建]

**日常沟通**:
- Daily Standup: 每日上午10:00
- Code Review: 每个PR提交后24小时内
- Sprint Review: 每个Sprint结束时

---

**文档状态**: ✅ 已批准，待开发
**下一步行动**: 执行Sprint 1任务清单


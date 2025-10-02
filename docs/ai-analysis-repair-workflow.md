# ScriptAI 完整工作流程文档 - V1 API架构（生产版本）

## 文档说明 📋

**本文档描述的是当前生产环境使用的V1 API架构**，包括完整的五幕剧工作流程和数据库持久化系统。

**架构版本**: V1 API (Database-backed, Epic 004-007)
**更新日期**: 2025-10-02
**文档版本**: 3.0.0

---

## 系统概述

ScriptAI 是一个基于AI的剧本分析与协作修改系统，采用"五幕剧"工作流程：

1. **Act 1 - 基础诊断** (ConsistencyGuardian): 检测5类剧本错误
2. **Act 2 - 角色弧光** (CharacterArchitect): 迭代修复角色矛盾
3. **Act 3 - 世界观审查** (RulesAuditor): 审查设定一致性与主题对齐
4. **Act 4 - 节奏优化** (PacingStrategist): 优化情节节奏和冲突分布
5. **Act 5 - 主题润色** (ThematicPolisher): 强化角色深度和共情力
6. **Synthesis - 综合整合** (SynthesisEngine): 智能合并所有修改为最终剧本(V2)

### 核心架构特点

- ✅ **数据库持久化**: PostgreSQL + Prisma ORM，所有数据服务器端存储
- ✅ **异步任务队列**: WorkflowQueue处理长时间AI分析，状态轮询机制
- ✅ **五幕工作流状态机**: WorkflowStatus枚举追踪进度
- ✅ **AI Agent系统**: 5个专业Agent处理不同幕的分析和生成任务
- ✅ **智能冲突检测**: 自动识别并解决6类决策冲突
- ✅ **风格保持系统**: 6维度风格分析，确保生成剧本与原文一致

---

## 一、完整工作流程图

```
┌─────────────────────────────────────────────────────────────────┐
│ 入口: Dashboard (http://localhost:3000/dashboard)              │
│   - 上传剧本 (.txt/.md/.markdown)                              │
│   - 点击"开始AI分析"                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Act 1: 基础诊断 (异步任务)                                      │
│   API: POST /api/v1/projects (创建项目)                        │
│        POST /api/v1/analyze (启动分析)                         │
│        GET /api/v1/analyze/jobs/:jobId (状态轮询)              │
│   状态: INITIALIZED → ACT1_RUNNING → ACT1_COMPLETE             │
│   输出: DiagnosticReport (5类错误发现)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Acts 2-5: 迭代式协作修改 (交互式决策循环)                       │
│                                                                 │
│   每个Act的工作流程:                                            │
│   1. 用户从Act 1报告中选择焦点问题                              │
│   2. API: POST /api/v1/iteration/propose                       │
│      → AI生成2+个解决方案提案（带优缺点分析）                    │
│   3. 用户在UI中查看提案，选择最佳方案                            │
│   4. API: POST /api/v1/iteration/execute                       │
│      → AI执行选定方案，生成具体修改                              │
│   5. 存储决策到 RevisionDecision 表                             │
│   6. 重复1-5直到完成该幕所有问题                                 │
│                                                                 │
│   Act 2 (角色弧光): CharacterArchitect                          │
│     - P4: 聚焦角色矛盾分析                                       │
│     - P5: 生成2个解决方案提案                                    │
│     - P6: "Show, Don't Tell"戏剧化转换                          │
│                                                                 │
│   Act 3 (世界观): RulesAuditor                                  │
│     - P7: 核心设定逻辑审查                                       │
│     - P8: 动态规则验证（连锁反应分析）                            │
│     - P9: 设定-主题对齐策略                                      │
│                                                                 │
│   Act 4 (节奏): PacingStrategist                                │
│     - P10: 节奏与情感空间分析                                    │
│     - P11: 冲突重分配策略                                        │
│                                                                 │
│   Act 5 (主题): ThematicPolisher                                │
│     - P12: 角色去标签化与深度提升                                │
│     - P13: 核心恐惧与信念定义                                    │
│                                                                 │
│   状态: ACT1_COMPLETE → ITERATING                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Synthesis: 智能合成最终剧本                                      │
│   API: POST /api/v1/synthesize (触发合成)                       │
│        GET /api/v1/synthesize/:jobId/status (状态轮询)          │
│                                                                 │
│   合成流程:                                                      │
│   1. 决策分组: 按幕和焦点分组所有RevisionDecision                 │
│   2. 冲突检测: 识别6类冲突（角色、时间线、设定、情节、对话、主题） │
│   3. 冲突解决: 80%自动解决，20%标记人工审查                       │
│   4. 风格分析: 6维度分析原剧本风格                               │
│   5. Prompt构建: 合成综合提示词（含风格指南+冲突解决）            │
│   6. 分块处理: 长剧本分6000 token块，重叠500 token               │
│   7. AI合成: DeepSeek生成最终剧本                                │
│   8. 验证: 一致性检查、风格一致性、完整性验证                     │
│   9. 版本创建: 保存V2到ScriptVersion表                           │
│   10. 变更日志: 生成详细修改记录                                 │
│                                                                 │
│   状态: ITERATING → SYNTHESIZING → COMPLETED                    │
│   输出: ScriptVersion V2 + ChangeLog + Confidence Score         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 导出与对比                                                       │
│   API: POST /api/v1/export (导出剧本)                           │
│        GET /api/v1/versions/:id/diff/:targetId (版本对比)       │
│                                                                 │
│   支持格式: TXT, MD, DOCX                                        │
│   对比功能: V1 vs V2差异可视化                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、手动使用指南（Step-by-Step）

### 前置准备

#### 环境配置
```bash
# 1. 克隆项目并安装依赖
git clone <repository-url>
cd Director-Actor-Collaborater-MVP
npm install

# 2. 启动本地PostgreSQL数据库
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 postgres:16-alpine

# 3. 配置环境变量 (.env.local)
cat > .env.local << EOF
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DEEPSEEK_API_KEY=your_actual_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com
DISABLE_RATE_LIMIT=true
EOF

# 4. 初始化数据库
npx prisma db push
npx prisma db seed  # 创建demo-user

# 5. 启动开发服务器
DISABLE_RATE_LIMIT=true npm run dev
```

访问 http://localhost:3000/dashboard

---

### Act 1: 基础诊断（自动化）

#### 步骤1: 上传剧本并启动分析

**页面**: http://localhost:3000/dashboard

1. **准备测试剧本** (建议500-5000字中文剧本)
   - 支持格式: `.txt`, `.md`, `.markdown`
   - 包含场景、角色、对话的明确格式

2. **上传方式**
   - **方式1**: 直接在文本框粘贴
   - **方式2**: 点击"文件上传"选择文件
   - **方式3**: 点击"使用示例剧本"测试

3. **触发分析**
   - 点击 **"开始AI分析"** 按钮
   - 系统自动执行以下操作：
     ```typescript
     // app/dashboard/page.tsx:39-60
     const project = await v1ApiService.createProject(...)  // 创建项目
     const analysisJob = await v1ApiService.startAnalysis(...) // 启动Act 1
     router.push(`/analysis/${project.id}`)  // 跳转到分析页面
     ```

#### 步骤2: 等待分析完成

**页面**: http://localhost:3000/analysis/[projectId]

- **状态轮询**: 前端每2秒查询一次任务状态
  ```typescript
  // lib/services/v1-api-service.ts:253-298
  await v1ApiService.pollJobStatus(jobId, (status) => {
    // 更新进度条: QUEUED → PROCESSING → COMPLETED
  })
  ```

- **预期时间**:
  - 短剧本(<1000字): 10-20秒
  - 中等剧本(1000-3000字): 20-40秒
  - 长剧本(3000-5000字): 40-90秒

#### 步骤3: 查看诊断报告

分析完成后，页面显示 **DiagnosticReport**:

**5类错误类型**:
1. **timeline_inconsistency** - 时间线矛盾
2. **character_contradiction** - 角色行为矛盾
3. **plot_hole** - 情节漏洞
4. **dialogue_inconsistency** - 对话不一致
5. **scene_logic_error** - 场景逻辑错误

**报告结构**:
```json
{
  "findings": [
    {
      "type": "character_contradiction",
      "severity": "high",
      "location": { "scene": 1, "line": 15 },
      "description": "张明在第1场说'第一次见面'，但第3场却说'认识很多年'",
      "suggestion": "统一角色记忆设定",
      "confidence": 0.92
    }
  ],
  "summary": "发现3处高优先级错误，建议优先修复角色矛盾",
  "confidence": 0.88,
  "statistics": {
    "totalFindings": 5,
    "bySeverity": { "high": 3, "medium": 1, "low": 1 }
  }
}
```

**数据库记录**:
```sql
-- Project表: workflowStatus更新为ACT1_COMPLETE
-- DiagnosticReport表: 保存findings JSON
-- AnalysisJob表: status更新为COMPLETED
```

---

### Acts 2-5: 交互式迭代修改

**✅ 前端UI已完成**: 迭代工作区页面已实现，支持完整的Acts 2-5交互式决策流程。

**页面路径**: `/iteration/[projectId]`

**工作流程**:
1. 从Act 1分析页面点击"进入迭代工作区"按钮
2. 选择Act (2/3/4/5)和焦点问题
3. 获取AI提案并选择方案
4. 查看生成的具体修改
5. 完成后点击"生成最终剧本"进入合成阶段

#### Act 2 示例: 修复角色矛盾（CharacterArchitect）

**场景**: Act 1报告中发现"张明"的角色矛盾

##### 步骤1: 提出问题并获取AI提案

```bash
# API调用: POST /api/v1/iteration/propose
curl -X POST http://localhost:3000/api/v1/iteration/propose \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "你的项目ID",
    "act": "ACT2_CHARACTER",
    "focusName": "张明",
    "contradiction": "在第1场说'第一次见面'，但第3场却说'认识很多年'",
    "scriptContext": "场景1: ...\n场景3: ..."
  }'
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "decisionId": "clx123abc",
    "focusContext": {
      "characterName": "张明",
      "contradiction": "...",
      "relatedScenes": [1, 3]
    },
    "proposals": [
      {
        "id": "0",
        "title": "方案A: 修改为旧友重逢",
        "description": "将两人关系改为多年未见的老朋友",
        "pros": ["更有情感张力", "符合重逢戏剧性"],
        "cons": ["需要增加背景铺垫"]
      },
      {
        "id": "1",
        "title": "方案B: 统一为初次见面",
        "description": "删除'认识很多年'，保持陌生人设定",
        "pros": ["简洁", "逻辑一致"],
        "cons": ["减少情感复杂度"]
      }
    ],
    "recommendation": "0"
  }
}
```

**数据库变化**:
```sql
-- RevisionDecision表新增一条记录:
INSERT INTO RevisionDecision (
  id, projectId, act, focusName, focusContext, proposals, userChoice, generatedChanges
) VALUES (
  'clx123abc', '项目ID', 'ACT2_CHARACTER', '张明',
  '{"contradiction": "..."}',  -- focusContext JSON
  '[{"id": "0", ...}, {"id": "1", ...}]',  -- proposals JSON
  NULL,  -- userChoice (未选择)
  NULL   -- generatedChanges (未执行)
);
```

##### 步骤2: 选择方案并执行

```bash
# API调用: POST /api/v1/iteration/execute
curl -X POST http://localhost:3000/api/v1/iteration/execute \
  -H "Content-Type: application/json" \
  -d '{
    "decisionId": "clx123abc",
    "proposalChoice": "0"
  }'
```

**返回示例** (P6 "Show, Don't Tell" 转换结果):
```json
{
  "success": true,
  "data": {
    "decisionId": "clx123abc",
    "generatedChanges": {
      "overallArc": "张明与李华从陌生到重拾友谊的情感弧线",
      "dramaticActions": [
        {
          "scene": 1,
          "action": "张明看到李华时，手中的咖啡杯微微一颤",
          "reveals": "暗示两人有过去"
        },
        {
          "scene": 3,
          "action": "李华翻出一张十年前的合影，默默放在桌上",
          "reveals": "确认旧友关系，无需明说"
        }
      ],
      "integrationNotes": "用肢体语言和道具替代直白对话"
    }
  }
}
```

**数据库更新**:
```sql
-- 更新RevisionDecision记录:
UPDATE RevisionDecision SET
  userChoice = '0',
  generatedChanges = '{"overallArc": "...", "dramaticActions": [...]}'
WHERE id = 'clx123abc';

-- Project表: workflowStatus保持ITERATING或更新为下一个Act
```

#### Act 3 示例: 世界观审查（RulesAuditor）

```bash
# Step 1: Propose
curl -X POST http://localhost:3000/api/v1/iteration/propose \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "项目ID",
    "act": "ACT3_WORLDBUILDING",
    "focusName": "时间旅行规则",
    "contradiction": "第2幕说'不能改变过去'，第5幕却改变了",
    "scriptContext": "..."
  }'

# 返回: P7核心设定逻辑 + P8动态规则验证

# Step 2: Execute
curl -X POST http://localhost:3000/api/v1/iteration/execute \
  -H "Content-Type: application/json" \
  -d '{"decisionId": "...", "proposalChoice": "1"}'

# 返回: P9设定-主题对齐策略
```

#### Act 4 示例: 节奏优化（PacingStrategist）

```bash
# Propose: 获取P10节奏分析 + P11冲突重分配策略
curl -X POST .../iteration/propose \
  -d '{"act": "ACT4_PACING", "focusName": "高潮部分", ...}'

# Execute: 直接应用选定策略（无额外AI调用）
curl -X POST .../iteration/execute \
  -d '{"decisionId": "...", "proposalChoice": "0"}'
```

#### Act 5 示例: 主题润色（ThematicPolisher）

```bash
# Propose: 获取P12角色去标签化分析
curl -X POST .../iteration/propose \
  -d '{"act": "ACT5_THEME", "focusName": "主角深度", ...}'

# Execute: 获取P13核心恐惧与信念定义
curl -X POST .../iteration/execute \
  -d '{"decisionId": "...", "proposalChoice": "0"}'
```

#### 查看所有决策历史

```bash
# GET /api/v1/projects/:id/decisions
curl http://localhost:3000/api/v1/projects/你的项目ID/decisions

# 返回所有RevisionDecision记录:
{
  "decisions": [
    {
      "id": "...",
      "act": "ACT2_CHARACTER",
      "focusName": "张明",
      "userChoice": "0",
      "createdAt": "2025-10-02T10:30:00Z"
    },
    {
      "id": "...",
      "act": "ACT3_WORLDBUILDING",
      "focusName": "时间旅行规则",
      "userChoice": "1",
      "createdAt": "2025-10-02T10:45:00Z"
    }
  ],
  "statistics": {
    "total": 5,
    "byAct": {
      "ACT2_CHARACTER": 2,
      "ACT3_WORLDBUILDING": 1,
      "ACT4_PACING": 1,
      "ACT5_THEME": 1
    }
  }
}
```

---

### Synthesis: 生成最终剧本V2

**✅ 前端UI已完成**: 合成页面已实现，支持实时进度追踪、V2脚本展示和版本对比。

**页面路径**: `/synthesis/[projectId]`

**前提**: 完成至少1个Act 2-5的决策

**触发方式**:
- **UI触发**: 在迭代页面点击"生成最终剧本 (N)"按钮（N为已完成决策数）
- **API触发**: 直接调用合成API

#### 步骤1: 触发合成任务

```bash
# POST /api/v1/synthesize
curl -X POST http://localhost:3000/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "你的项目ID",
    "options": {
      "preserveOriginalStyle": true,
      "conflictResolution": "latest_takes_precedence",
      "changeIntegrationMode": "auto_reconcile",
      "includeChangeLog": true,
      "validateCoherence": true
    }
  }'

# 返回:
{
  "success": true,
  "data": {
    "jobId": "synthesis-job-123",
    "message": "Synthesis job queued"
  }
}
```

**数据库变化**:
```sql
-- AnalysisJob表新增SYNTHESIS任务:
INSERT INTO AnalysisJob (type, status) VALUES ('SYNTHESIS', 'QUEUED');

-- Project表: workflowStatus更新为SYNTHESIZING
```

#### 步骤2: 轮询合成状态

```bash
# GET /api/v1/synthesize/:jobId/status
curl http://localhost:3000/api/v1/synthesize/synthesis-job-123/status

# 返回 (进行中):
{
  "status": "PROCESSING",
  "progress": 45,
  "currentStep": "conflict_detection"
}

# 返回 (完成):
{
  "status": "COMPLETED",
  "versionId": "script-v2-abc",
  "confidence": 0.91,
  "message": "Synthesis completed successfully"
}
```

**合成流程内部步骤**:
```typescript
// lib/synthesis/synthesis-engine.ts
1. groupDecisionsByAct()  // 分组决策
2. detectConflicts()      // 冲突检测 (6类)
3. resolveConflicts()     // 自动解决80%冲突
4. analyzeStyle()         // 6维度风格分析
5. buildPrompt()          // 构建合成Prompt
6. chunkScript()          // 长剧本分块 (6000 tokens)
7. synthesizeChunks()     // DeepSeek生成各块
8. mergeChunks()          // 合并去重
9. validateCoherence()    // 一致性验证
10. createVersion()       // 保存V2到数据库
```

#### 步骤3: 获取最终剧本

```bash
# GET /api/v1/versions/:versionId
curl http://localhost:3000/api/v1/versions/script-v2-abc

# 返回:
{
  "id": "script-v2-abc",
  "projectId": "...",
  "version": 2,
  "content": "合成后的完整剧本内容...",
  "changeLog": "# 修改日志\n\n## Act 2 - 角色弧光\n- 张明: 修改为旧友重逢...\n\n## Act 3 - 世界观\n- 时间旅行规则: 明确不可改变过去...",
  "synthesisMetadata": {
    "decisionsApplied": ["clx123abc", "clx456def"],
    "conflictsResolved": 4,
    "styleProfile": {
      "tone": "严肃",
      "vocabulary": ["命运", "选择", "过去"],
      "sentencePatterns": ["短句为主", "对话占60%"]
    }
  },
  "confidence": 0.91,
  "createdAt": "2025-10-02T11:00:00Z"
}
```

**数据库记录**:
```sql
-- ScriptVersion表新增V2版本:
INSERT INTO ScriptVersion (
  projectId, version, content, changeLog, synthesisMetadata, confidence
) VALUES (
  '项目ID', 2, '最终剧本...', '# 修改日志...',
  '{"decisionsApplied": [...], "styleProfile": {...}}', 0.91
);

-- Project表: workflowStatus更新为COMPLETED
```

#### 步骤4: 版本对比

```bash
# GET /api/v1/versions/:v2Id/diff/:v1Id
curl http://localhost:3000/api/v1/versions/script-v2-abc/diff/script-v1-xyz

# 返回:
{
  "additions": [
    {
      "scene": 1,
      "content": "张明看到李华时，手中的咖啡杯微微一颤",
      "source": "ACT2_CHARACTER decision clx123abc"
    }
  ],
  "deletions": [
    {
      "scene": 3,
      "content": "张明：我们认识很多年了",
      "reason": "角色矛盾修复"
    }
  ],
  "modifications": [
    {
      "scene": 5,
      "before": "李华消失在时空裂缝中",
      "after": "李华注视着无法改变的过去，转身离开",
      "source": "ACT3_WORLDBUILDING decision clx456def"
    }
  ],
  "affectedScenes": [1, 3, 5, 7],
  "affectedCharacters": ["张明", "李华"]
}
```

---

### 导出功能

#### 导出为文件

```bash
# POST /api/v1/export
curl -X POST http://localhost:3000/api/v1/export \
  -H "Content-Type: application/json" \
  -d '{
    "versionId": "script-v2-abc",
    "format": "TXT",
    "includeMetadata": true,
    "includeChangeLog": true
  }'

# 返回:
{
  "jobId": "export-job-456",
  "estimatedTime": "5s"
}

# GET /api/v1/export/:jobId
curl http://localhost:3000/api/v1/export/export-job-456

# 返回 (完成):
{
  "status": "COMPLETED",
  "downloadUrl": "/api/v1/export/export-job-456/download",
  "filename": "我的剧本_V2_20251002.txt",
  "fileSize": 45678
}
```

**支持格式**:
- **TXT**: 纯文本，保留场景标记
- **MD**: Markdown格式，含元数据头
- **DOCX**: Word文档（未来支持）

---

## 三、完整UI使用指南（推荐）

### 3.1 从Dashboard到V2的完整流程

#### 🎬 Step 1: 上传剧本（Dashboard）

**页面**: http://localhost:3001/dashboard

1. 准备剧本文件（.txt/.md/.markdown，500-10000行）
2. 上传或粘贴内容
3. 点击"开始AI分析"
4. 自动跳转到分析页面

#### 🔍 Step 2: 查看Act 1诊断（Analysis）

**页面**: http://localhost:3001/analysis/[projectId]

1. 等待分析完成（进度条更新）
2. 查看5类错误诊断
3. 点击"进入迭代工作区"

#### ✏️ Step 3: Acts 2-5迭代修改（Iteration）

**页面**: http://localhost:3001/iteration/[projectId]

**操作流程**（以Act 2为例）:
1. 从诊断结果选择焦点问题
2. 点击"获取AI解决方案提案"
3. 查看2个方案的优缺点
4. 选择一个方案执行
5. 查看戏剧化修改结果
6. 点击"完成本次迭代"

**重复以上流程**处理更多问题，或切换到Act 3/4/5

**查看决策历史**: 点击"决策历史"标签页

#### ✨ Step 4: 生成最终剧本（Synthesis）

**触发**: 迭代页面点击"生成最终剧本 (N)"按钮

**页面**: http://localhost:3001/synthesis/[projectId]

1. **配置合成选项**:
   - 保持原文风格: ✓
   - 冲突解决: auto_reconcile（推荐）
   - 包含修改日志: ✓
   - 一致性验证: ✓

2. **监控10步合成流程**:
   - 分组决策 → 冲突检测 → 冲突解决
   - 风格分析 → 构建提示词 → 分块处理
   - AI生成 → 合并内容 → 验证 → 创建版本

3. **查看V2结果**:
   - 最终剧本标签: 完整V2内容+元数据
   - 修改日志标签: 详细变更记录
   - 版本对比标签: V1 vs V2并排对比

4. **导出**: 点击"导出TXT"或"导出MD"

### 3.2 时间估算

| 剧本规模 | Act 1 | 每个决策 | 合成 | 总计（5决策） |
|---------|-------|---------|------|--------------|
| <1000行 | 10-20s | 5-15s | 10-20s | 2-5分钟 |
| 1000-3000行 | 20-40s | 10-30s | 30-60s | 5-15分钟 |
| 3000-10000行 | 40-90s | 20-60s | 2-5分钟 | 10-30分钟 |

### 3.3 关键UI组件

#### 迭代页面组件
- **ActProgressBar**: Act切换和进度显示
- **FindingsSelector**: 诊断结果选择器
- **ProposalComparison**: AI方案对比（2个方案+优缺点）
- **ChangesDisplay**: 戏剧化修改展示

#### 合成页面组件
- **SynthesisTriggerDialog**: 合成配置对话框
- **SynthesisProgress**: 10步进度追踪（实时更新）
- **版本对比**: V1 vs V2并排展示

### 3.4 常见问题

**Q1: "生成最终剧本"按钮不显示？**
A: 需要至少完成1个Acts 2-5的决策

**Q2: 合成失败？**
A: 检查.env.local中的DEEPSEEK_API_KEY

**Q3: 进度卡住？**
A: 长剧本需2-5分钟，耐心等待或检查网络

**Q4: V2质量不理想？**
A: 增加决策数量（建议每Act至少2个），选择auto_reconcile策略

---

## 四、核心技术实现细节

### 4.1 数据库架构 (Prisma Schema)

```prisma
// 主要模型关系
User (用户)
  ↓ 1:N
Project (项目)
  ├─ workflowStatus: WorkflowStatus 枚举 (状态机)
  ├─ ScriptVersion[] (剧本版本历史)
  ├─ AnalysisJob[] (异步任务队列)
  ├─ DiagnosticReport (Act 1诊断报告, 1:1)
  └─ RevisionDecision[] (Acts 2-5决策记录)

// 关键枚举
enum WorkflowStatus {
  INITIALIZED        // 初始化
  ACT1_RUNNING      // Act 1 执行中
  ACT1_COMPLETE     // Act 1 完成
  ITERATING         // Acts 2-5 迭代中
  SYNTHESIZING      // 合成中
  COMPLETED         // 全部完成
  FAILED            // 失败
}

enum JobType {
  ACT1_ANALYSIS     // Act 1 分析任务
  SYNTHESIS         // 合成任务
  EXPORT            // 导出任务
  ITERATION         // 迭代任务 (未来)
}

enum JobStatus {
  QUEUED            // 队列中
  PROCESSING        // 处理中
  COMPLETED         // 完成
  FAILED            // 失败
  CANCELLED         // 取消
}

enum ActType {
  ACT2_CHARACTER        // Act 2 - 角色弧光
  ACT3_WORLDBUILDING    // Act 3 - 世界观审查
  ACT4_PACING           // Act 4 - 节奏优化
  ACT5_THEME            // Act 5 - 主题润色
}
```

### 4.2 AI Agent系统

#### ConsistencyGuardian (Act 1 诊断)
```typescript
// lib/agents/consistency-guardian.ts
class ConsistencyGuardian {
  async analyze(scriptContent: string): Promise<DiagnosticReport> {
    // 1. 分块处理 (支持长剧本)
    const chunks = this.chunkScript(scriptContent, maxChunkSize: 2000);

    // 2. 并行分析所有块
    const chunkResults = await Promise.all(
      chunks.map(chunk => this.analyzeChunk(chunk))
    );

    // 3. 合并结果
    const findings = this.mergeFindings(chunkResults);

    // 4. 生成报告
    return {
      findings,
      summary: this.generateSummary(findings),
      confidence: this.calculateConfidence(findings)
    };
  }

  private async analyzeChunk(chunk: string): Promise<Finding[]> {
    // 使用中文prompt调用DeepSeek
    const prompt = buildConsistencyPrompt(chunk); // 见 lib/agents/prompts/consistency-prompts.ts
    const response = await deepseekClient.chat({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_CN },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.content).findings;
  }
}
```

#### CharacterArchitect (Act 2 角色弧光)
```typescript
// lib/agents/character-architect.ts
class CharacterArchitect {
  // P4: 聚焦角色矛盾
  async focusCharacter(params: FocusParams): Promise<Context> {
    const prompt = buildP4Prompt(params);
    const response = await this.callDeepSeek(prompt);
    return response.context;
  }

  // P5: 生成2个解决方案提案
  async proposeSolutions(context: Context): Promise<Proposals> {
    const prompt = buildP5Prompt(context);
    const response = await this.callDeepSeek(prompt);
    return {
      proposals: response.solutions, // 必须恰好2个
      recommendation: response.recommendedIndex
    };
  }

  // P6: "Show, Don't Tell" 转换
  async executeShowDontTell(context: Context, chosenProposal: string): Promise<Changes> {
    const prompt = buildP6Prompt(context, chosenProposal);
    const response = await this.callDeepSeek(prompt);
    return {
      overallArc: response.arc,
      dramaticActions: response.actions
    };
  }
}
```

#### RulesAuditor (Act 3 世界观)
```typescript
// lib/agents/rules-auditor.ts
// P7-P9 prompt chain
class RulesAuditor {
  async auditCoreLogic(params): Promise<Audit> { /* P7 */ }
  async verifyDynamicRules(audit, changes): Promise<Verification> { /* P8 */ }
  async alignSettingWithTheme(verification): Promise<Alignment> { /* P9 */ }
}
```

#### PacingStrategist (Act 4 节奏)
```typescript
// lib/agents/pacing-strategist.ts
// P10-P11 prompt chain
class PacingStrategist {
  async analyzeRhythm(script): Promise<Analysis> { /* P10 */ }
  async redistributeConflict(analysis): Promise<Strategy> { /* P11 */ }
}
```

#### ThematicPolisher (Act 5 主题)
```typescript
// lib/agents/thematic-polisher.ts
// P12-P13 prompt chain
class ThematicPolisher {
  async delabelCharacter(character): Promise<Profile> { /* P12 */ }
  async defineCoreFears(profile): Promise<Core> { /* P13 */ }
}
```

### 4.3 异步任务队列系统

```typescript
// lib/api/workflow-queue.ts
class WorkflowQueue {
  private static instance: WorkflowQueue;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  static getInstance(): WorkflowQueue {
    if (!WorkflowQueue.instance) {
      WorkflowQueue.instance = new WorkflowQueue();
      WorkflowQueue.instance.startProcessing();
    }
    return WorkflowQueue.instance;
  }

  private startProcessing() {
    // 每3秒处理一次队列
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 3000);
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 获取下一个排队的任务
      const job = await prisma.analysisJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' }
      });

      if (!job) return;

      // 更新状态为PROCESSING
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date()
        }
      });

      // 根据任务类型分发
      if (job.type === 'ACT1_ANALYSIS') {
        await this.processAct1Analysis(job);
      } else if (job.type === 'SYNTHESIS') {
        await this.processSynthesis(job);
      }

    } finally {
      this.isProcessing = false;
    }
  }

  private async processAct1Analysis(job: AnalysisJob) {
    const project = await prisma.project.findUnique({
      where: { id: job.projectId },
      include: { scriptVersions: true }
    });

    const script = project.scriptVersions[0].content;

    // 调用ConsistencyGuardian
    const guardian = new ConsistencyGuardian(deepseekClient);
    const report = await guardian.analyze(script);

    // 保存诊断报告
    await prisma.diagnosticReport.create({
      data: {
        projectId: project.id,
        findings: report.findings,
        summary: report.summary,
        confidence: report.confidence
      }
    });

    // 更新Project状态
    await prisma.project.update({
      where: { id: project.id },
      data: { workflowStatus: 'ACT1_COMPLETE' }
    });

    // 更新Job状态
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: { reportId: report.id }
      }
    });
  }

  private async processSynthesis(job: AnalysisJob) {
    // 调用SynthesisEngine
    const engine = new SynthesisEngine(deepseekClient);
    const result = await engine.synthesize(job.projectId, job.metadata.options);

    // 保存V2版本
    await prisma.scriptVersion.create({
      data: {
        projectId: job.projectId,
        version: 2,
        content: result.synthesizedScript,
        changeLog: result.changeLog,
        synthesisMetadata: result.metadata,
        confidence: result.confidence
      }
    });

    // 更新状态
    await prisma.project.update({
      where: { id: job.projectId },
      data: { workflowStatus: 'COMPLETED' }
    });

    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: { versionId: result.versionId }
      }
    });
  }
}

// 启动队列处理器 (在API初始化时)
WorkflowQueue.getInstance();
```

### 4.4 Synthesis Engine (Epic 007)

完整实现见 `lib/synthesis/synthesis-engine.ts`，包含：
- 决策分组和冲突检测（6类冲突）
- 风格分析（6维度）
- 智能分块（6000 tokens，500 overlap）
- AI合成与验证
- V2版本创建

---

## 五、API端点完整列表

### 5.1 核心API（V1，生产环境）

#### 项目管理
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects` - 列出项目
- `GET /api/v1/projects/:id` - 获取项目详情
- `GET /api/v1/projects/:id/status` - 获取工作流状态
- `GET /api/v1/projects/:id/report` - 获取诊断报告
- `GET /api/v1/projects/:id/decisions` - 获取决策历史

#### Act 1 分析
- `POST /api/v1/analyze` - 启动Act 1分析（返回jobId）
- `GET /api/v1/analyze/jobs/:jobId` - 轮询任务状态

#### Acts 2-5 迭代
- `POST /api/v1/iteration/propose` - 生成AI提案
- `POST /api/v1/iteration/execute` - 执行选定方案

#### Synthesis合成
- `POST /api/v1/synthesize` - 触发合成
- `GET /api/v1/synthesize/:jobId/status` - 轮询合成状态
- `GET /api/v1/projects/:id/versions` - 获取版本列表
- `GET /api/v1/versions/:id` - 获取版本详情
- `GET /api/v1/versions/:id/diff/:targetId` - 版本对比

#### 导出
- `POST /api/v1/export` - 创建导出任务
- `GET /api/v1/export/:jobId` - 获取导出状态和下载链接

### 5.2 前端页面路由

- `/dashboard` - 上传剧本
- `/analysis/:projectId` - Act 1诊断报告
- `/iteration/:projectId` - Acts 2-5迭代工作区
- `/synthesis/:projectId` - Synthesis合成页面

---

## 六、环境配置与部署

### 6.1 必需环境变量

```bash
# .env.local
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DEEPSEEK_API_KEY=your_actual_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com
DISABLE_RATE_LIMIT=true  # 开发环境
```

### 6.2 快速启动

```bash
# 1. 启动数据库
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 postgres:16-alpine

# 2. 初始化
npx prisma db push
npx prisma db seed

# 3. 启动服务
DISABLE_RATE_LIMIT=true npm run dev
```

### 6.3 重要文件位置

**前端页面**:
- `app/dashboard/page.tsx` - 入口
- `app/analysis/[id]/page.tsx` - Act 1结果
- `app/iteration/[projectId]/page.tsx` - Acts 2-5迭代
- `app/synthesis/[projectId]/page.tsx` - Synthesis合成

**后端API**:
- `app/api/v1/projects/route.ts` - 项目管理
- `app/api/v1/analyze/route.ts` - Act 1分析
- `app/api/v1/iteration/propose/route.ts` - 生成提案
- `app/api/v1/iteration/execute/route.ts` - 执行方案
- `app/api/v1/synthesize/route.ts` - 触发合成

**AI Agent**:
- `lib/agents/consistency-guardian.ts` - Act 1
- `lib/agents/character-architect.ts` - Act 2
- `lib/agents/rules-auditor.ts` - Act 3
- `lib/agents/pacing-strategist.ts` - Act 4
- `lib/agents/thematic-polisher.ts` - Act 5
- `lib/synthesis/synthesis-engine.ts` - Synthesis

**UI组件**:
- `components/workspace/` - 迭代工作区组件
- `components/synthesis/` - 合成UI组件

---

## 七、总结与文档版本

### 系统状态

✅ **V1 API架构** - 生产环境运行中
- 数据库持久化（PostgreSQL + Prisma）
- 异步任务队列（WorkflowQueue）
- 五幕工作流状态机
- 完整UI实现（Dashboard → Act 1 → Acts 2-5 → Synthesis）

### 已实现功能

✅ Act 1 基础诊断（ConsistencyGuardian）
✅ Acts 2-5 迭代修改（UI + API完整）
✅ Synthesis智能合成（Epic 007完整实现）
✅ 版本管理与对比
✅ 导出功能（TXT, MD）

### 相关文档

- Epic 004: Database & V1 API - `docs/epics/epic-004-database-migration/`
- Epic 005: Act 2 Implementation - `docs/epics/epic-005-interactive-workflow-core/`
- Epic 006: Acts 3-5 Implementation - `docs/epics/epic-006-multi-act-agents/`
- Epic 007: Synthesis Engine - `docs/epics/epic-007-synthesis-engine/`
- 迭代页面实现 - `docs/ITERATION_PAGE_IMPLEMENTATION.md`
- 合成页面实现 - `docs/SYNTHESIS_PAGE_IMPLEMENTATION.md`

---

**文档更新日期**: 2025-10-02
**文档版本**: 3.0.0
**架构版本**: V1 API (Database-backed, Epic 004-007)
**实现状态**: ✅ Production Ready
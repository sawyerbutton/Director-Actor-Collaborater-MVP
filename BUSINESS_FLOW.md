# ScriptAI 业务流程与实现逻辑

> 完整的业务流程说明文档 - 帮助快速理解项目全貌

**最后更新**: 2025-11-03
**文档版本**: v1.0

---

## 📋 目录

- [项目定位](#项目定位)
- [核心概念](#核心概念)
- [完整业务流程](#完整业务流程)
- [技术实现架构](#技术实现架构)
- [数据流向详解](#数据流向详解)
- [关键业务规则](#关键业务规则)
- [典型使用场景](#典型使用场景)
- [常见问题解答](#常见问题解答)

---

## 项目定位

### 产品定位 (Plan B - 差异化价值)

ScriptAI 是一个 **AI 创作助手**，而不是简单的错误修复工具。系统提供两阶段差异化价值：

#### 阶段一：ACT1 - 快速逻辑修复（修Bug）
- **时间**: 5-10分钟
- **目标**: 修复客观的逻辑错误
- **输出**: V1版本剧本（逻辑一致性）
- **用户决策**: 直接使用修复后的剧本 OR 继续进入创作深化阶段

#### 阶段二：ACT2-5 - 创作深化（创作升级）
- **时间**: 根据需求灵活
- **目标**: 提升艺术质量，而不是修复错误
- **价值转化**:
  - ACT2: 扁平角色 → 立体角色（成长弧线、内心冲突）
  - ACT3: 合理的世界观 → 引人入胜的世界观（丰富细节、戏剧张力）
  - ACT4: 流畅的节奏 → 扣人心弦的节奏（悬念、情感强度）
  - ACT5: 表面故事 → 精神深度（主题共鸣、情感穿透力）
- **输出**: V2版本剧本（渐进式艺术提升）

### 核心价值主张

> "让你的剧本从**正确**变成**卓越**"

- ACT1 让剧本**正确**（逻辑修复）
- ACT2-5 让剧本**卓越**（创作提升）

---

## 核心概念

### 1. 五幕式工作流 (Five-Act Workflow)

```
ACT1 逻辑诊断 → ACT2 角色深化 → ACT3 世界观丰富 → ACT4 节奏优化 → ACT5 主题提升 → 合成V2剧本
```

**关键理解**:
- ACT1 是**修复导向**（找错误、改错误）
- ACT2-5 是**创作导向**（找机会、提升质量）

### 2. 工作流状态机

```
INITIALIZED (初始化)
    ↓
ACT1_RUNNING (ACT1 分析中)
    ↓
ACT1_COMPLETE (ACT1 完成，诊断报告就绪)
    ↓
ITERATING (ACT2-5 迭代中)
    ↓
SYNTHESIZING (合成 V2 中)
    ↓
COMPLETED (V2 剧本完成)
```

**状态含义**:
- `INITIALIZED`: 项目已创建，未开始分析
- `ACT1_RUNNING`: ConsistencyGuardian 正在分析剧本
- `ACT1_COMPLETE`: 诊断报告已生成，可以进入迭代
- `ITERATING`: 用户正在进行 ACT2-5 的交互式决策
- `SYNTHESIZING`: 系统正在合成最终 V2 剧本
- `COMPLETED`: V2 剧本已生成，可以导出

### 3. 六大 AI 智能体

| 智能体 | 幕次 | 定位 | 输出 |
|--------|------|------|------|
| **ConsistencyGuardian** | ACT1 | 逻辑修复 | 5类错误诊断报告 |
| **CharacterArchitect** | ACT2 | 角色深度创作 | 角色成长弧线的戏剧化动作 |
| **RulesAuditor** | ACT3 | 世界观丰富化 | 设定与主题的深度整合方案 |
| **PacingStrategist** | ACT4 | 节奏优化 | 悬念、高潮、张力的结构化策略 |
| **ThematicPolisher** | ACT5 | 精神深度 | 角色核心恐惧/欲望、共情钩子 |
| **SynthesisEngine** | 合成 | 决策整合 | V2 最终剧本（含冲突解决） |

### 4. 异步作业队列

**为什么需要异步？**
- AI 分析耗时较长（10秒 - 5分钟）
- Serverless 环境（Vercel）不支持长时间阻塞
- 提供更好的用户体验（实时进度反馈）

**作业类型**:
- `ACT1_ANALYSIS`: ACT1 分析（30-120秒）
- `ITERATION`: ACT2-5 提案生成（30-60秒）
- `SYNTHESIS`: V2 合成（30秒 - 5分钟）
- `EXPORT`: 导出文件（< 5秒）

### 5. 版本管理

- **V0**: 原始上传的剧本（存储在 `Project.content`）
- **V1**: ACT1 修复后的剧本（通过 `/apply-act1-repair` 创建）
- **V2-VN**: ACT2-5 每个决策的增量版本（可选）
- **V2 (最终)**: 合成后的最终剧本（通过 `/synthesize` 创建）

---

## 完整业务流程

### 第一步：上传剧本（Dashboard 页面）

**用户操作**:
1. 访问 `/dashboard`
2. 上传剧本文件（.txt / .md / .markdown）或粘贴内容
3. 系统验证（500-10000行，不能是 .fdx/.fountain/.docx）
4. 点击 "开始AI分析" 按钮

**系统处理**:
```
用户点击按钮
  ↓
POST /api/v1/projects (创建项目，workflowStatus = INITIALIZED)
  ↓
POST /api/v1/analyze (创建 ACT1_ANALYSIS 作业)
  ↓
WorkflowStatus 更新为 ACT1_RUNNING
  ↓
重定向到 /analysis/:projectId
```

**数据库变化**:
- 创建 `Project` 记录
- 创建 `AnalysisJob` 记录（type=ACT1_ANALYSIS, status=QUEUED）

---

### 第二步：ACT1 逻辑诊断（Analysis 页面）

**用户体验**:
1. 页面自动开始轮询作业状态（每5秒）
2. 显示进度条和状态文字
3. 分析完成后显示诊断报告
4. 查看 5 类错误：
   - **时间线矛盾**: 时间顺序不一致
   - **角色矛盾**: 角色特征前后不符
   - **剧情漏洞**: 情节逻辑错误
   - **对话矛盾**: 对话内容不一致
   - **场景错误**: 场景连续性问题

**系统处理**:
```
WorkflowQueue 每3秒处理一次队列
  ↓
检测到 ACT1_ANALYSIS 作业（status=QUEUED）
  ↓
调用 ConsistencyGuardian.analyzeScriptText()
  ↓
- 直接分析原始文本（避免解析器artifacts）
  - 检测 5 类逻辑错误
  - 生成置信度分数（30-100%）
  - 映射严重度：critical/high → critical, medium → warning, low → info
  ↓
创建 DiagnosticReport 记录
  ↓
更新 WorkflowStatus 为 ACT1_COMPLETE
  ↓
作业状态更新为 COMPLETED
```

**AI 提示词策略**:
- 使用中文提示词
- 直接分析原始文本（不使用 parser）
- 要求多样化的置信度分数（不能都是 80%）
- 严重度分为 4 个等级（AI 输出），映射到 3 个等级（数据库存储）

**用户决策点**:
- 查看诊断报告后，用户可以选择：
  1. **接受 AI 修复**：点击"应用AI修复"，进入 ACT2-5
  2. **手动修复**：下载报告，自己修改后导出

---

### 第三步：应用 ACT1 修复（可选）

**API 调用**: `POST /api/v1/projects/:id/apply-act1-repair`

**请求数据**:
```json
{
  "repairedScript": "修复后的完整剧本内容",
  "acceptedErrors": ["error-1", "error-2"],  // 用户接受的错误ID
  "metadata": {
    "repairTimestamp": "2025-11-03T00:00:00.000Z",
    "totalErrors": 10,
    "acceptedErrors": 2
  }
}
```

**系统处理**:
```
验证请求数据
  ↓
创建 ScriptVersion (versionNumber = "V1")
  ↓
更新 Project.content = repairedScript
  ↓
更新 WorkflowStatus 为 ITERATING
  ↓
返回 projectId, versionId, workflowStatus
```

**关键点**:
- 这一步创建了 **V1 版本**（ACT1 修复后的剧本）
- **必须** 完成这一步才能进入 ACT2-5（`workflowStatus` 必须是 `ITERATING`）

---

### 第四步：ACT2-5 交互式迭代（Iteration 页面）

这是系统的**核心差异化功能**。

#### 4.1 选择幕次和焦点

**用户操作**:
1. 使用顶部进度条选择幕次（ACT2/3/4/5）
2. 两种方式选择焦点：
   - **方式A**: 从 ACT1 发现中选择（有幕次过滤）
   - **方式B**: 使用 **自由创作模式** 手动输入

**幕次过滤规则** (2025-10-10 新增):
- **ACT2** (角色深度): 只显示 `character` 类型的发现
- **ACT3** (世界观): 只显示 `scene`, `plot` 类型的发现
- **ACT4** (节奏): 只显示 `timeline` 类型的发现
- **ACT5** (主题): 只显示 `character`, `dialogue` 类型的发现

**自由创作模式** (2025-10-11 新增):
- **场景**: 没有匹配的 ACT1 发现时启用
- **目的**: 允许独立使用 ACT2-5，不依赖 ACT1 的发现
- **输入**:
  - `focusName`: 角色名、场景号、主题描述
  - `contradiction`: 想要提升的创作焦点描述

#### 4.2 获取 AI 提案（异步）

**API 调用**: `POST /api/v1/iteration/propose`

**请求数据**:
```json
{
  "projectId": "project-id",
  "act": "ACT2_CHARACTER",
  "focusName": "张三",
  "contradiction": "角色动机不清晰",
  "scriptContext": "相关剧本片段..."
}
```

**系统处理流程** (异步):
```
创建 ITERATION 作业（status=QUEUED）
  ↓
立即返回 jobId（< 1秒响应）
  ↓
【前端开始轮询】
  ↓
WorkflowQueue 后台处理（30-60秒）:
  - 根据 act 类型路由到对应 Agent
  - 使用动态 import（代码分割，优化 Serverless）
  - Agent 执行提示词链
  - 生成 2 个提案（带优缺点）
  - 创建 RevisionDecision 记录
  - 保存 proposals 到数据库
  ↓
作业状态更新为 COMPLETED
  ↓
前端获取提案数据
```

**各幕提示词链**:

**ACT2** (CharacterArchitect) - P4 → P5 → P6 的前两步:
- **P4**: 分析角色**成长潜力**（不是找矛盾！）
- **P5**: 生成 2 个创作路径：
  - 渐进式（gradual）：细腻的、层次化的发展
  - 戏剧性（dramatic）：大胆的、转折性的变化
- 输出: 每个提案包含 approach, pros[], cons[]

**ACT3** (RulesAuditor) - P7 → P8 → P9 的前两步:
- **P7**: 分析世界观**深度潜力**（不是审计不一致！）
- **P8**: 生成丰富化方案（带戏剧涟漪效应）
- 输出: 多个提案，每个包含 enrichment, dramaticRipples[], pros[], cons[]

**ACT4** (PacingStrategist) - P10 → P11:
- **P10**: 分析节奏**提升机会**（不是识别问题！）
- **P11**: 生成节奏策略（悬念、高潮、张力）
- 输出: 多个策略提案

**ACT5** (ThematicPolisher) - P12 → P13 的前一步:
- **P12**: 提升角色**精神深度**（不是去除标签！）
- 输出: 增强的角色画像提案

**关键设计理念**:
- ❌ 避免: "修复错误"、"解决矛盾"、"审计问题"
- ✅ 使用: "深化创作"、"丰富细节"、"增强张力"、"优化体验"

#### 4.3 选择并执行提案（同步）

**用户操作**:
1. 查看 2 个提案的优缺点
2. 选择一个提案（通常选择推荐的）
3. 点击"执行选定提案"按钮

**API 调用**: `POST /api/v1/iteration/execute`

**请求数据**:
```json
{
  "decisionId": "decision-id",
  "proposalChoice": 0  // 或 1
}
```

**系统处理流程** (同步, < 5秒):
```
根据 act 类型路由到对应 Agent
  ↓
执行提示词链的最后一步:
  - ACT2: P6 "Show, Don't Tell" 转化（戏剧化动作）
  - ACT3: P9 设定-主题整合
  - ACT4: 直接应用策略（不再调用 AI）
  - ACT5: P13 定义角色核心（恐惧/欲望/共情钩子）
  ↓
更新 RevisionDecision:
  - userChoice = 0 或 1
  - generatedChanges = AI生成的具体变更
  - executedAt = 当前时间戳
  ↓
（可选）创建增量 ScriptVersion (V2, V3, V4...)
  ↓
返回生成的变更内容
```

**输出格式示例**:

**ACT2 输出**:
```json
{
  "actions": [
    {
      "sceneNumber": 3,
      "actionDescription": "张三在会议上犹豫不决",
      "dialogueSuggestion": "\"我...我不确定这样做是否正确。\"",
      "emotionalTone": "焦虑、自我怀疑"
    }
  ],
  "overallArc": "从犹豫不决到坚定决策的成长弧线",
  "integrationNotes": "建议在第3、5、7场分别展现这一成长过程"
}
```

**ACT5 输出**:
```json
{
  "characterName": "张三",
  "coreFear": "失去控制",
  "coreDesire": "获得认可",
  "empathyHooks": ["童年阴影", "家庭压力", "职业困境"],
  "thematicResonance": "个人成长与社会期待的冲突"
}
```

#### 4.4 重复或切换幕次

**用户操作**:
- 可以对同一幕次处理多个问题
- 可以切换到其他幕次
- 查看"决策历史"标签页，查看所有已执行的决策
- 准备好后，点击顶部的"生成最终剧本 (N)"按钮（N = 决策数量）

---

### 第五步：合成 V2 剧本（Synthesis 页面）

**触发条件**:
- 用户点击"生成最终剧本 (N)"按钮
- 至少有 1 个已执行的决策

#### 5.1 配置合成选项

**用户操作**:
1. 打开配置对话框
2. 选择合成选项：
   - **保留原始风格** ✅ (推荐): 进行 6 维度风格分析
   - **冲突解决策略**:
     - `auto_reconcile` (推荐): 自动协调矛盾
     - `latest_takes_precedence`: 最新决策优先
     - `merge_compatible`: 合并兼容的决策
     - `prioritize_by_severity`: 按严重度优先
   - **包含修改日志** ✅
   - **验证连贯性** ✅

#### 5.2 执行合成流程（异步）

**API 调用**: `POST /api/v1/synthesize`

**系统处理流程** (10 个步骤):

```
【步骤 1】决策分组 (Grouping)
  - 按 act 类型和 focusName 分组所有决策

【步骤 2】冲突检测 (Conflict Detection)
  - 检测 6 种冲突类型：
    1. character_contradiction: ACT2 vs ACT5 的角色变化
    2. timeline_overlap: ACT4 节奏 vs 其他幕的同场景变化
    3. setting_inconsistency: ACT3 世界观 vs 角色/节奏变化
    4. plot_conflict: ACT2 角色弧线 vs ACT4 节奏重构
    5. dialogue_mismatch: 对话不一致
    6. theme_divergence: ACT5 主题 vs 其他幕
  - 标记冲突严重度（low/medium/high/critical）

【步骤 3】冲突解决 (Conflict Resolution)
  - 自动解决率：~98%
  - 根据策略自动协调
  - 高严重度冲突标记为需要人工审查

【步骤 4】风格分析 (Style Analysis)
  - 分析原始剧本的 6 个维度：
    1. 语气（tone）: 严肃/幽默/悲伤/欢快/紧张/温馨
    2. 词汇（vocabulary）: 高频词汇 Top 100
    3. 句式（sentence patterns）: 疑问句/感叹句/短句/长句等
    4. 对话风格（dialogue style）: 正式度、平均长度、常用短语
    5. 叙事视角（narrative voice）: 人称、时态、描述程度
    6. 节奏特征（pacing profile）: 平均场景长度、动作密度、对话比例

【步骤 5】提示词构建 (Prompt Building)
  - 整合所有决策和风格指南
  - 生成详细的合成提示词

【步骤 6】分块处理 (Chunking) - 仅大型剧本
  - 如果剧本 > 6000 tokens (~9000 汉字)
  - 分块大小：6000 tokens
  - 重叠区域：500 tokens（保持上下文）
  - 场景边界优先切分

【步骤 7】AI 生成 (AI Generation)
  - 调用 DeepSeek API
  - 使用 response_format: { type: 'json_object' }
  - 超时: 120 秒

【步骤 8】合并分块 (Merging) - 仅分块时
  - 合并所有分块
  - 去重重叠区域

【步骤 9】验证 (Validation)
  - 检查连贯性
  - 检查风格一致性
  - 检查完整性

【步骤 10】版本创建 (Version Creation)
  - 创建 ScriptVersion (versionNumber = "V2")
  - 保存 synthesisMetadata:
    - decisionsApplied: 应用的决策数量
    - conflictsDetected: 检测到的冲突数量
    - conflictsResolved: 解决的冲突数量
    - styleProfile: 6 维度风格分析结果
  - 计算 confidenceScore (0-1):
    - 基础分: 1.0
    - 未解决冲突: -0.1 每个
    - 低风格相似度: -0.05 到 -0.2
    - 验证失败: -0.1 每个
    - 典型范围: 0.85 - 0.95
  - 生成详细的修改日志
  ↓
作业状态更新为 COMPLETED
```

**处理时间**:
- 小型剧本 (<1000行): 10-20秒
- 中型剧本 (1000-3000行): 30-60秒
- 大型剧本 (3000-10000行): 2-5分钟

#### 5.3 查看 V2 结果

**用户界面** (3个标签页):

1. **最终剧本 (V2)** 标签:
   - 显示完整的合成剧本
   - 显示元数据（决策数量、置信度分数）

2. **修改日志** 标签:
   - 详细的变更记录
   - 按决策分组的修改说明
   - 冲突解决记录

3. **版本对比** 标签:
   - V1 vs V2 并排对比
   - 高亮显示：
     - 新增内容（绿色）
     - 删除内容（红色）
     - 修改内容（黄色）
   - 统计信息：
     - 总变更数
     - 受影响的场景
     - 受影响的角色

#### 5.4 导出剧本

**支持格式**:
- **TXT**: 纯文本
- **MD**: Markdown 格式
- **DOCX**: Word 文档（未来）

**导出选项**:
- 包含元数据
- 包含修改日志

---

## 技术实现架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                            │
│  Dashboard → Analysis → Iteration → Synthesis → Export │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP/JSON
                  ↓
┌─────────────────────────────────────────────────────────┐
│               Next.js App Router (V1 API)               │
│  /api/v1/projects  /analyze  /iteration  /synthesize   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│          WorkflowQueue (异步作业队列 - 单例)             │
│  - 每 3 秒处理一次队列                                    │
│  - 支持 Serverless: 前端轮询时手动触发                    │
│  - 处理 4 种作业: ACT1_ANALYSIS, ITERATION,             │
│    SYNTHESIS, EXPORT                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│                   AI Agents 层                           │
│  ConsistencyGuardian | CharacterArchitect               │
│  RulesAuditor | PacingStrategist | ThematicPolisher     │
│  SynthesisEngine                                        │
└─────────────────┬───────────────────────────────────────┘
                  │ API 调用
                  ↓
┌─────────────────────────────────────────────────────────┐
│               DeepSeek API Integration                   │
│  - Prompt chains (P4-P13)                               │
│  - response_format: json_object                         │
│  - 中文语言优化                                           │
│  - 超时: 120 秒                                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL (Prisma ORM)                         │
│  Projects | ScriptVersions | AnalysisJobs               │
│  DiagnosticReports | RevisionDecisions                  │
└─────────────────────────────────────────────────────────┘
```

### 关键技术组件

#### 1. 前端架构

**技术栈**:
- Next.js 14 (App Router)
- TypeScript 5.x
- Tailwind CSS
- shadcn/ui 组件库

**页面结构**:
```
app/
├── dashboard/page.tsx           # 上传入口
├── analysis/[id]/page.tsx       # ACT1 结果
├── iteration/[projectId]/page.tsx  # ACT2-5 迭代
└── synthesis/[projectId]/page.tsx  # 合成和导出
```

**关键组件**:
```
components/
├── workspace/
│   ├── act-progress-bar.tsx     # 五幕进度条
│   ├── findings-selector.tsx    # ACT1 发现选择器
│   ├── proposal-comparison.tsx  # 提案对比
│   └── changes-display.tsx      # 变更展示
└── synthesis/
    ├── synthesis-trigger-dialog.tsx  # 合成配置
    └── synthesis-progress.tsx   # 10步进度跟踪
```

**API 客户端**: `lib/services/v1-api-service.ts`
- 封装所有 V1 API 调用
- 实现轮询逻辑
- Serverless 手动触发支持

#### 2. 后端架构

**API 路由**:
```
app/api/v1/
├── projects/
│   ├── route.ts                 # 创建、列表
│   ├── [id]/route.ts            # 获取项目详情
│   ├── [id]/status/route.ts     # 获取工作流状态
│   ├── [id]/report/route.ts     # 获取诊断报告
│   ├── [id]/apply-act1-repair/route.ts  # 应用ACT1修复
│   └── [id]/decisions/route.ts  # 获取决策列表
├── analyze/
│   ├── route.ts                 # 开始ACT1分析
│   ├── process/route.ts         # 手动触发处理（Serverless）
│   └── jobs/[jobId]/route.ts    # 轮询作业状态
├── iteration/
│   ├── propose/route.ts         # 生成提案（异步）
│   ├── execute/route.ts         # 执行提案（同步）
│   └── jobs/[jobId]/route.ts    # 轮询迭代作业
└── synthesize/
    ├── route.ts                 # 触发合成
    └── [jobId]/status/route.ts  # 轮询合成状态
```

**中间件**:
- CORS
- 安全头
- 速率限制（生产: 10 req/min, 开发: 100 req/min）
- Zod 验证

#### 3. 数据库架构

**核心模型**:

```prisma
model Project {
  id             String         @id @default(cuid())
  title          String
  content        String         @db.Text
  workflowStatus WorkflowStatus @default(INITIALIZED)
  userId         String

  versions          ScriptVersion[]
  analysisJobs      AnalysisJob[]
  diagnosticReports DiagnosticReport[]
  revisionDecisions RevisionDecision[]
}

model ScriptVersion {
  id                String   @id @default(cuid())
  projectId         String
  versionNumber     String   # "V1", "V2", "V3"...
  content           String   @db.Text
  changeLog         String?  @db.Text
  synthesisMetadata Json?    # 合成元数据（仅V2）
  confidenceScore   Float?   # 0-1 信心分数

  @@unique([projectId, versionNumber])
}

model AnalysisJob {
  id        String    @id @default(cuid())
  projectId String
  type      JobType   # ACT1_ANALYSIS, ITERATION, SYNTHESIS, EXPORT
  status    JobStatus @default(QUEUED)
  progress  Float     @default(0)
  result    Json?     # 完成时的结果
  error     String?   @db.Text
}

model DiagnosticReport {
  id         String   @id @default(cuid())
  projectId  String   @unique
  findings   Json     # LogicError[]
  statistics Json     # 统计信息
}

model RevisionDecision {
  id               String   @id @default(cuid())
  projectId        String
  act              ActType  # ACT2_CHARACTER, ACT3_WORLDBUILDING, 等
  focusName        String
  contradiction    String   @db.Text
  scriptContext    String   @db.Text
  proposals        Json     # AI生成的提案
  userChoice       Int?     # 用户选择（0或1）
  generatedChanges Json?    # 执行后的变更
  executedAt       DateTime?
}
```

**枚举类型**:
```prisma
enum WorkflowStatus {
  INITIALIZED
  ACT1_RUNNING
  ACT1_COMPLETE
  ITERATING
  SYNTHESIZING
  COMPLETED
}

enum JobType {
  ACT1_ANALYSIS
  ITERATION
  SYNTHESIS
  EXPORT
}

enum JobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}

enum ActType {
  ACT2_CHARACTER
  ACT3_WORLDBUILDING
  ACT4_PACING
  ACT5_THEME
}
```

#### 4. AI Agents 实现

**通用模式**:
```typescript
class SomeAgent {
  constructor(private deepseek: DeepSeekClient) {}

  async propose(params) {
    // 执行 P4-P5 或 P7-P8 或 P10-P11 或 P12
    // 返回提案数组
  }

  async execute(params) {
    // 执行 P6 或 P9 或直接应用 或 P13
    // 返回具体变更
  }
}
```

**DeepSeek 调用模式**:
```typescript
const request: DeepSeekChatRequest = {
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 2000,
  response_format: { type: 'json_object' }  // 强制 JSON 输出
};

const response = await this.deepseek.chat(request);
const data = JSON.parse(response.choices[0].message.content);
```

---

## 数据流向详解

### ACT1 数据流

```
1. 用户上传 → Project.content (原始剧本)
                    ↓
2. 创建 AnalysisJob (type=ACT1_ANALYSIS, status=QUEUED)
                    ↓
3. WorkflowQueue 处理:
   - ConsistencyGuardian.analyzeScriptText(Project.content)
   - 返回 DiagnosticReport { findings, statistics }
                    ↓
4. 保存到数据库:
   - DiagnosticReport 表（projectId, findings, statistics）
   - Project.workflowStatus → ACT1_COMPLETE
   - AnalysisJob.status → COMPLETED
                    ↓
5. 前端显示报告
```

### ACT2-5 迭代数据流

```
1. 用户选择焦点 → POST /api/v1/iteration/propose
   输入: { projectId, act, focusName, contradiction, scriptContext }
                    ↓
2. 创建 AnalysisJob (type=ITERATION, status=QUEUED)
   创建 RevisionDecision (proposals=null, userChoice=null)
   返回 jobId
                    ↓
3. 前端轮询 GET /api/v1/iteration/jobs/:jobId
                    ↓
4. WorkflowQueue 后台处理:
   - 路由到对应 Agent (CharacterArchitect/RulesAuditor/PacingStrategist/ThematicPolisher)
   - 执行 propose() 方法
   - 生成提案数组
                    ↓
5. 更新数据库:
   - RevisionDecision.proposals = 提案数据
   - AnalysisJob.status → COMPLETED
   - AnalysisJob.result = { decisionId, proposals, ... }
                    ↓
6. 前端获取并显示提案
                    ↓
7. 用户选择提案 → POST /api/v1/iteration/execute
   输入: { decisionId, proposalChoice }
                    ↓
8. 同步处理:
   - Agent.execute(decisionId, proposalChoice)
   - 生成具体变更
                    ↓
9. 更新数据库:
   - RevisionDecision.userChoice = 0 或 1
   - RevisionDecision.generatedChanges = 变更数据
   - RevisionDecision.executedAt = 当前时间
   - （可选）创建 ScriptVersion (V2, V3, ...)
                    ↓
10. 前端显示变更
```

### 合成数据流

```
1. 用户触发合成 → POST /api/v1/synthesize
   输入: { projectId, options }
                    ↓
2. 创建 AnalysisJob (type=SYNTHESIS, status=QUEUED)
   返回 jobId
                    ↓
3. 前端轮询 GET /api/v1/synthesize/:jobId/status
                    ↓
4. WorkflowQueue 后台处理（10步）:
   - 查询所有 RevisionDecisions (WHERE projectId AND executedAt IS NOT NULL)
   - SynthesisEngine.synthesize()
     ├─ 步骤1: 分组决策
     ├─ 步骤2: 检测冲突
     ├─ 步骤3: 解决冲突
     ├─ 步骤4: 分析风格
     ├─ 步骤5: 构建提示词
     ├─ 步骤6: 分块（如果需要）
     ├─ 步骤7: 调用 DeepSeek API
     ├─ 步骤8: 合并分块
     ├─ 步骤9: 验证
     └─ 步骤10: 创建版本
                    ↓
5. 创建 ScriptVersion:
   - versionNumber = "V2"
   - content = 合成后的完整剧本
   - synthesisMetadata = {
       decisionsApplied, conflictsDetected, conflictsResolved,
       styleProfile: { tone, vocabulary, patterns, ... }
     }
   - confidenceScore = 0.85 - 0.95
   - changeLog = 详细修改日志
                    ↓
6. 更新数据库:
   - Project.workflowStatus → COMPLETED
   - AnalysisJob.status → COMPLETED
   - AnalysisJob.result = { versionId, confidence }
                    ↓
7. 前端显示 V2 结果（3个标签页）
```

---

## 关键业务规则

### 1. 工作流状态转换规则

| 当前状态 | 触发条件 | 下一状态 |
|---------|---------|---------|
| INITIALIZED | 调用 `/analyze` | ACT1_RUNNING |
| ACT1_RUNNING | 分析完成 | ACT1_COMPLETE |
| ACT1_COMPLETE | 调用 `/apply-act1-repair` | ITERATING |
| ITERATING | 调用 `/synthesize` | SYNTHESIZING |
| SYNTHESIZING | 合成完成 | COMPLETED |

**关键约束**:
- 必须先完成 ACT1 才能进入 ITERATING
- 必须应用 ACT1 修复（创建 V1）才能进入迭代
- 可以在 ITERATING 状态下反复执行 ACT2-5 决策
- 只能在有至少 1 个决策时触发合成

### 2. 幕次过滤规则

| 幕次 | 显示的 ACT1 发现类型 |
|-----|---------------------|
| ACT2 (角色深度) | `character` |
| ACT3 (世界观) | `scene`, `plot` |
| ACT4 (节奏) | `timeline` |
| ACT5 (主题) | `character`, `dialogue` |

**实现位置**: `components/workspace/findings-selector.tsx`

### 3. 自由创作模式启用条件

- 当前幕次没有匹配的 ACT1 发现时
- 或用户主动选择手动输入

**用途**:
- 独立使用 ACT2-5，不依赖 ACT1
- 探索性创作提升

### 4. 异步作业超时规则

| 作业类型 | 超时时间 | 重试策略 |
|---------|---------|---------|
| ACT1_ANALYSIS | 120秒 | 无自动重试 |
| ITERATION | 120秒 | 无自动重试 |
| SYNTHESIS | 无限制 | 无自动重试 |
| EXPORT | 60秒 | 无自动重试 |

**DeepSeek API 超时**: 120秒（配置在 `lib/api/deepseek/client.ts`）

### 5. 版本命名规则

- **V0**: 原始剧本（逻辑上存在，但不创建 ScriptVersion 记录）
- **V1**: ACT1 修复后的剧本（必须创建）
- **V2-VN**: ACT2-5 的增量版本（可选，每个决策可以创建一个）
- **V2 (最终)**: 合成后的最终版本（覆盖之前的 V2，或使用下一个版本号）

### 6. 冲突解决优先级

| 冲突类型 | 默认策略 | 严重度 |
|---------|---------|--------|
| character_contradiction | auto_reconcile | high |
| timeline_overlap | latest_takes_precedence | medium |
| setting_inconsistency | merge_compatible | medium |
| plot_conflict | prioritize_by_severity | high |
| dialogue_mismatch | auto_reconcile | low |
| theme_divergence | manual_review_required | critical |

**自动解决率**: ~98%（除了极少数 critical 级别冲突）

---

## 典型使用场景

### 场景 1: 纯逻辑修复用户

**用户画像**: 剧本已经较为成熟，只需要快速修复逻辑错误

**流程**:
1. 上传剧本 → ACT1 分析（5分钟）
2. 查看诊断报告 → 应用 AI 修复
3. 导出 V1 剧本 → **结束**

**时间**: 10-15分钟
**价值**: 逻辑一致性

---

### 场景 2: 全流程深度创作用户

**用户画像**: 希望从逻辑修复到艺术提升的完整流程

**流程**:
1. 上传剧本 → ACT1 分析（5分钟）
2. 应用 ACT1 修复 → 进入迭代
3. **ACT2** - 处理 3 个角色矛盾（每个 3 分钟 × 3 = 9 分钟）
4. **ACT3** - 丰富 2 个场景设定（每个 3 分钟 × 2 = 6 分钟）
5. **ACT4** - 优化整体节奏（1 个决策，3 分钟）
6. **ACT5** - 深化主角精神深度（1 个决策，3 分钟）
7. 合成 V2 剧本（5 分钟）
8. 查看对比 → 导出 V2

**时间**: 30-40分钟
**决策数**: 7 个
**价值**: 逻辑一致性 + 艺术质量提升

---

### 场景 3: 自由创作探索用户

**用户画像**: ACT1 没有发现相关问题，但想探索创作提升

**流程**:
1. 上传剧本 → ACT1 分析
2. ACT1 没有发现角色问题
3. 进入 ACT2 → **使用自由创作模式**
4. 手动输入：
   - focusName: "李四"
   - contradiction: "希望探索这个配角的内心世界"
5. 获取 AI 提案 → 选择并执行
6. 继续在其他幕次探索
7. 合成 V2

**时间**: 20-30分钟
**价值**: 独立的创作深化（不依赖 ACT1）

---

### 场景 4: 渐进式迭代用户

**用户画像**: 分多次使用，每次处理一部分

**第一次**:
1. 上传 → ACT1 → 应用修复
2. 处理 ACT2 的 2 个问题
3. **保存进度**（决策已记录在数据库）

**第二次**（几天后）:
1. 回到项目
2. 继续 ACT3 和 ACT4
3. **保存进度**

**第三次**:
1. 完成 ACT5
2. 合成 V2 → 导出

**优势**: 灵活，不需要一次性完成

---

## 常见问题解答

### Q1: ACT1 一定要完成吗？

**A**: 是的，必须完成 ACT1 并应用修复（创建 V1）才能进入 ACT2-5。
- **原因**: 系统需要 `workflowStatus = ITERATING` 才能访问迭代页面
- **例外**: 如果确实不需要 ACT1 修复，可以直接"应用修复"但不改动剧本内容

---

### Q2: ACT2-5 必须都做吗？

**A**: 不是，可以只做部分。
- **灵活性**: 可以只做 ACT2 和 ACT5，跳过 ACT3 和 ACT4
- **最少要求**: 至少 1 个已执行的决策才能触发合成
- **推荐**: 根据剧本需求选择性使用

---

### Q3: 为什么 ACT2-5 叫"创作导向"而不是"修复导向"？

**A**: 这是 Plan B 产品定位的核心差异化策略。

**对比**:
| 维度 | ACT1 (修复导向) | ACT2-5 (创作导向) |
|-----|----------------|------------------|
| 目标 | 修复错误 | 提升质量 |
| 输入 | 逻辑错误 | 创作机会 |
| 过程 | 找问题 → 改正 | 找潜力 → 深化 |
| 输出 | 正确的剧本 | 卓越的剧本 |

**用户价值**: 让用户理解 ACT2-5 不是"找毛病"，而是"锦上添花"

---

### Q4: 自由创作模式什么时候用？

**A**: 两种情况：
1. **ACT1 没有相关发现**: 例如 ACT1 没检测到角色问题，但想深化角色
2. **独立创作探索**: 想主动探索某个方向的提升，不依赖 ACT1 的发现

**优势**: 不受限于 ACT1 的诊断结果

---

### Q5: 合成时的"冲突"是什么意思？

**A**: 当不同幕次的决策产生矛盾时，就会产生冲突。

**示例**:
- ACT2 决定让角色在第 5 场变得勇敢
- ACT4 决定把第 5 场移到第 10 场（节奏优化）
- **冲突**: 角色转变的场次发生了变化

**解决**: SynthesisEngine 自动协调（98% 自动解决率）

---

### Q6: V2 的"置信度分数"意味着什么？

**A**: 0-1 的分数，表示合成质量的信心程度。

**影响因素**:
- **减分项**: 未解决的冲突、风格不匹配、验证失败
- **加分项**: 高质量决策、风格高度一致、无冲突

**典型范围**: 0.85 - 0.95

**建议**:
- < 0.8: 需要人工审查
- 0.8 - 0.9: 良好
- > 0.9: 优秀

---

### Q7: 为什么要用异步作业队列？

**A**: 三个原因：
1. **AI 处理耗时**: 10秒 - 5分钟，不能阻塞用户界面
2. **Serverless 限制**: Vercel 等平台有超时限制（10-60秒）
3. **用户体验**: 实时进度反馈比长时间等待更好

---

### Q8: 系统支持多大的剧本？

**A**:
- **最小**: 500 行
- **最大**: 10000 行
- **推荐**: 1000-3000 行（最佳性能）

**大型剧本优化**:
- 自动分块处理（>6000 tokens）
- 每块 6000 tokens，重叠 500 tokens
- 场景边界优先切分

---

### Q9: 如何查看历史决策？

**A**: 在迭代页面的"决策历史"标签页。

**可以看到**:
- 所有已执行的决策
- 按幕次分组
- 每个决策的提案和选择
- 生成的具体变更

---

### Q10: 能撤销决策吗？

**A**: 目前不支持撤销单个决策。

**替代方案**:
- 重新开始一个新项目
- 或在合成时，系统会自动协调冲突的决策

**未来计划**: 考虑添加决策回滚功能

---

## 附录：术语表

| 术语 | 英文 | 解释 |
|-----|-----|------|
| 五幕式工作流 | Five-Act Workflow | ACT1-5 的完整流程 |
| 工作流状态 | WorkflowStatus | 项目当前所处的阶段 |
| 智能体 | AI Agent | 执行特定任务的 AI 模块 |
| 异步作业 | Async Job | 后台处理的长时间任务 |
| 提案 | Proposal | AI 生成的解决方案选项 |
| 决策 | Decision / RevisionDecision | 用户选择的提案及其执行结果 |
| 合成 | Synthesis | 将所有决策整合成最终剧本的过程 |
| 冲突 | Conflict | 不同决策之间的矛盾 |
| 置信度分数 | Confidence Score | V2 剧本质量的评估分数（0-1） |
| 版本 | Version / ScriptVersion | 剧本的不同版本（V0, V1, V2...） |
| 自由创作模式 | Free Creation Mode | 不依赖 ACT1 发现的手动输入模式 |

---

## 快速参考

### 关键文件位置

```
项目根目录/
├── CLAUDE.md                    # 开发者指南（最全面）
├── README.md                    # 项目概述
├── BUSINESS_FLOW.md             # 本文档（业务流程）
├── ref/                         # 参考文档目录
│   ├── WORKFLOW_REFERENCE.md    # 工作流详细说明
│   ├── AI_AGENTS.md             # AI 智能体文档
│   ├── API_REFERENCE.md         # API 文档
│   ├── DATABASE_SCHEMA.md       # 数据库结构
│   ├── FRONTEND_COMPONENTS.md   # 前端组件
│   ├── TESTING_GUIDE.md         # 测试指南
│   └── DEPLOYMENT_GUIDE.md      # 部署指南
└── docs/                        # 其他文档
    ├── epics/                   # Epic 实现文档
    ├── fixes/                   # 问题修复记录
    └── ...
```

### 联系方式

如有疑问，请查阅：
1. 本文档（业务流程理解）
2. `CLAUDE.md`（开发指南）
3. `ref/` 目录下的参考文档（技术细节）

---

**文档维护**: 本文档应在业务流程变更时及时更新。

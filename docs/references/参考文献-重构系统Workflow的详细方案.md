当前系统将分析和修复视为一次性的“批处理”任务，而您的实际流程是一个包含五个幕、13个步骤的深度对话，需要在每个阶段进行用户决策和焦点选择。

为了使系统贴近您的真实使用流程，我们需要从根本上重构工作流，将系统从一个“自动修复工具”升级为一个“交互式剧本共创工作台”。

以下是重构系统Workflow的详细方案。

### 核心设计理念的转变

我们需要实现四个关键转变：

1.  **从线性到迭代**：系统必须支持多轮对话和分析，而不是一次性完成。
2.  **从被动到交互**：系统必须在关键节点（如选择角色、选择方案）暂停，等待用户决策。
3.  **从整体到模块化**：将分析拆分为五个独立的模块（对应五幕），并使用专门的Agent处理。
4.  **从无状态到持久化**：必须全程使用数据库来跟踪项目状态、分析历史和用户决策。

### 新系统 Workflow 设计方案

我们将引入一个状态机来管理整个流程，引导用户完成这五个阶段。

#### 0\. 基础设施准备：激活现有资源

首先，必须激活当前系统中未使用的高级功能：

  * **数据库 (Prisma/PostgreSQL)**：停止使用 `localStorage`。所有项目数据、剧本版本、分析报告和用户决策都必须持久化。
  * **V1 API**：前端必须切换到 `/api/v1/` 接口。
  * **Agent系统**：激活 `ConsistencyGuardian`、`RevisionExecutive` 和 `CollaborationCoordinator`，并为其他幕创建新的专业Agent。

#### 1\. Agent 专业化分工

我们将“五幕”映射到具体的Agent，以实现模块化：

  * **Act I (地基诊断)**：`ConsistencyGuardian` (现有)。负责执行 P1-P3。
  * **Act II (人物弧光)**：`CharacterArchitect` (新建)。负责执行 P4-P6。
  * **Act III (世界观审计)**：`RulesAuditor` (新建)。负责执行 P7-P9。
  * **Act IV (结构与节奏)**：`PacingStrategist` (新建)。负责执行 P10-P11。
  * **Act V (主题与共情)**：`ThematicPolisher` (新建)。负责执行 P12-P13。
  * **协调器**：`CollaborationCoordinator` (现有)。作为中央大脑，管理状态机，调用正确的Agent，并维护上下文。

#### 2\. 工作流详细设计

```mermaid
graph TD
    A[用户上传剧本] --> B(创建项目, 存储V1, 状态: Initialized);

    B --> C(Act 1: 地基诊断);
    C -- ConsistencyGuardian (P1-P3) --> D(生成诊断报告, 状态: Diagnosed);

    D --> E(用户审阅报告);

    subgraph 迭代工作区 (Acts 2-4)
        E --> F{选择焦点 (角色/设定/节奏)};
        F --> G(调用对应Agent模块 e.g., Act 2);

        subgraph 模块内交互循环
            G --> H(Agent分析并提出方案 e.g., P5);
            H --> I(用户选择方案);
            I --> J(Agent执行深化 e.g., P6);
            J --> K(存储用户决策/变更项);
        end
        K --> F;
    end

    K --完成迭代--> L(Act 5: 主题与共情打磨);
    L -- ThematicPolisher (P12-P13) --> M(生成人物小传等);

    M --> N(最终合成);
    N -- RevisionExecutive 汇总所有变更项 --> O(生成最终剧本 V2);
    O --> P(导出);
```

#### 3\. 交互模式实现（以 Act II 为例）

实现迭代的关键在于API和前端的协同，以捕获Prompt所需的输入（如`[角色名]`、`[方案名]`）。

**步骤 1: 用户选择焦点 (前端)**
前端展示Act I的报告，用户选择一个角色进行聚焦。

```javascript
// 前端示例：捕获用户输入
fetch('/api/v1/analyze/act2/start', {
    method: 'POST',
    body: JSON.stringify({
        projectId: '...',
        characterName: '张三',
        contradiction: '保护者的动机与纵容谋杀的行为不符' // Prompt 4的输入
    })
});
```

**步骤 2: AI分析与提案 (后端)**
后端调用 `CharacterArchitect` 执行 P4 和 P5。

```javascript
// 后端: /api/v1/analyze/act2/start
// ... 构造 Prompt 4 和 5 ...
const response = await CharacterArchitect.analyze(prompts);
// 解析LLM响应，提取出2个解决方案
const solutions = parseSolutions(response);
return Response.json({ solutions }); // 返回选项给用户
```

**步骤 3: 用户决策 (前端)**
前端展示方案对比，用户选择一个。

```javascript
// 前端示例：用户选择方案
fetch('/api/v1/analyze/act2/execute', {
    method: 'POST',
    body: JSON.stringify({
        projectId: '...',
        selectedSolution: '方案一' // Prompt 6的输入
    })
});
```

**步骤 4: AI深化与具象化 (后端)**
后端调用 `CharacterArchitect` 执行 P6。

```javascript
// 后端: /api/v1/analyze/act2/execute
// ... 构造 Prompt 6 (Show, Don't Tell) ...
const actions = await CharacterArchitect.execute(prompt6);
// 存储生成的戏剧动作或修改建议
saveUserDecisions(actions);
return Response.json({ actions });
```

这个模式将重复应用于 Act III 和 Act IV。

### 实施路线图建议

这项重构工程量较大，建议分阶段实施：

**阶段一：架构迁移与基础搭建 (约1-2周)**

1.  **启用数据库和V1 API**：配置Prisma，将项目管理和剧本存储迁移到数据库。前端停止使用 `localStorage` 和旧的 `/api/analysis`。
2.  **实现Act 1**：将当前MVP的分析逻辑迁移到 `ConsistencyGuardian` Agent，确保其在V1 API中被调用并返回诊断报告。
3.  **构建状态机**：在 `CollaborationCoordinator` 中实现基础的状态管理（Initialized -\> Diagnosed -\> Iterating -\> Completed）。

**阶段二：实现核心迭代循环 (约2-3周)**

1.  **前端重构**：将前端从报告视图改造为交互式工作台。设计用于展示“方案选择”和“优劣对比”的新UI。
2.  **实现Act 2 (人物弧光)**：开发 `CharacterArchitect` Agent (P4-P6)。
3.  **实现交互式API**：开发支持多步骤交互的API端点（如上文的 `/act2/start`, `/act2/execute`）。

**阶段三：专业化与完善 (约2-3周)**

1.  **实现Acts 3, 4, 5**：逐一开发剩余的Agents (`RulesAuditor`, `PacingStrategist`, `ThematicPolisher`)及其对应的API和UI。
2.  **开发剧本合成器**：强化 `RevisionExecutive` Agent，使其能够汇总所有阶段的用户决策和修改建议，智能地合成最终剧本。
3.  **版本管理**：实现剧本版本对比（Diff Viewer）功能。

---

### 阶段一：架构迁移与基础搭建 (预计 1-2 周)

**目标**：放弃MVP架构（`localStorage`、同步API），激活并迁移到目标架构（数据库、V1异步API、Agent系统），并完成“第一幕：地基诊断”的集成。

#### 1.1 数据库与后端基础设施激活

*   **任务 1.1.1：数据库配置与模型定义 (Backend)**
    *   确保 `DATABASE_URL` 配置正确。
    *   审查并完善 `schema.prisma`。核心模型应包括：
        *   `Project`（项目信息，包含核心状态机 `workflowStatus`）。
        *   `ScriptVersion`（剧本版本管理 V1, V2...）。
        *   `AnalysisJob`（用于跟踪异步任务）。
        *   `DiagnosticReport`（存储第一幕的结构化结果）。
    *   运行 Prisma migrations 同步数据库结构。
*   **任务 1.1.2：定义状态机 (Backend)**
    *   在 `Project` 模型中定义工作流状态枚举，例如：`INITIALIZED`, `ACT1_RUNNING`, `ACT1_COMPLETE`（等待审阅）, `ITERATING`（迭代中）, `SYNTHESIZING`, `COMPLETED`。
*   **任务 1.1.3：V1 API 基础实现与异步化 (Backend)**
    *   实现 `POST /api/v1/projects`：接收剧本，创建项目，存储V1版本，返回 `projectId`。
    *   实现 `POST /api/v1/analyze`：接收 `projectId`，创建 `AnalysisJob`，将其加入后台队列（Worker），更新状态为 `ACT1_RUNNING`。立即返回 `202 Accepted` 和 `jobId`。
    *   实现 `GET /api/v1/analyze/[jobId]/status`：用于前端轮询。

#### 1.2 第一幕（地基诊断）Agent集成

*   **任务 1.2.1：重构 ConsistencyGuardian (Agent/Backend)**
    *   将 `app/api/analysis/route.ts` 中的现有DeepSeek调用逻辑迁移到 `lib/agents/consistency-guardian.ts`。
    *   实现第一幕的Prompt链（P1-P3）。确保Agent输出符合 `DiagnosticReport` 数据结构的精准报告。
*   **任务 1.2.2：集成Agent到Worker (Backend)**
    *   配置后台Worker处理分析任务时调用 `ConsistencyGuardian`。
    *   Agent完成后，将结果保存到数据库，并将 `workflowStatus` 更新为 `ACT1_COMPLETE`。

#### 1.3 前端迁移与轮询实现

*   **任务 1.3.1：API调用切换 (Frontend)**
    *   修改 `app/dashboard/page.tsx` (`handleAnalyze`)。
    *   流程改为：先调用 `POST /api/v1/projects`，再用返回的 `projectId` 调用 `POST /api/v1/analyze`。
*   **任务 1.3.2：实现状态轮询与移除LocalStorage (Frontend)**
    *   实现轮询机制（例如使用 `swr` 或 `react-query`），定期调用状态API。
    *   **彻底移除**所有使用 `localStorage` 存储分析结果的代码。
*   **任务 1.3.3：结果获取与显示 (Frontend)**
    *   当状态变为 `ACT1_COMPLETE` 时，从API获取 `DiagnosticReport` 数据并展示。

**阶段一交付物**：系统通过异步V1 API和Agent系统执行第一幕分析，结果存储在数据库中，前端通过轮询获取并展示结果。底层架构已就绪。

---

### 阶段二：核心迭代循环实现 (预计 2-3 周)

**目标**：建立支持多轮对话的交互模式，将前端从“报告查看器”转变为“交互式工作台”。以“第二幕：人物弧光压力测试”为试点，验证新工作流。

#### 2.1 交互式工作台 UI/UX 设计

*   **任务 2.1.1：重构结果页为工作台 (Frontend)**
    *   改造 `app/analysis/[id]/page.tsx`。设计包含导航（五幕进度）和中央工作区的布局。
*   **任务 2.1.2：实现焦点选择UI (Frontend)**
    *   在Act 1报告中，使用户能够选择一个具体的角色或问题进行聚焦（P4的输入）。
    *   设计表单让用户输入或确认P4所需的“核心矛盾总结”。
*   **任务 2.1.3：实现方案对比与选择UI (Frontend)**
    *   设计用于展示AI提出的多个方案（P5）的UI组件（例如，并排卡片，清晰列出优劣）。
    *   实现用户选择方案的交互。

#### 2.2 第二幕Agent开发 (CharacterArchitect)

*   **任务 2.2.1：创建新Agent (Agent/Backend)**
    *   创建 `lib/agents/character-architect.ts`。
*   **任务 2.2.2：实现 P4 和 P5 (提案) (Agent/Backend)**
    *   实现接收用户输入（角色、矛盾）并执行P4和P5的逻辑。
    *   **关键挑战**：确保LLM返回结构化的、可解析的方案对比。需要强大的Prompt Engineering和输出解析逻辑。
*   **任务 2.2.3：实现 P6 (深化) (Agent/Backend)**
    *   实现接收用户选择的方案，并执行P6（“Show, Don't Tell”），输出结构化的“戏剧动作”列表。

#### 2.3 交互式API与决策追踪

*   **任务 2.3.1：定义迭代API端点 (Backend)**
    *   我们可以设计一个通用的交互API来处理不同幕的迭代。
    *   `POST /api/v1/iteration/propose`：
        *   输入：`projectId`, `act`="ACT2", `context`（包含P4输入）。
        *   执行：调用对应Agent（如CharacterArchitect）执行提案逻辑（P5）。
        *   输出：方案列表。
    *   `POST /api/v1/iteration/execute`：
        *   输入：`projectId`, `act`="ACT2", `selectedSolutionId`。
        *   执行：调用Agent执行深化逻辑（P6）。
        *   输出：执行结果（戏剧动作）。
*   **任务 2.3.2：决策日志模型与存储 (Backend)**
    *   扩展Prisma模型，创建 `RevisionDecision` 模型。
    *   该模型记录：关联项目、所属幕、焦点对象（如角色名）、用户选择、AI生成的具体修改内容。**这是最终合成的关键数据源。**
    *   在 `execute` API完成后，存储决策日志。

**阶段二交付物**：第二幕的交互式工作流完全可用。用户可以选择角色，接收AI方案，做出决策，AI执行深化，并且所有决策都被记录在数据库中。

---

### 阶段三：专业化与最终合成 (预计 2-3 周)

**目标**：完成剩余三幕的Agent开发，实现最核心的剧本合成功能，并完善版本管理。

#### 3.1 完成剩余Agent开发与集成

*   **任务 3.1.1：实现第三幕 (RulesAuditor) (Agent/Backend/Frontend)**
    *   创建 `lib/agents/rules-auditor.ts` (P7-P9)。
    *   复用阶段二的通用迭代API和前端交互模式，实现世界观审计。
*   **任务 3.1.2：实现第四幕 (PacingStrategist) (Agent/Backend/Frontend)**
    *   创建 `lib/agents/pacing-strategist.ts` (P10-P11)。
    *   实现结构与节奏优化迭代。
*   **任务 3.1.3：实现第五幕 (ThematicPolisher) (Agent/Backend)**
    *   创建 `lib/agents/thematic-polisher.ts` (P12-P13)。
    *   这一幕可能更偏向生成性（如人物小传），而非迭代修改。实现相应的API并存储结果。

#### 3.2 剧本大合成 (The Grand Synthesis)

*   **任务 3.2.1：强化 RevisionExecutive Agent (Agent/Backend)**
    *   重构 `lib/agents/revision-executive.ts`。**取代**当前简陋的 `/api/script-repair` 逻辑。
*   **任务 3.2.2：数据汇总与Prompt构建 (Agent/Backend)**
    *   实现逻辑，从数据库中检索原始剧本（V1）和该项目下所有的 `RevisionDecision` 记录（Acts 2-5）。
    *   **核心挑战**：构建一个高度复杂的合成Prompt。该Prompt必须指示LLM：
        *   理解所有修改项的意图和内容。
        *   处理修改项之间的潜在冲突和关联性。
        *   保持原文风格，自然地将修改融入剧本。
*   **任务 3.2.3：执行合成 (Backend)**
    *   实现 `POST /api/v1/synthesize` 端点。触发合成过程（这通常也是一个异步任务）。
    *   更新项目状态为 `SYNTHESIZING`，完成后更新为 `COMPLETED`。

#### 3.3 版本管理与用户体验

*   **任务 3.3.1：版本存储与对比 (Frontend/Backend)**
    *   将合成后的剧本存储在 `ScriptVersion` 模型中，标记为V2。
    *   在前端集成一个剧本对比工具（例如 `react-diff-viewer`），让用户清晰地看到V1到V2的所有改动。
*   **任务 3.3.2：完善导出功能 (Frontend/Backend)**
    *   完善导出功能，支持导出最新版本的剧本（尝试实现.docx格式，例如使用 `docx` npm包）。

**阶段三交付物**：完整的五幕式AI剧本共创平台。系统能够引导用户完成整个迭代流程，并将所有修改智能合成为最终剧本，并提供版本对比和导出功能。

---

这份文档提供了极其详细的系统重构工作流，精确到了API端点、数据库操作、Agent职责以及与LLM（DeepSeek）的交互细节。这将作为您后续开发的工程蓝图。

### 核心架构组件定义

  * **Frontend (FE)**: Next.js (React)。用户界面和交互逻辑。
  * **Backend API (BE)**: Next.js API Routes (`/api/v1/`)。处理请求，管理状态机。
  * **Database (DB)**: PostgreSQL via Prisma ORM。持久化存储和状态管理。
  * **Agents**: TypeScript类（位于 `/lib/agents/`）。负责构建Prompt链和解析LLM输出。
  * **LLM**: DeepSeek API。执行分析和重写任务。
  * **Worker/Queue**: 后台任务队列（例如，使用 BullMQ/Redis 或云服务商的异步函数）。处理耗时的LLM任务。

-----

### 详细工作流 1：项目初始化与第一幕（地基诊断）

**目标**：用户上传剧本，系统异步执行第一幕分析（P1-P3），并返回结果。

#### 1.1 用户上传与项目创建

1.  **FE (UI操作)**: 用户在 `app/dashboard/page.tsx` 粘贴剧本内容，点击 "开始AI分析"，触发 `handleAnalyze`。
2.  **FE (API调用)**: 发送请求到 `POST /api/v1/projects`。
      * Payload: `{ title: "剧本标题", scriptContent: "..." }`。
3.  **BE (API逻辑 - `/api/v1/projects/route.ts`)**: 验证输入数据。
4.  **DB (Prisma交互)**:
      * 开始数据库事务。
      * `prisma.project.create()`: 创建新项目记录。设置 `workflowStatus = 'INITIALIZED'`。
      * `prisma.scriptVersion.create()`: 存储原始剧本内容。设置 `version = 1` (V1)，关联 `projectId`。
      * 提交事务。
5.  **BE (响应)**: 返回 `201 Created`。
      * Body: `{ projectId: "proj_123" }`。

#### 1.2 触发分析与异步队列

1.  **FE (API调用)**: 接收到 `projectId` 后，立即发送请求到 `POST /api/v1/analyze`。
      * Payload: `{ projectId: "proj_123" }`。
2.  **BE (API逻辑 - `/api/v1/analyze/route.ts`)**: 验证 `projectId`。
3.  **DB (Prisma交互)**:
      * `prisma.analysisJob.create()`: 创建任务跟踪记录。设置 `status = 'QUEUED'`, `type = 'ACT1'`.
      * `prisma.project.update()`: 更新项目状态 `workflowStatus = 'ACT1_RUNNING'`.
4.  **Worker/Queue**: 将任务加入后台队列。任务名称：`ProcessAct1`。参数：`{ projectId, jobId }`。
5.  **BE (响应)**: 立即返回 `202 Accepted`。
      * Body: `{ jobId: "job_456" }`。

#### 1.3 后台处理与LLM交互

1.  **Worker (任务处理)**:
      * 从队列中拾取 `ProcessAct1` 任务。
      * 更新DB：`AnalysisJob` 状态为 `PROCESSING`。
      * 检索V1剧本内容。
2.  **Worker (Agent调用)**: 实例化 `ConsistencyGuardian` Agent。
3.  **Agent (LLM交互 - P1, P2, P3)**:
      * 构建并组合 Prompt 1（设定角色）、P2（输入梗概）、P3（结构化反馈要求）。
      * 发送组合Prompt到 DeepSeek API。
4.  **Agent (逻辑处理)**:
      * 接收 LLM 的“诊断报告”。
      * **关键步骤**：执行严格的解析逻辑，将LLM输出转换为预定义的 `DiagnosticReport` 数据结构。如果解析失败，将任务状态设为 `FAILED`。

#### 1.4 结果保存与状态更新

1.  **DB (Prisma交互)**:
      * `prisma.diagnosticReport.create()`: 存储解析后的诊断报告。
      * `prisma.project.update()`: 更新项目状态 `workflowStatus = 'ACT1_COMPLETE'`。
      * `prisma.analysisJob.update()`: 更新任务状态 `status = 'COMPLETED'`.

#### 1.5 前端轮询与结果展示

1.  **FE (状态轮询)**: 开始定期轮询 `GET /api/v1/analyze/[jobId]/status`。
2.  **FE (结果获取)**: 当检测到 `COMPLETED` 时，发送请求到 `GET /api/v1/projects/[projectId]/report`。
3.  **FE (UI更新)**: 重定向到交互式工作台 `app/analysis/[id]/page.tsx`，渲染报告，等待用户迭代。

-----

### 详细工作流 2：迭代循环（以第二幕：人物弧光为例）

**目标**：用户选择焦点（P4），AI提出方案（P5），用户决策，AI执行深化（P6），并记录决策。这是同步交互循环。

#### 2.1 用户选择焦点与请求提案 (P4输入)

1.  **FE (UI操作 - 工作台)**:
      * 用户选择聚焦角色“张三”。
      * 用户输入“张三的核心矛盾”（P4的输入）。
      * 点击“分析人物弧光”。
2.  **FE (API调用)**: 发送请求到 `POST /api/v1/iteration/propose`。
      * Payload:
        ```json
        {
          "projectId": "proj_123",
          "act": "ACT2",
          "focusName": "张三",
          "context": { "contradiction": "..." }
        }
        ```
3.  **BE (API逻辑 - `/api/v1/iteration/propose/route.ts`)**:
      * 更新DB：如果项目状态不是 `ITERATING`，则更新为 `ITERATING`。
      * 根据 `act` ("ACT2") 识别对应的 Agent：`CharacterArchitect`。

#### 2.2 Agent分析与提案生成 (P4+P5)

1.  **BE (Agent调用)**: 实例化 `CharacterArchitect`，调用 `proposeSolutions(context)`。
2.  **Agent (LLM交互 - P4 & P5)**:
      * 构建 Prompt 4（聚焦）和 Prompt 5（要求2个解决方案及优劣分析）。
      * 发送到 DeepSeek API。
3.  **Agent (逻辑处理)**:
      * 解析 LLM 输出。必须解析为严格的结构化数据：
        ```json
        {
          "solutions": [
            { "id": "sol_A", "title": "深化原有动机", "pros": [...], "cons": [...] },
            { "id": "sol_B", "title": "颠覆表面动机", "pros": [...], "cons": [...] }
          ]
        }
        ```
4.  **BE (响应)**: 返回 `200 OK`，Body 包含 `solutions`。

#### 2.3 用户决策与执行请求 (P6输入)

1.  **FE (UI更新与操作)**:
      * 渲染“方案对比”视图。
      * 用户选择“方案A”，点击“执行此方案”。
2.  **FE (API调用)**: 发送请求到 `POST /api/v1/iteration/execute`。
      * Payload: `{ "projectId": "proj_123", "selectedSolutionId": "sol_A" }`.

#### 2.4 Agent深化与决策记录 (P6)

1.  **BE (API逻辑 - `/api/v1/iteration/execute/route.ts`)**: 再次调用 `CharacterArchitect`。
2.  **Agent (LLM交互 - P6)**:
      * 构建 Prompt 6（“Show, Don't Tell”指令，要求具体的戏剧动作）。
      * 发送到 DeepSeek API。
3.  **Agent (逻辑处理)**: 解析 LLM 输出，提取“戏剧动作”列表。
4.  **DB (Prisma交互)**:
      * **核心步骤：记录决策**。这是最终合成的依据。
      * `prisma.revisionDecision.create()`:
          * `projectId`: "proj\_123"
          * `act`: "ACT2"
          * `focus`: "张三"
          * `userChoice`: "sol\_A"
          * `generatedChanges`: [解析出的戏剧动作列表] (JSON字段)
5.  **BE (响应)**: 返回 `200 OK`。
6.  **FE (UI更新)**: 将“张三”的问题标记为“已解决”，引导用户选择下一个焦点（循环回 2.1）。

*(注：第三幕、第四幕复用此流程，使用 RulesAuditor 和 PacingStrategist Agent。第五幕流程类似，使用 ThematicPolisher Agent。)*

-----

### 详细工作流 3：剧本大合成（The Grand Synthesis）

**目标**：将所有记录的修改决策智能地合成为最终剧本V2。

#### 3.1 触发合成与准备

1.  **FE (UI操作)**: 用户完成所有迭代，点击“生成最终剧本V2”。
2.  **FE (API调用)**: 发送请求到 `POST /api/v1/synthesize`。
3.  **BE (API逻辑与队列)**:
      * 更新DB：`workflowStatus = 'SYNTHESIZING'`.
      * 创建 `AnalysisJob`，`type = 'SYNTHESIS'`.
      * 将任务 `SynthesizeScript` 加入队列。
      * 返回 `202 Accepted`。
4.  **FE (轮询)**: 开始轮询任务状态。

#### 3.2 数据汇总与Prompt构建

1.  **Worker (任务处理)**: 拾取 `SynthesizeScript` 任务。
2.  **DB (Prisma交互 - 数据汇总)**:
      * 获取原始剧本V1：`prisma.scriptVersion.findFirst({ version: 1 })`.
      * 获取所有修改决策：`prisma.revisionDecision.findMany({ projectId })`.
3.  **Worker (Agent调用)**: 实例化 `RevisionExecutive` Agent。
4.  **Agent (逻辑处理 - 构建“大合成Prompt”)**:
      * **核心挑战**：构建一个能够处理复杂指令和潜在冲突的Prompt。
      * 将来自不同幕的所有修改项（`RevisionDecision`）整合成一份清晰、连贯的修改指令集（Change Log）。
      * 构建最终Prompt，包含：原始剧本V1、修改指令集、风格保持要求、自然衔接要求。

#### 3.3 LLM合成与版本管理

1.  **Agent (LLM交互)**:
      * 发送“大合成Prompt”到 DeepSeek API。（如果剧本过长，可能需要分块处理）。
2.  **Agent (逻辑处理)**: 接收 LLM 返回的完整修订版剧本。
3.  **DB (Prisma交互)**:
      * `prisma.scriptVersion.create()`: 存储新剧本。设置 `version = 2` (V2)。
      * `prisma.project.update()`: 更新项目状态 `workflowStatus = 'COMPLETED'`.
      * `prisma.analysisJob.update()`: 更新任务状态 `status = 'COMPLETED'`.
4.  **FE (结果展示与对比)**:
      * 轮询检测到完成。
      * 获取 V1 和 V2 剧本内容。
      * 在前端使用剧本对比工具（如 `react-diff-viewer`）展示所有改动。
      * 激活“导出剧本”功能。
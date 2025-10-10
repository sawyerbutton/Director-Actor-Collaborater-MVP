# 剧本版本迭代任务 - Script Versioning During Iteration

**任务类型**: 架构修复 (Architecture Fix)
**优先级**: P0 - Critical
**Epic**: Epic 005 & 006 - Interactive Workflow
**创建日期**: 2025-10-10
**状态**: 待实施 (To Implement)

---

## 📋 问题陈述 (Problem Statement)

### 当前实现分析 (Current Implementation Analysis)

**核心问题**: 在 ACT2-5 迭代工作流中，所有决策都基于 V1（原始剧本），导致：

1. **决策隔离**: 每个决策都看不到其他决策的修改结果
2. **用户体验差**: 用户无法验证渐进式改进效果
3. **合成复杂度爆炸**: 所有冲突延迟到 Synthesis 阶段一次性解决
4. **无累积迭代支持**: 无法在前一个决策的基础上进行下一个决策

### 技术实现细节 (Technical Details)

**当前代码位置**:
- `app/api/v1/iteration/propose/route.ts:88` - 始终使用 `project.content` (V1)
- `app/api/v1/iteration/execute/route.ts:182-193` - 仅存储 `generatedChanges`，不创建版本
- `lib/synthesis/version-manager.ts` - 仅在 Synthesis 阶段创建版本

**数据流** (Current Flow):
```
ACT1 → V1 (Original Script)
  ↓
ACT2 Decision 1 → generatedChanges → 存入 RevisionDecision (项目内容不变)
  ↓
ACT2 Decision 2 → 仍基于 V1 (看不到 Decision 1 的修改)
  ↓
ACT3-5 Decisions → 全部基于 V1
  ↓
Synthesis → 合并所有 generatedChanges → V2 (第一次生成新剧本)
```

### 业务影响 (Business Impact)

**用户体验问题**:
1. ❌ 用户完成决策后看不到剧本变化
2. ❌ 无法评估 AI 生成的修改质量
3. ❌ 无法在改进后的剧本上继续迭代
4. ❌ 缺乏渐进式改进的反馈循环

**系统问题**:
1. ⚠️ Synthesis 阶段冲突检测复杂度 O(n²) (n = 决策数量)
2. ⚠️ 大量决策时合成失败风险高
3. ⚠️ 无法支持"撤销上一个决策"功能
4. ⚠️ 无法支持"查看决策前后对比"功能

---

## 🎯 解决方案 (Proposed Solutions)

### 方案A: 渐进式版本更新 (Recommended) ⭐

**核心思想**: 每次执行决策后立即生成新版本，下一个决策基于最新版本

**版本编号规则**:
```
V1.0   → 原始剧本 (Original Script)
V1.1   → ACT2 Decision 1 应用后
V1.2   → ACT2 Decision 2 应用后
V1.3   → ACT3 Decision 1 应用后
...
V1.N   → 所有决策应用后
V2.0   → Synthesis 生成的最终剧本 (可选，或直接用 V1.N)
```

**优点** ✅:
- 用户可见每个决策的实际效果
- 决策可以累积叠加（后续决策看到前面的修改）
- 冲突检测提前、分散，降低 Synthesis 复杂度
- 支持版本对比、回滚、预览等高级功能
- 更符合用户心理模型（逐步改进剧本）

**缺点** ⚠️:
- 实现复杂度较高（需要 `applyChanges` 函数）
- 需要额外存储空间（每个决策一个版本）
- 决策顺序影响最终结果（需要明确说明）

**实施复杂度**: 中等 (3-5 工作日)

---

### 方案B: 混合模式 (Hybrid Mode)

**核心思想**: Act 内累积，Act 间基线

**版本策略**:
```
V1.0   → 原始剧本
ACT2:
  - Decision 1 → V1.1 (基于 V1.0)
  - Decision 2 → V1.2 (基于 V1.1) ← 累积
ACT3:
  - Decision 1 → V1.3 (基于 V1.0) ← 回到基线
  - Decision 2 → V1.4 (基于 V1.3) ← 累积
...
Synthesis → V2.0 (合并所有 Act)
```

**优点** ✅:
- 平衡了累积迭代和冲突控制
- Act 内用户可见改进
- Act 间独立，降低交叉影响

**缺点** ⚠️:
- 逻辑复杂，用户理解成本高
- 仍需 Synthesis 合并不同 Act

**实施复杂度**: 较高 (5-7 工作日)

---

### 方案C: 保持现状 + 增强预览

**核心思想**: 不改变架构，增加预览功能

**改进点**:
- 增加 `previewChanges` API，返回应用修改后的剧本片段
- 前端显示"预览效果"按钮
- 实际修改仍在 Synthesis 阶段应用

**优点** ✅:
- 实现成本低
- 不破坏现有架构
- 降低冲突检测复杂度

**缺点** ⚠️:
- 仍无法支持累积迭代
- 预览与最终结果可能不一致（其他决策影响）
- 无法解决根本问题

**实施复杂度**: 低 (1-2 工作日)

---

## ✅ 推荐方案: 方案A - 渐进式版本更新

### 实施计划 (Implementation Plan)

#### 阶段1: 实现 `applyChanges` 函数 (2 天)

**目标**: 将 `generatedChanges` 应用到剧本内容

**文件**: `lib/synthesis/change-applicator.ts` (新建)

**核心逻辑**:
```typescript
interface ApplyChangesOptions {
  act: ActType;
  generatedChanges: any;
  currentScript: string;
  focusContext: any;
}

async function applyChanges(options: ApplyChangesOptions): Promise<string> {
  const { act, generatedChanges, currentScript, focusContext } = options;

  switch (act) {
    case 'ACT2_CHARACTER':
      return applyCharacterChanges(generatedChanges, currentScript, focusContext);

    case 'ACT3_WORLDBUILDING':
      return applyWorldbuildingChanges(generatedChanges, currentScript, focusContext);

    case 'ACT4_PACING':
      return applyPacingChanges(generatedChanges, currentScript, focusContext);

    case 'ACT5_THEME':
      return applyThemeChanges(generatedChanges, currentScript, focusContext);

    default:
      throw new Error(`Unsupported act type: ${act}`);
  }
}

// ACT2: 应用戏剧化动作到剧本
async function applyCharacterChanges(
  changes: { dramaticActions: any[]; overallArc: string; integrationNotes: string },
  currentScript: string,
  focusContext: any
): Promise<string> {
  // 1. 解析剧本为场景数组
  const scenes = parseScriptToScenes(currentScript);

  // 2. 对每个 dramaticAction 应用修改
  for (const action of changes.dramaticActions) {
    const sceneIndex = scenes.findIndex(s => s.sceneNumber === action.sceneNumber);
    if (sceneIndex !== -1) {
      // 在场景中插入或修改动作描述
      scenes[sceneIndex] = insertDramaticAction(scenes[sceneIndex], action);
    }
  }

  // 3. 重新组装剧本
  return assembleScenesIntoScript(scenes);
}

// ACT3: 应用世界观修改
async function applyWorldbuildingChanges(
  changes: { alignmentStrategies: any[]; coreRecommendation: string; integrationNotes: string },
  currentScript: string,
  focusContext: any
): Promise<string> {
  // 根据 alignmentStrategies 修改设定描述
  // 实现逻辑类似 ACT2，但针对世界观元素
  return currentScript; // Placeholder
}

// ACT4: 应用节奏优化
async function applyPacingChanges(
  changes: { changes: any[]; expectedImprovement: string; integrationNotes: string },
  currentScript: string,
  focusContext: any
): Promise<string> {
  // 根据 changes 重新组织场景顺序或调整场景长度
  return currentScript; // Placeholder
}

// ACT5: 应用主题润色
async function applyThemeChanges(
  changes: { characterCore: any; integrationNotes: string },
  currentScript: string,
  focusContext: any
): Promise<string> {
  // 根据 characterCore 增强角色对话和描述
  return currentScript; // Placeholder
}
```

**测试**:
- 单元测试覆盖所有 4 个 Act 的应用逻辑
- 集成测试验证剧本结构不被破坏

---

#### 阶段2: 修改 Execute API (1 天)

**目标**: 执行决策后创建新版本并更新 Project.content

**文件**: `app/api/v1/iteration/execute/route.ts`

**修改位置**: Line 182 之后

**新增逻辑**:
```typescript
// 原有代码：更新决策记录
const updatedDecision = await revisionDecisionService.execute(
  validatedData.decisionId,
  {
    userChoice: selectedProposal.id || `choice_${validatedData.proposalChoice}`,
    generatedChanges: generatedChanges as any
  }
);

// ===== 新增代码开始 =====

// 1. 获取当前最新版本的剧本内容
const currentVersion = await versionManager.getLatestVersion(project.id);
const currentScript = currentVersion?.content || project.content;

// 2. 应用修改到剧本
const newScript = await applyChanges({
  act: decision.act,
  generatedChanges: generatedChanges,
  currentScript: currentScript,
  focusContext: decision.focusContext
});

// 3. 创建新版本
const newVersion = await versionManager.createVersion(project.id, newScript, {
  changeType: 'iteration',
  decisionsApplied: [decision.id],
  synthesisLog: [{
    timestamp: new Date().toISOString(),
    act: decision.act,
    focusName: decision.focusName,
    changes: generatedChanges
  }],
  confidence: 0.9 // 单个决策置信度较高
});

// 4. 更新 Project.content 为最新版本
await projectService.updateContent(project.id, newScript);

// 5. 更新 RevisionDecision.version 字段
await revisionDecisionService.updateVersion(decision.id, newVersion.version);

// ===== 新增代码结束 =====

// Update project workflow status to ITERATING (if first decision)
if (project.workflowStatus === 'ACT1_COMPLETE') {
  await projectService.updateWorkflowStatus(project.id, 'ITERATING');
}

// Return execution result to user (新增 versionId 字段)
return NextResponse.json(
  createApiResponse({
    decisionId: updatedDecision.id,
    versionId: newVersion.id, // 新增：返回版本 ID
    version: newVersion.version, // 新增：返回版本号
    ...result
  }),
  { status: HTTP_STATUS.OK }
);
```

**新增 Service 方法**:

**文件**: `lib/db/services/project.service.ts`
```typescript
async updateContent(id: string, content: string): Promise<Project> {
  return await this.prisma.project.update({
    where: { id },
    data: { content, updatedAt: new Date() }
  });
}
```

**文件**: `lib/db/services/revision-decision.service.ts`
```typescript
async updateVersion(id: string, version: number): Promise<RevisionDecision> {
  return await this.prisma.revisionDecision.update({
    where: { id },
    data: { version }
  });
}
```

**文件**: `lib/synthesis/version-manager.ts` (新增方法)
```typescript
async getLatestVersion(projectId: string): Promise<ScriptVersion | null> {
  return await this.prisma.scriptVersion.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' }
  });
}
```

---

#### 阶段3: 前端展示新剧本 (1 天)

**目标**: 用户执行决策后可以查看新剧本

**文件**: `app/iteration/[projectId]/page.tsx`

**修改位置**: `handleExecute` 函数 (Line ~240)

**新增逻辑**:
```typescript
const handleExecute = async (proposalIndex: number) => {
  if (!selectedDecision) return;

  setIsExecuting(true);
  try {
    const result = await v1ApiService.executeProposal(
      selectedDecision.id,
      proposalIndex
    );

    // 新增：保存新版本信息
    setLatestVersionId(result.versionId);
    setLatestVersionNumber(result.version);

    setExecutionResult(result);
    setSelectedProposal(proposalIndex);
    setShowComparison(false);

    // Reload project data to get updated workflow status AND content
    await loadProjectData();

    toast({
      title: '执行成功',
      description: `已生成新剧本版本 V${result.version}`,
      variant: 'default'
    });
  } catch (error: any) {
    // Error handling...
  } finally {
    setIsExecuting(false);
  }
};
```

**新增组件**: `components/workspace/version-viewer.tsx`

```typescript
interface VersionViewerProps {
  projectId: string;
  versionId: string;
  versionNumber: number;
}

export function VersionViewer({ projectId, versionId, versionNumber }: VersionViewerProps) {
  const [version, setVersion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const loadVersion = async () => {
    setIsLoading(true);
    try {
      const data = await v1ApiService.getVersion(versionId);
      setVersion(data);
    } catch (error) {
      console.error('Failed to load version:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>新剧本版本 V{versionNumber}</CardTitle>
        <CardDescription>
          此版本应用了刚才执行的决策修改
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadVersion} disabled={isLoading}>
              {isLoading ? '加载中...' : '查看新剧本'}
            </Button>
            <Button variant="outline" onClick={() => setShowDiff(true)}>
              查看修改对比
            </Button>
          </div>

          {version && (
            <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap">{version.content}</pre>
            </div>
          )}

          {showDiff && (
            <VersionDiffViewer
              projectId={projectId}
              versionId={versionId}
              baseVersion={versionNumber - 1}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**集成到迭代页面** (Line ~500):
```typescript
{executionResult && latestVersionId && (
  <VersionViewer
    projectId={projectId}
    versionId={latestVersionId}
    versionNumber={latestVersionNumber}
  />
)}
```

---

#### 阶段4: 修改 Propose API (0.5 天)

**目标**: Propose API 使用最新版本剧本

**文件**: `app/api/v1/iteration/propose/route.ts`

**修改位置**: Line 88

**原代码**:
```typescript
// Get script context
let scriptContext = validatedData.scriptContext;
if (!scriptContext) {
  // Fetch from project content
  scriptContext = project.content; // ← 始终使用 V1
}
```

**新代码**:
```typescript
// Get script context from latest version
let scriptContext = validatedData.scriptContext;
if (!scriptContext) {
  // Fetch from latest version (NOT original V1)
  const latestVersion = await versionManager.getLatestVersion(project.id);
  scriptContext = latestVersion?.content || project.content; // ← 使用最新版本
}
```

---

## 🧪 测试计划 (Testing Plan)

### 单元测试

**文件**: `tests/unit/change-applicator.test.ts`
```typescript
describe('applyChanges', () => {
  it('should apply ACT2 character changes correctly', async () => {
    const result = await applyChanges({
      act: 'ACT2_CHARACTER',
      generatedChanges: mockCharacterChanges,
      currentScript: mockScript,
      focusContext: mockContext
    });

    expect(result).toContain(mockCharacterChanges.dramaticActions[0].action);
  });

  // 测试 ACT3, ACT4, ACT5...
});
```

### 集成测试

**文件**: `tests/integration/versioning-iteration.test.ts`
```typescript
describe('Versioning Iteration Workflow', () => {
  it('should create V1.1 after first ACT2 decision', async () => {
    // 1. 创建项目 → V1
    const project = await createProject();

    // 2. 执行 ACT1 分析
    await completeAct1Analysis(project.id);

    // 3. 执行 ACT2 决策 1
    const decision1 = await proposeAndExecute(project.id, 'ACT2_CHARACTER');

    // 4. 验证创建了 V1.1
    const versions = await getProjectVersions(project.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1.1); // or 2 if using integer versioning

    // 5. 验证 Project.content 已更新
    const updatedProject = await getProject(project.id);
    expect(updatedProject.content).not.toBe(project.content);
  });

  it('should use V1.1 for second ACT2 decision', async () => {
    // 1-3. 同上，执行第一个决策
    await executeFirstDecision();

    // 4. 获取第二个提案时，应该基于 V1.1
    const proposal2 = await propose(project.id, 'ACT2_CHARACTER', finding2);

    // 5. 验证 scriptContext 是 V1.1 内容
    expect(proposal2.scriptContext).toBe(v1_1_content);
  });
});
```

### 手动测试检查清单

**测试场景 1: 单个 ACT2 决策**
- [ ] 执行 ACT2 决策后，创建了 V1.1
- [ ] V1.1 内容包含 dramaticActions
- [ ] Project.content 已更新为 V1.1
- [ ] 前端显示"新剧本版本 V1.1"按钮
- [ ] 点击按钮可以查看新剧本
- [ ] "查看修改对比"功能正常

**测试场景 2: 多个 ACT2 决策**
- [ ] 第一个决策 → V1.1
- [ ] 第二个决策基于 V1.1 → V1.2
- [ ] 第三个决策基于 V1.2 → V1.3
- [ ] 每个版本都包含累积的修改

**测试场景 3: 跨 Act 决策**
- [ ] ACT2 决策 → V1.1
- [ ] ACT3 决策基于 V1.1 → V1.2
- [ ] ACT4 决策基于 V1.2 → V1.3
- [ ] 版本链条完整

**测试场景 4: Synthesis 集成**
- [ ] 完成多个决策后，版本为 V1.N
- [ ] 触发 Synthesis，生成 V2.0 (或直接使用 V1.N)
- [ ] Synthesis 逻辑仍然正常工作
- [ ] 冲突检测、合并逻辑正常

---

## 📊 验收标准 (Acceptance Criteria)

### 功能验收

1. ✅ 每次执行决策后，自动创建新的 ScriptVersion
2. ✅ 版本号按 V1.1, V1.2, V1.3... 递增
3. ✅ Project.content 始终保持为最新版本
4. ✅ Propose API 使用最新版本作为分析基础
5. ✅ 前端可以查看每个版本的内容
6. ✅ 前端可以对比相邻版本的差异
7. ✅ RevisionDecision 记录关联的版本号

### 性能验收

1. ✅ `applyChanges` 函数执行时间 < 2 秒（单个决策）
2. ✅ 版本创建不阻塞 Execute API 响应（< 5 秒总响应时间）
3. ✅ 数据库存储增长可控（每个版本 < 500KB 额外空间）

### 兼容性验收

1. ✅ 现有 Synthesis 逻辑仍然正常工作
2. ✅ 旧项目（无版本记录）降级到 V1 基线模式
3. ✅ 数据库迁移脚本无损迁移现有数据

### 用户体验验收

1. ✅ 执行决策后，用户明确知道生成了新版本
2. ✅ 查看新剧本操作流畅（< 1 秒加载）
3. ✅ 版本对比清晰展示修改内容
4. ✅ 错误提示友好（如：应用修改失败）

---

## 🚀 实施时间表 (Timeline)

| 阶段 | 任务 | 预计时间 | 负责人 |
|-----|------|---------|--------|
| 阶段1 | 实现 `applyChanges` 函数 | 2 天 | Backend |
| 阶段2 | 修改 Execute API | 1 天 | Backend |
| 阶段3 | 前端展示新剧本 | 1 天 | Frontend |
| 阶段4 | 修改 Propose API | 0.5 天 | Backend |
| 测试 | 单元测试 + 集成测试 | 1 天 | QA |
| 测试 | 手动测试 + 修复 Bug | 0.5 天 | QA |
| **总计** | | **6 天** | |

**里程碑**:
- Day 3: 阶段1 + 阶段2 完成，Execute API 可创建版本
- Day 4: 阶段3 完成，用户可查看新剧本
- Day 5: 阶段4 完成，Propose 使用最新版本
- Day 6: 测试完成，功能发布

---

## 🔧 技术依赖 (Technical Dependencies)

### 新增依赖包

无需新增 npm 包，使用现有技术栈。

### 数据库迁移

**可能需要的 Schema 变更** (可选优化):
```prisma
model ScriptVersion {
  // 现有字段保持不变
  version     Int
  content     String   @db.Text
  changeLog   String?  @db.Text

  // 新增字段（可选）
  versionLabel String?  // 如 "V1.1", "V1.2"
  parentVersionId String? // 父版本 ID（用于版本链）
  parentVersion ScriptVersion? @relation("VersionHistory", fields: [parentVersionId], references: [id])
  childVersions ScriptVersion[] @relation("VersionHistory")
}
```

**迁移脚本**: `prisma/migrations/add_version_label.sql` (可选)

### API 变更

**新增 API**:
- `GET /api/v1/versions/:id` - 已存在 ✅
- `GET /api/v1/versions/:id/diff/:targetId` - 已存在 ✅

**修改 API**:
- `POST /api/v1/iteration/execute` - 返回值新增 `versionId`, `version` 字段
- `POST /api/v1/iteration/propose` - 内部逻辑改为使用最新版本

---

## ⚠️ 风险与缓解措施 (Risks & Mitigation)

### 风险1: `applyChanges` 实现复杂度高

**影响**: 可能导致剧本格式损坏、内容丢失

**缓解措施**:
1. 先实现 ACT2（最简单），验证可行性
2. 增加大量单元测试，覆盖边界情况
3. 实现"安全模式"：如果应用失败，回退到 V1 基线
4. 增加内容校验（如：场景数量、字符数范围检查）

### 风险2: 版本存储空间增长

**影响**: 大量版本占用数据库空间

**缓解措施**:
1. 版本内容使用压缩存储（gzip）
2. 定期清理旧版本（保留最近 10 个版本）
3. 提供"版本合并"功能（用户手动触发）

### 风险3: Synthesis 逻辑兼容性

**影响**: 新版本策略可能破坏现有 Synthesis 逻辑

**缓解措施**:
1. Synthesis 时检查版本链完整性
2. 如果检测到渐进式版本，直接使用最新版本（V1.N）作为 V2
3. 保留"合并所有 generatedChanges"逻辑作为后备方案

### 风险4: 用户困惑于版本概念

**影响**: 用户不理解 V1.1, V1.2 的含义

**缓解措施**:
1. UI 中使用更友好的标签："第 1 次改进", "第 2 次改进"
2. 提供版本时间线可视化
3. 增加帮助文档和 Tooltip 说明

---

## 📝 相关文档 (Related Documentation)

- **Epic 005 README**: `docs/epics/epic-005-interactive-workflow/README.md`
- **Epic 006 README**: `docs/epics/epic-006-multi-act-agents/README.md`
- **Epic 007 README**: `docs/epics/epic-007-synthesis-engine/README.md`
- **Synthesis Engine**: `lib/synthesis/synthesis-engine.ts`
- **Version Manager**: `lib/synthesis/version-manager.ts`
- **ACT2 Workflow Fix Plan**: `docs/fixes/ACT2_WORKFLOW_FIX_PLAN.md`

---

## 🎯 下一步行动 (Next Actions)

1. **Review & Approval** (0.5 天)
   - [ ] 产品经理审核方案
   - [ ] 技术负责人审核实施计划
   - [ ] 评估时间和资源

2. **Implementation** (6 天)
   - [ ] 分配任务给开发团队
   - [ ] 按阶段实施（阶段1 → 阶段4）
   - [ ] 每日 Stand-up 同步进度

3. **Testing & Release** (1 天)
   - [ ] QA 团队执行测试计划
   - [ ] 修复发现的 Bug
   - [ ] 发布到 Production

4. **Monitoring** (持续)
   - [ ] 监控版本存储增长
   - [ ] 收集用户反馈
   - [ ] 优化 `applyChanges` 性能

---

**文档版本**: v1.0
**最后更新**: 2025-10-10
**审核人**: 待定
**状态**: 待审核 (Pending Review)

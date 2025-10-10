# ACT2 工作流业务逻辑问题分析与优化方案

## 📋 问题清单

### 1. **Workflow Status 不更新** ⚠️ 高优先级

**现象**：
- 执行决策后，页面右上角仍显示 `ACT1_COMPLETE`
- 应该显示 `ITERATING` 表示正在进行迭代

**根本原因**：
- 后端 `/api/v1/iteration/execute` 只更新了 `RevisionDecision` 记录
- 没有更新 `Project.workflowStatus` 字段
- 前端页面加载时获取的是初始状态（ACT1_COMPLETE）

**影响**：
- 用户无法直观看到当前工作流阶段
- 其他页面可能依赖 workflowStatus 做判断
- 业务流程状态机不完整

**修复位置**：
- `app/api/v1/iteration/execute/route.ts` (Line 182-188)
- 需要在执行决策后更新 project.workflowStatus

---

### 2. **决策历史显示不友好** ⚠️ 中优先级

**现象**：
- 决策历史只显示 JSON 字符串片段（Line 640）
- 只显示"已执行方案 #1"，看不到具体结果
- 没有展开查看功能

**根本原因**：
- UI 设计时没有考虑如何友好展示决策详情
- `generatedChanges` 结构复杂，直接显示 JSON 不可读

**影响**：
- 用户无法回顾之前的决策内容
- 不知道选择的方案是什么
- 不知道 AI 生成了什么修改

**修复方案**：
- 添加展开/折叠功能
- 为不同 Act 类型提供定制化显示
- 显示提案标题、描述、生成的变更摘要

**修复位置**：
- `app/iteration/[projectId]/page.tsx` (Line 612-660)

---

### 3. **Findings 列表不更新** ⚠️ 中优先级

**现象**：
- 执行决策后，原始问题仍在 findings 列表中
- 没有标记"已处理"
- 用户可能重复处理同一个问题

**根本原因**：
- DiagnosticReport 的 findings 是静态数据（Act 1 生成后不变）
- 没有机制跟踪哪些 findings 已被处理

**影响**：
- 用户体验差，不知道哪些问题已解决
- 可能重复选择同一个问题
- 无法追踪修复进度

**修复方案（3个选项）**：

**方案 A：前端过滤已处理的 findings** （推荐）
- 对比 decisions 和 findings
- 如果 finding 的描述/类型匹配已有 decision，标记为"已处理"
- 显示灰色或添加"✓ 已处理"徽章

**方案 B：数据库级别标记**
- 在 DiagnosticReport findings 中添加 `processedAt` 字段
- 执行决策时更新对应 finding
- 需要修改 Prisma schema

**方案 C：混合方案**
- 前端标记 + 后端记录
- RevisionDecision 记录 focusName/focusContext
- 前端通过 focusContext 匹配 findings

**推荐**：方案 A（无需修改数据库，快速实现）

---

### 4. **Workflow Status 状态机不完整** ⚠️ 低优先级

**当前状态机**：
```
INITIALIZED → ACT1_RUNNING → ACT1_COMPLETE → ??? → SYNTHESIZING → COMPLETED
```

**缺失的状态**：
- `ITERATING` - 正在进行 Acts 2-5 迭代
- 何时从 ACT1_COMPLETE 转换到 ITERATING？
- 何时从 ITERATING 转换到 SYNTHESIZING？

**建议的完整状态机**：
```
INITIALIZED
  ↓
ACT1_RUNNING
  ↓
ACT1_COMPLETE
  ↓ (首次执行决策)
ITERATING
  ↓ (用户点击"生成最终剧本")
SYNTHESIZING
  ↓
COMPLETED
```

**触发条件**：
1. `ACT1_COMPLETE → ITERATING`：执行首个 revision decision
2. `ITERATING → SYNTHESIZING`：用户主动触发合成
3. `SYNTHESIZING → COMPLETED`：合成完成

---

## 🎯 优化方案设计

### 优先级 1：修复 Workflow Status 更新

**实现步骤**：

1. **后端修改** - `app/api/v1/iteration/execute/route.ts`
   ```typescript
   // After line 188, add:

   // Update project workflow status to ITERATING (if first decision)
   if (project.workflowStatus === 'ACT1_COMPLETE') {
     await projectService.updateWorkflowStatus(project.id, 'ITERATING');
   }
   ```

2. **前端修改** - `app/iteration/[projectId]/page.tsx`
   ```typescript
   // After executing decision (line 239), reload workflow status
   await loadProjectData(); // This will refresh workflowStatus
   ```

**预期结果**：
- ✅ 执行首个决策后，状态变为 ITERATING
- ✅ 页面右上角显示正确的状态徽章
- ✅ 刷新页面后状态保持

---

### 优先级 2：优化决策历史显示

**实现步骤**：

1. **创建 DecisionCard 组件**
   ```tsx
   // components/workspace/decision-card.tsx
   - 显示 Act 类型、焦点名称
   - 可展开/折叠查看详情
   - 分 Act 类型定制化显示 generatedChanges
   - 显示创建时间、执行状态
   ```

2. **替换决策历史 Tab**
   ```typescript
   // app/iteration/[projectId]/page.tsx (line 612-660)
   - 使用 DecisionCard 组件
   - 添加过滤功能（按 Act 类型）
   - 添加搜索功能
   ```

**显示内容（分 Act 类型）**：
- **ACT2**: 戏剧化动作列表、整体弧线、集成说明
- **ACT3**: 对齐策略、核心建议
- **ACT4**: 节奏变更、预期改进
- **ACT5**: 角色核心定义、集成说明

---

### 优先级 3：标记已处理的 Findings

**实现步骤**：

1. **创建匹配逻辑**
   ```typescript
   // app/iteration/[projectId]/page.tsx

   const getProcessedFindings = (): Set<string> => {
     const processed = new Set<string>();
     decisions.forEach(decision => {
       if (decision.userChoice && decision.generatedChanges) {
         // Use focusContext to match findings
         const context = decision.focusContext;
         processed.add(JSON.stringify(context));
       }
     });
     return processed;
   };

   const isFind ingProcessed = (finding: Finding): boolean => {
     const processedSet = getProcessedFindings();
     // Match by description or location
     return processedSet.has(JSON.stringify(finding));
   };
   ```

2. **修改 FindingsSelector 组件**
   ```tsx
   // components/workspace/findings-selector.tsx
   - 添加 processedFindings prop
   - 对已处理的 finding 添加视觉标记
   - 灰色显示或添加 "✓ 已处理" 徽章
   - 可选：允许重新处理（显示警告）
   ```

---

## 🚀 实施计划

### 第一阶段：核心修复（1-2小时）
1. ✅ 修复 Workflow Status 更新逻辑
2. ✅ 前端刷新 workflow status
3. ✅ 测试状态转换

### 第二阶段：用户体验优化（2-3小时）
1. ✅ 创建 DecisionCard 组件
2. ✅ 优化决策历史显示
3. ✅ 添加展开/折叠功能

### 第三阶段：Findings 标记（1-2小时）
1. ✅ 实现匹配逻辑
2. ✅ 修改 FindingsSelector 组件
3. ✅ 添加视觉标记

### 第四阶段：测试与验证（1小时）
1. ✅ 完整工作流测试
2. ✅ 边界情况测试
3. ✅ 部署到 Vercel

---

## 📊 总工作量估算

- **核心修复**：1-2 小时（高优先级）
- **体验优化**：2-3 小时（中优先级）
- **Findings 标记**：1-2 小时（中优先级）
- **测试验证**：1 小时

**总计**: 5-8 小时

---

## 🤔 需要确认的业务逻辑问题

1. **同一个 finding 可以处理多次吗？**
   - 选项 A：只能处理一次，之后标记为已处理
   - 选项 B：可以重复处理，生成多个决策
   - **建议**：选项 B（允许用户尝试不同方案）

2. **何时允许进入合成阶段？**
   - 选项 A：至少执行 1 个决策即可
   - 选项 B：每个 Act (2-5) 至少有 1 个决策
   - 选项 C：用户自行决定（随时可以合成）
   - **建议**：选项 C（用户自主决定）

3. **已处理的 finding 如何显示？**
   - 选项 A：从列表中移除（不推荐）
   - 选项 B：灰色显示 + "✓ 已处理" 徽章
   - 选项 C：移到"已处理"分组
   - **建议**：选项 B（保留在列表中，添加标记）

---

## ✅ 下一步行动

**请确认**：
1. 是否同意上述问题分析？
2. 是否同意优化方案设计？
3. 是否同意实施优先级？
4. 对3个业务逻辑问题的选择？

**确认后**，我将立即开始实施第一阶段（核心修复）。

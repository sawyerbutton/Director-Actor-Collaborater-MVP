# ACT2 工作流修复 - 快速实施指南

**版本**: v1.1.0
**创建日期**: 2025-10-10
**预计耗时**: 5-8小时

---

## 🚀 快速导航

- [修复计划（详细）](./ACT2_WORKFLOW_FIX_PLAN.md) - 完整的修复方案和设计
- [测试检查清单](./ACT2_WORKFLOW_TEST_CHECKLIST.md) - 详细的测试步骤
- [问题分析](./ACT2_WORKFLOW_ISSUES_ANALYSIS.md) - 问题根因分析

---

## ⚡ 快速修复步骤

### 阶段1: 核心修复 - Workflow Status (1小时) ⭐

#### Step 1: 检查 projectService 方法
```bash
# 查看是否有 updateWorkflowStatus 方法
grep -n "updateWorkflowStatus" lib/db/services/project.service.ts
```

如果没有，添加方法：
```typescript
// lib/db/services/project.service.ts
async updateWorkflowStatus(id: string, status: WorkflowStatus): Promise<Project> {
  return await this.prisma.project.update({
    where: { id },
    data: { workflowStatus: status, updatedAt: new Date() }
  });
}
```

#### Step 2: 修改执行API
**文件**: `app/api/v1/iteration/execute/route.ts`

在 Line 188 后添加（`const updatedDecision =` 之后）：
```typescript
// Update project workflow status to ITERATING (if first decision)
if (project.workflowStatus === 'ACT1_COMPLETE') {
  await projectService.updateWorkflowStatus(project.id, 'ITERATING');
}
```

#### Step 3: 前端刷新状态
**文件**: `app/iteration/[projectId]/page.tsx`

在 `handleExecute` 函数的 Line 239 后添加：
```typescript
// Reload project data to get updated workflow status
await loadProjectData();
```

#### Step 4: 测试
```bash
npm run typecheck    # 确保无TypeScript错误
npm run build        # 确保构建成功
```

#### Step 5: 手动测试
1. 启动开发服务器：`npm run dev`
2. 访问迭代页面
3. 执行一个决策
4. 查看右上角状态是否从 ACT1_COMPLETE 变为 ITERATING

**✅ 预期**: 状态正确更新

---

### 阶段2: 决策历史优化 - DecisionCard (2小时)

#### Step 1: 创建 DecisionCard 组件
**文件**: `components/workspace/decision-card.tsx`

复制完整代码from [ACT2_WORKFLOW_FIX_PLAN.md#阶段2](./ACT2_WORKFLOW_FIX_PLAN.md#阶段2-决策历史优化---decisioncard-组件--p1)

#### Step 2: 修改迭代页面
**文件**: `app/iteration/[projectId]/page.tsx`

1. 添加导入（Line 15 后）：
```typescript
import { DecisionCard } from '@/components/workspace/decision-card';
```

2. 替换决策历史 Tab（Line 612-660）：
```typescript
<TabsContent value="history" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>决策历史记录</CardTitle>
      <CardDescription>查看本项目所有Act的决策记录</CardDescription>
    </CardHeader>
    <CardContent>
      {decisions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>暂无决策记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

#### Step 3: 测试
```bash
npm run typecheck
npm run build
```

#### Step 4: 手动测试
1. 执行几个决策
2. 切换到"决策历史"标签
3. 展开/折叠决策卡片
4. 验证显示内容正确

**✅ 预期**: 决策历史友好显示，可展开查看详情

---

### 阶段3: Findings 标记 - 已处理标记 (2小时)

#### Step 1: 添加匹配逻辑
**文件**: `app/iteration/[projectId]/page.tsx`

在 Line 283 后添加：
```typescript
// Helper function to check if a finding is processed
const isFindingProcessed = (finding: Finding): boolean => {
  return decisions.some(decision => {
    if (!decision.userChoice || !decision.generatedChanges) return false;

    // Match by description similarity
    const focusDesc = String(decision.focusContext?.contradiction || '');
    return focusDesc.includes(finding.description) ||
           finding.description.includes(focusDesc);
  });
};

// Count how many times a finding was processed
const getProcessedCount = (finding: Finding): number => {
  return decisions.filter(decision => {
    if (!decision.userChoice || !decision.generatedChanges) return false;

    const focusDesc = String(decision.focusContext?.contradiction || '');
    return focusDesc.includes(finding.description) ||
           finding.description.includes(focusDesc);
  }).length;
};
```

#### Step 2: 修改 FindingsSelector 组件
**文件**: `components/workspace/findings-selector.tsx`

1. 更新接口（Line ~10）：
```typescript
interface FindingsSelectorProps {
  findings: Finding[];
  onSelect: (finding: Finding) => void;
  selectedFinding?: Finding;
  processedFindings?: Set<number>;  // NEW
  getProcessedCount?: (finding: Finding) => number;  // NEW
}
```

2. 添加导入：
```typescript
import { CheckCircle2 } from 'lucide-react';
```

3. 更新渲染逻辑（在 map 函数中）：
```typescript
{findings.map((finding, index) => {
  const isSelected = selectedFinding?.description === finding.description;
  const isProcessed = processedFindings?.has(index) || false;
  const processedCount = getProcessedCount?.(finding) || 0;

  return (
    <div
      key={index}
      onClick={() => onSelect(finding)}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all",
        isSelected && "ring-2 ring-blue-500 bg-blue-50/50",
        isProcessed && !isSelected && "opacity-60 bg-gray-50",
        !isSelected && !isProcessed && "hover:bg-accent"
      )}
    >
      {/* 徽章行 */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={getSeverityVariant(finding.severity)}>
          {finding.severity}
        </Badge>
        <Badge variant="outline">{finding.type}</Badge>
        {isProcessed && (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            已处理 {processedCount > 1 && `(${processedCount}次)`}
          </Badge>
        )}
        {isSelected && (
          <Badge className="bg-blue-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            已选择
          </Badge>
        )}
      </div>

      {/* 描述 */}
      <p className={cn(
        "text-sm",
        isSelected ? "text-blue-900 font-medium" : "text-gray-900",
        isProcessed && !isSelected && "text-gray-600"
      )}>
        {finding.description}
      </p>
    </div>
  );
})}
```

#### Step 3: 更新迭代页面调用
**文件**: `app/iteration/[projectId]/page.tsx` (Line 428-432)

```typescript
<FindingsSelector
  findings={transformDiagnosticFindings(diagnosticReport?.findings || [])}
  onSelect={handleFindingSelect}
  selectedFinding={selectedFinding || undefined}
  processedFindings={new Set(
    diagnosticReport?.findings
      .map((f, idx) => isFindingProcessed(transformDiagnosticFindings([f])[0]) ? idx : -1)
      .filter(idx => idx !== -1) || []
  )}
  getProcessedCount={(finding) => getProcessedCount(finding)}
/>
```

#### Step 4: 测试
```bash
npm run typecheck
npm run build
```

#### Step 5: 手动测试
1. 执行一个决策
2. 返回 findings 列表
3. 验证已处理的 finding 有"✓ 已处理"徽章
4. 验证透明度降低

**✅ 预期**: 已处理的 findings 有视觉标记

---

## 🧪 完整测试流程

### 快速测试（5分钟）
```bash
# 1. TypeScript 编译
npm run typecheck

# 2. 生产构建
npm run build

# 3. 启动开发服务器
npm run dev
```

### 手动测试（15分钟）
参考 [测试检查清单](./ACT2_WORKFLOW_TEST_CHECKLIST.md)

关键测试点：
1. ✅ Workflow Status 更新
2. ✅ 决策历史可查看
3. ✅ Findings 已处理标记

---

## 📦 Git 提交

### 提交步骤
```bash
# 查看修改
git status

# 添加修改的文件
git add \
  app/api/v1/iteration/execute/route.ts \
  app/iteration/[projectId]/page.tsx \
  components/workspace/decision-card.tsx \
  components/workspace/findings-selector.tsx \
  lib/db/services/project.service.ts \
  docs/fixes/

# 创建 commit
git commit -m "$(cat <<'EOF'
fix: resolve ACT2 workflow issues and enhance UX

**Critical Fixes:**
- Fix workflow status not updating (ACT1_COMPLETE → ITERATING)
- Fix decision history showing JSON snippets

**New Features:**
- DecisionCard component with expand/collapse
- Findings processed marking with badges
- Act-specific decision content display

**Improvements:**
- Visual feedback for processed findings
- Better decision history UX
- Workflow status synchronization

**Files Changed:**
- app/api/v1/iteration/execute/route.ts: Add status update
- app/iteration/[projectId]/page.tsx: Add helpers, integrate DecisionCard
- components/workspace/decision-card.tsx: NEW component
- components/workspace/findings-selector.tsx: Add processed marking
- lib/db/services/project.service.ts: Add updateWorkflowStatus
- docs/fixes/: Add fix plan and test checklist

**Testing:**
✅ TypeScript compilation passed
✅ Production build successful
✅ Manual testing verified

Related: Epic 005 - Interactive Workflow UX enhancement

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 推送到远程
```bash
# 推送（需要您手动执行，需要 SSH 认证）
git push origin feature/epic-1-rag-poc
```

---

## ✅ 完成检查清单

### 阶段1完成检查
- [ ] projectService.updateWorkflowStatus 方法已添加
- [ ] execute API 已修改，添加状态更新
- [ ] 前端 handleExecute 已添加 loadProjectData
- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] 手动测试状态更新成功

### 阶段2完成检查
- [ ] DecisionCard 组件已创建
- [ ] 迭代页面已集成 DecisionCard
- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] 决策历史可查看，可展开
- [ ] ACT2 决策显示正确

### 阶段3完成检查
- [ ] 匹配逻辑已添加
- [ ] FindingsSelector 已更新
- [ ] 迭代页面已传递 props
- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] 已处理 findings 有标记

### 最终检查
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] Git commit 已创建
- [ ] 准备推送到 Vercel

---

## 🐛 常见问题

### Q1: TypeScript 错误 "Property 'updateWorkflowStatus' does not exist"
**A**: 确保在 projectService 中添加了 updateWorkflowStatus 方法，并且导出了该方法。

### Q2: 决策历史显示空白
**A**: 检查 decisions 数据是否正确加载，查看 Console 是否有错误。

### Q3: Findings 标记不准确
**A**: 调整匹配逻辑，可能需要使用更精确的匹配算法（如编辑距离）。

### Q4: 构建失败
**A**: 运行 `npm run typecheck` 检查类型错误，确保所有导入正确。

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 [修复计划](./ACT2_WORKFLOW_FIX_PLAN.md) 详细设计
2. 查看 [测试检查清单](./ACT2_WORKFLOW_TEST_CHECKLIST.md) 详细测试步骤
3. 查看 Console 错误日志
4. 回滚到上一个 commit（如果需要）

---

**最后更新**: 2025-10-10
**文档版本**: v1.0

# Act 完成逻辑设计方案

## 当前问题

1. **没有 Act 完成状态跟踪**
   - `completedActs={[]}` 始终为空
   - 用户不知道何时进入下一个 Act
   - 没有完成的视觉反馈

2. **工作流状态机缺失 Act 2-5 细分状态**
   - 只有 `ITERATING` 一个状态覆盖所有 Act
   - 无法区分当前在哪个 Act

## 解决方案对比

### 方案 A: 自动完成（推荐 ⭐）

**触发条件**：每个 Act 至少完成 1 个已执行的决策

**优点**：
- ✅ 实现简单
- ✅ 自动化，无需用户操作
- ✅ 明确的完成标准

**缺点**：
- ⚠️ 可能用户觉得 1 个决策不够

**实现**：
```typescript
const getCompletedActs = (decisions: any[]): ActType[] => {
  const actDecisions = {
    ACT2_CHARACTER: 0,
    ACT3_WORLDBUILDING: 0,
    ACT4_PACING: 0,
    ACT5_THEME: 0
  };

  // 统计每个 Act 的已执行决策数
  decisions.forEach(d => {
    if (d.userChoice && d.generatedChanges) {
      actDecisions[d.act]++;
    }
  });

  // 至少 1 个决策即完成
  return Object.keys(actDecisions)
    .filter(act => actDecisions[act] > 0) as ActType[];
};

// 使用
const completedActs = getCompletedActs(decisions);
```

---

### 方案 B: 手动完成

**触发条件**：用户点击"完成 Act X"按钮

**优点**：
- ✅ 用户有明确的控制权
- ✅ 符合传统工作流习惯

**缺点**：
- ⚠️ 需要额外的 UI 和状态管理
- ⚠️ 需要在数据库中存储完成状态
- ⚠️ 用户可能忘记点击

**实现**：
1. 添加数据库字段（需要迁移）：
```prisma
model Project {
  // ...
  completedActs Json? @default("[]")  // ["ACT2_CHARACTER", "ACT3_WORLDBUILDING"]
}
```

2. 添加 UI 按钮：
```tsx
<Button onClick={() => markActComplete(currentAct)}>
  <CheckCircle2 className="mr-2 h-4 w-4" />
  完成 {actMeta.shortLabel}
</Button>
```

3. 实现 API：
```typescript
// POST /api/v1/projects/:id/complete-act
await projectService.update(projectId, {
  completedActs: [...existingCompletedActs, currentAct]
});
```

---

### 方案 C: 混合模式（最佳但复杂）

**触发条件**：
- 有决策 → "进行中"（黄色）
- 用户确认 → "已完成"（绿色）

**优点**：
- ✅ 最灵活
- ✅ 清晰的状态区分
- ✅ 用户可以重新编辑

**缺点**：
- ⚠️ 实现复杂
- ⚠️ 需要 3 种状态：未开始、进行中、已完成

**实现**：
```typescript
type ActProgressStatus = 'not_started' | 'in_progress' | 'completed';

const getActStatus = (act: ActType, decisions: any[], confirmedActs: ActType[]) => {
  const actDecisions = decisions.filter(d => d.act === act && d.userChoice);

  if (confirmedActs.includes(act)) return 'completed';
  if (actDecisions.length > 0) return 'in_progress';
  return 'not_started';
};
```

---

## 推荐实现：方案 A（快速修复）

### 修改文件：`app/iteration/[projectId]/page.tsx`

```typescript
// 1. 添加辅助函数
const getCompletedActs = (decisions: any[]): ActType[] => {
  const actDecisions: Record<string, number> = {
    ACT2_CHARACTER: 0,
    ACT3_WORLDBUILDING: 0,
    ACT4_PACING: 0,
    ACT5_THEME: 0
  };

  decisions.forEach(d => {
    if (d.userChoice && d.generatedChanges) {
      actDecisions[d.act] = (actDecisions[d.act] || 0) + 1;
    }
  });

  return Object.keys(actDecisions)
    .filter(act => actDecisions[act] > 0) as ActType[];
};

// 2. 在组件中使用
const completedActs = getCompletedActs(decisions);

// 3. 传递给 ActProgressBar
<ActProgressBar
  currentAct={currentAct}
  completedActs={completedActs}  // ✅ 动态计算
  onActClick={(act: WorkspaceActType) => {
    setCurrentAct(act as ActType);
    // ...
  }}
/>
```

### 效果

- ✅ Act 2 完成 1 个决策后显示绿色勾选
- ✅ 可以点击切换回已完成的 Act
- ✅ 未完成的 Act 显示灰色不可点击
- ✅ 当前 Act 显示蓝色"进行中"

---

## 后续改进建议

### 短期（1-2 天）
1. ✅ 实现方案 A（自动完成）
2. 添加 Act 切换时的确认对话框（防止误操作）
3. 在"决策历史"标签中按 Act 分组显示

### 中期（1 周）
1. 添加每个 Act 的最小决策数建议（如 Act 2 建议至少 3 个决策）
2. 在 UI 上显示每个 Act 的完成进度（如 "Act 2: 3/3 建议决策"）

### 长期（2 周+）
1. 实现方案 C（混合模式）
2. 添加"Act 质量评估"（AI 分析当前 Act 的完成度）
3. 提供"一键优化"按钮（自动选择最佳决策）

---

## 需要你决定

我可以立即帮你实现**方案 A**（5分钟修复），还是你希望：
1. 先讨论设计
2. 实现更复杂的方案 B 或 C
3. 其他自定义需求

告诉我你的选择！🚀

# Act 渐进式解锁机制

**日期**: 2025-10-10
**功能**: 迭代工作流中的 Act 切换机制
**状态**: ✅ 已实现

---

## 🎯 问题背景

### 用户反馈的问题
在旧的实现中，用户在 ACT2 完成所有决策后，无法找到进入 ACT3 的入口或按钮，导致工作流程中断，用户体验不佳。

### 根本原因
1. **ActProgressBar 组件限制**：只允许点击 `completed`（已完成）或 `current`（进行中）状态的 Act
2. **ACT3 显示为 `upcoming`**：因为还没有执行过任何决策，所以被标记为"未开始"
3. **无法点击**：`upcoming` 状态的 Act 不可点击，用户被卡住

---

## ✨ 解决方案：渐进式解锁机制

### 核心理念
- **不强制完成所有问题**：用户不需要处理当前 Act 的所有问题才能进入下一个 Act
- **至少完成一个即可解锁**：完成当前 Act 的任意 1 个决策后，自动解锁下一个 Act
- **清晰的视觉反馈**：通过颜色、图标、徽章区分不同状态
- **明确的用户引导**：完成决策后主动提示下一个 Act 已解锁

### 解锁规则

| Act | 解锁条件 | 说明 |
|-----|---------|------|
| **ACT2** | 总是解锁 | 作为迭代流程的起点，始终可访问 |
| **ACT3** | ACT2 完成 ≥1 个决策 | 在 ACT2 中执行任意一个方案后解锁 |
| **ACT4** | ACT3 完成 ≥1 个决策 | 在 ACT3 中执行任意一个方案后解锁 |
| **ACT5** | ACT4 完成 ≥1 个决策 | 在 ACT4 中执行任意一个方案后解锁 |

**示例流程**：
```
1. 用户上传剧本 → 完成 ACT1 分析 → 进入迭代页面
2. 默认在 ACT2（总是解锁）
3. 在 ACT2 中选择一个问题 → 获取提案 → 执行方案 ✅
4. 🎉 ACT3 自动解锁！
5. 用户可以继续处理 ACT2 的其他问题，或点击进度条切换到 ACT3
6. 在 ACT3 中执行方案 → ACT4 解锁
7. 以此类推...
```

---

## 🎨 视觉状态设计

### 状态类型

| 状态 | 颜色 | 图标 | 徽章 | 是否可点击 |
|------|------|------|------|----------|
| **已完成** (Completed) | 绿色 | ✓ CheckCircle | "已完成" | ✅ 是 |
| **进行中** (Current) | 蓝色 | ▶ PlayCircle | "进行中" | ✅ 是 |
| **已解锁** (Unlocked) | 琥珀色 | ○ Circle | "已解锁" | ✅ 是 |
| **未解锁** (Locked) | 灰色（半透明） | ○ Circle | 无 | ❌ 否 |

### 交互反馈
- **可点击的 Act**：
  - 鼠标悬停时有缩放动画 (`hover:scale-105`)
  - 光标变为 `pointer`
  - 透明度变化提示交互性

- **不可点击的 Act**：
  - 透明度降低到 60% (`opacity-60`)
  - 光标变为 `not-allowed`
  - 无交互动画

### 完成提示
当用户完成一个决策后，如果解锁了新的 Act，会显示：

```
┌─────────────────────────────────────────┐
│ ✓ 本次迭代已完成！决策已保存到数据库。   │
│ ───────────────────────────────────────  │
│ 🎉 恭喜！Act 3 - 世界观审查 已解锁       │
│ 点击上方进度条中的"Act 3 - 世界观审查"   │
│ 可以切换到下一个阶段                     │
└─────────────────────────────────────────┘
```

---

## 💻 技术实现

### 1. ActProgressBar 组件增强

**新增属性**：
```typescript
export interface ActProgressBarProps {
  currentAct: ActType;
  completedActs: ActType[];      // 已完成的 Acts
  unlockedActs?: ActType[];      // 已解锁但未完成的 Acts (NEW)
  onActClick?: (act: ActType) => void;
  compact?: boolean;
}
```

**可点击逻辑**：
```typescript
const isUnlocked = unlockedActs.includes(act);
const isClickable = onActClick && (status !== 'upcoming' || isUnlocked);
```

### 2. 解锁逻辑实现

**iteration page 新增函数**：
```typescript
const getUnlockedActs = (): ActType[] => {
  const unlocked: ActType[] = ['ACT2_CHARACTER']; // ACT2 总是解锁

  const actDecisions: Record<ActType, number> = {
    ACT2_CHARACTER: 0,
    ACT3_WORLDBUILDING: 0,
    ACT4_PACING: 0,
    ACT5_THEME: 0
  };

  // 统计每个 Act 的已执行决策数
  decisions.forEach(decision => {
    if (decision.userChoice && decision.generatedChanges) {
      actDecisions[decision.act as ActType] += 1;
    }
  });

  // 渐进式解锁
  if (actDecisions.ACT2_CHARACTER > 0) unlocked.push('ACT3_WORLDBUILDING');
  if (actDecisions.ACT3_WORLDBUILDING > 0) unlocked.push('ACT4_PACING');
  if (actDecisions.ACT4_PACING > 0) unlocked.push('ACT5_THEME');

  return unlocked;
};
```

### 3. 组件调用

```typescript
<ActProgressBar
  currentAct={currentAct}
  completedActs={getCompletedActs()}
  unlockedActs={getUnlockedActs()}  // 传入解锁状态
  onActClick={(act) => {
    setCurrentAct(act);
    // 重置工作流状态
  }}
/>
```

---

## 📊 用户体验流程图

```
┌─────────────┐
│  ACT1 完成  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  进入迭代页面 (默认 ACT2)           │
│  状态：ACT2 进行中 (蓝色)           │
│       ACT3-5 未解锁 (灰色半透明)    │
└──────┬──────────────────────────────┘
       │
       ▼ 用户选择问题 → 获取提案 → 执行方案
       │
┌──────▼──────────────────────────────┐
│  ACT2 首次决策完成                  │
│  🎉 ACT3 自动解锁！                 │
│  状态：ACT2 已完成 (绿色)           │
│       ACT3 已解锁 (琥珀色) ← 可点击 │
│       ACT4-5 未解锁 (灰色)          │
└──────┬──────────────────────────────┘
       │
       ▼ 用户可以选择：
       │
    ┌──┴──┐
    │     │
    ▼     ▼
继续 ACT2  切换到 ACT3
    │     │
    │     ▼ 在 ACT3 执行决策
    │     │
    │     ▼ ACT4 解锁
    │     │
    └─────┴─→ 继续流程...
```

---

## ✅ 验证测试

### 手动测试步骤

1. **初始状态验证**：
   ```bash
   npm run dev
   # 访问 http://localhost:3001/iteration/{projectId}
   ```
   - ✅ ACT2 显示为蓝色"进行中"，可点击
   - ✅ ACT3-5 显示为灰色半透明，不可点击
   - ✅ 鼠标悬停 ACT2 有缩放动画

2. **首次决策验证**：
   - 在 ACT2 中选择一个问题
   - 获取 AI 提案
   - 执行一个方案
   - ✅ 完成后显示"🎉 恭喜！Act 3 已解锁"提示
   - ✅ ACT2 变为绿色"已完成"
   - ✅ ACT3 变为琥珀色"已解锁"，可点击

3. **切换验证**：
   - 点击进度条中的 ACT3
   - ✅ 页面切换到 ACT3，显示 ACT3 的问题列表
   - ✅ 工作流状态正确重置
   - ✅ ACT3 变为蓝色"进行中"

4. **连续解锁验证**：
   - 在 ACT3 中执行决策 → ACT4 解锁
   - 在 ACT4 中执行决策 → ACT5 解锁
   - ✅ 所有 Act 按顺序正确解锁

---

## 🔄 业务流程对比

### 旧流程 (问题所在)
```
ACT2 → [用户卡住] → ❌ 无法进入 ACT3
```

### 新流程 (已修复)
```
ACT2 (完成1个决策) → 🎉 ACT3 解锁 → 点击切换 → ACT3 → ACT4 → ACT5
```

---

## 📝 开发建议

### 扩展性考虑

如果未来需要调整解锁规则，可以修改 `getUnlockedActs()` 函数：

**示例 1：允许跳过 Acts**
```typescript
// 如果 ACT2 完成，同时解锁 ACT3 和 ACT4
if (actDecisions.ACT2_CHARACTER > 0) {
  unlocked.push('ACT3_WORLDBUILDING', 'ACT4_PACING');
}
```

**示例 2：要求完成多个决策**
```typescript
// 要求 ACT2 完成至少 3 个决策才解锁 ACT3
if (actDecisions.ACT2_CHARACTER >= 3) {
  unlocked.push('ACT3_WORLDBUILDING');
}
```

**示例 3：完全自由切换**
```typescript
// 所有 Acts 始终解锁
const getUnlockedActs = (): ActType[] => {
  return ['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME'];
};
```

---

## 🎓 关键学习点

1. **UX 优先**：业务流程设计要以用户体验为中心，避免让用户"卡住"
2. **渐进式引导**：既要引导用户按流程操作，又要给予灵活性
3. **清晰反馈**：通过视觉状态、动画、文字提示让用户明确知道可以做什么
4. **可扩展设计**：解锁逻辑独立封装，易于调整规则

---

**创建日期**: 2025-10-10
**实现者**: Claude Code AI Assistant
**状态**: ✅ 已实现并通过验证
**相关文件**:
- `components/workspace/act-progress-bar.tsx`
- `app/iteration/[projectId]/page.tsx`

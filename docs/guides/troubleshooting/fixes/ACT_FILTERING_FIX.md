# Act 切换时 Findings 过滤修复

**日期**: 2025-10-10
**问题**: 切换到 ACT3 后依然显示 ACT2 的所有内容
**状态**: ✅ 已修复

---

## 🐛 问题描述

### 用户反馈

> "504的问题已经解决了，我也可以切入到 Act3 的阶段，但是我切入到 act3之后，依然显示的是Act2的迭代工作流和决策历史页面"

### 实际问题

用户在切换到 ACT3 时，发现：
1. ✅ Act Progress Bar 切换成功（ACT3 高亮显示）
2. ✅ 页面标题更新为 "Act 3 - 世界观审查"
3. ❌ **但是 Findings 列表仍然显示所有 ACT1 的诊断结果**（包括 character, timeline, scene, plot, dialogue 5 种类型）
4. ❓ 决策历史显示所有 Acts 的历史（这是正确的行为）

### 根本原因

查看代码发现：
```typescript
// app/iteration/[projectId]/page.tsx:255
<FindingsSelector
  findings={transformDiagnosticFindings(diagnosticReport?.findings || [])}
  // ❌ 这里传入了所有 ACT1 的 findings，没有根据 currentAct 过滤
  ...
/>
```

**问题**: 没有根据 `currentAct` 状态过滤 findings，导致所有 Acts 都显示相同的诊断列表。

---

## 🎯 正确的业务逻辑

### 各 Act 的关注焦点

每个 Act 应该只关注 ACT1 诊断中**特定类型**的问题：

| Act | 关注焦点 | 应显示的 Finding 类型 | 业务理由 |
|-----|---------|---------------------|---------|
| **ACT2<br/>角色弧光** | 角色行为矛盾和发展弧线 | `character` | 专注修复角色一致性问题 |
| **ACT3<br/>世界观** | 设定逻辑和情节连贯性 | `scene`, `plot` | 审查世界观设定和故事逻辑 |
| **ACT4<br/>节奏** | 时间线和情节节奏 | `timeline` | 优化时间分配和节奏控制 |
| **ACT5<br/>主题** | 角色深度和主题表达 | `character`, `dialogue` | 深化角色内核和主题对话 |

### 为什么这样设计？

1. **聚焦性**: 每个 Act 专注解决一类问题，避免用户被无关问题干扰
2. **渐进式**: 从角色 → 世界观 → 节奏 → 主题，逐步深化剧本质量
3. **效率**: 用户不需要在每个 Act 中翻看所有 5 种类型的问题
4. **专业性**: 符合剧本创作的分层优化逻辑

---

## ✅ 实现方案

### 1. 添加过滤函数

```typescript
// Filter findings by current Act (each Act focuses on specific finding types)
const filterFindingsByAct = (findings: Finding[], act: ActType): Finding[] => {
  const actFindingTypeMap: Record<ActType, Finding['type'][]> = {
    ACT2_CHARACTER: ['character'],  // Focus on character contradictions
    ACT3_WORLDBUILDING: ['scene', 'plot'],  // Focus on worldbuilding and setting logic
    ACT4_PACING: ['timeline'],  // Focus on pacing and rhythm
    ACT5_THEME: ['character', 'dialogue']  // Focus on character depth and thematic dialogue
  };

  const allowedTypes = actFindingTypeMap[act];
  return findings.filter(f => allowedTypes.includes(f.type));
};
```

**关键设计**:
- 使用 `Record` 类型确保类型安全
- 清晰的注释说明每个 Act 的关注点
- 简单的 `filter` 逻辑，易于维护

### 2. 更新 FindingsSelector 使用过滤后的数据

```typescript
<CardContent>
  {(() => {
    // Transform and filter findings based on current Act
    const allFindings = transformDiagnosticFindings(diagnosticReport?.findings || []);
    const filteredFindings = filterFindingsByAct(allFindings, currentAct);

    // If no findings for this Act, show informative message
    if (filteredFindings.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">当前 Act 没有相关的诊断问题</p>
            <p className="text-sm text-muted-foreground">
              {currentAct === 'ACT2_CHARACTER' && 'ACT2 关注角色矛盾，但 ACT1 诊断中没有发现角色类型的问题。'}
              {currentAct === 'ACT3_WORLDBUILDING' && 'ACT3 关注世界观设定，但 ACT1 诊断中没有发现场景或情节类型的问题。'}
              {currentAct === 'ACT4_PACING' && 'ACT4 关注节奏优化，但 ACT1 诊断中没有发现时间线类型的问题。'}
              {currentAct === 'ACT5_THEME' && 'ACT5 关注主题深化，但 ACT1 诊断中没有发现角色或对话类型的问题。'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              您可以切换到其他 Act，或者直接进入合成阶段。
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <FindingsSelector
        findings={filteredFindings}
        onSelect={handleFindingSelect}
        selectedFinding={selectedFinding || undefined}
        processedFindings={new Set(
          filteredFindings
            .map((f, idx) => isFindingProcessed(f) ? idx : -1)
            .filter((idx: number) => idx !== -1)
        )}
        getProcessedCount={(finding) => getProcessedCount(finding)}
      />
    );
  })()}
</CardContent>
```

**关键改进**:
- ✅ 使用 IIFE 封装过滤逻辑
- ✅ 当没有相关 findings 时显示友好提示
- ✅ 提示信息根据 Act 动态调整
- ✅ 引导用户切换到其他 Act 或进入合成阶段

### 3. 更新 CardDescription 说明

```typescript
<CardDescription>
  {currentAct === 'ACT2_CHARACTER' && '从 ACT1 诊断中选择一个角色矛盾问题进行深度分析'}
  {currentAct === 'ACT3_WORLDBUILDING' && '从 ACT1 诊断中选择一个世界观设定或情节逻辑问题'}
  {currentAct === 'ACT4_PACING' && '从 ACT1 诊断中选择一个时间线或节奏问题进行优化'}
  {currentAct === 'ACT5_THEME' && '从 ACT1 诊断中选择一个角色或对话问题进行主题深化'}
</CardDescription>
```

**改进**:
- 明确说明当前 Act 的关注焦点
- 帮助用户理解为什么看到这些特定类型的问题

---

## 📊 修改前后对比

### 修改前 (错误行为)

**场景**: 用户切换到 ACT3

| 显示内容 | 实际行为 | 预期行为 | 问题 |
|---------|---------|---------|------|
| Act Progress Bar | ✅ ACT3 高亮 | ✅ ACT3 高亮 | 正确 |
| 页面标题 | ✅ "Act 3 - 世界观审查" | ✅ "Act 3 - 世界观审查" | 正确 |
| Findings 列表 | ❌ 显示所有 5 种类型 | ✅ 只显示 scene, plot | **错误** |
| 决策历史 | ✅ 显示所有 Acts | ✅ 显示所有 Acts | 正确 |

**用户困惑**:
- "为什么 ACT3 还显示角色问题？"
- "为什么 ACT3 还显示时间线问题？"
- "这些问题不是应该在 ACT2/ACT4 处理吗？"

### 修改后 (正确行为)

**场景**: 用户切换到 ACT3

| 显示内容 | 实际行为 | 用户体验 |
|---------|---------|---------|
| Act Progress Bar | ✅ ACT3 高亮 | 清晰的当前位置 |
| 页面标题 | ✅ "Act 3 - 世界观审查" | 明确的任务目标 |
| 说明文字 | ✅ "从 ACT1 诊断中选择一个世界观设定或情节逻辑问题" | 清楚理解关注点 |
| Findings 列表 | ✅ **只显示** `scene` 和 `plot` 类型 | 聚焦相关问题 |
| 空状态提示 | ✅ "ACT3 关注世界观设定，但 ACT1 诊断中没有发现..." | 友好的引导 |
| 决策历史 | ✅ 显示所有 Acts，带 Act 标签 | 完整的历史记录 |

---

## 🧪 测试验证

### 测试场景 1: ACT2 → ACT3 切换

**操作步骤**:
1. 完成 ACT1 分析（假设有 character, scene, timeline, plot 4 种 findings）
2. 进入 ACT2 迭代页面
3. 观察显示的 findings
4. 点击 ActProgressBar 切换到 ACT3
5. 观察显示的 findings

**预期结果**:
- ACT2: 只显示 `character` 类型的 findings
- ACT3: 只显示 `scene` 和 `plot` 类型的 findings
- 切换时选中的 finding 被清空
- workflowStep 重置为 'select_focus'

### 测试场景 2: 某个 Act 没有相关 findings

**操作步骤**:
1. 假设 ACT1 只检测到 character 类型的问题
2. 切换到 ACT4 (关注 timeline 类型)

**预期结果**:
- 显示 Alert 提示："ACT4 关注节奏优化，但 ACT1 诊断中没有发现时间线类型的问题。"
- 提示用户可以切换到其他 Act 或进入合成阶段
- 不显示 FindingsSelector 组件

### 测试场景 3: 决策历史显示

**操作步骤**:
1. 在 ACT2 完成 1 个决策
2. 切换到 ACT3，完成 1 个决策
3. 点击"决策历史"标签

**预期结果**:
- 显示 2 条决策记录
- 每条记录都有 Act 标签（"Act 2 - 角色弧光", "Act 3 - 世界观"）
- DecisionCard 组件正确显示各 Act 的变更内容

---

## 📝 代码修改汇总

| 文件 | 修改类型 | 行数变化 |
|------|---------|---------|
| `app/iteration/[projectId]/page.tsx` | 功能增强 | +57, -14 |
| **总计** | - | **+43 行** |

**修改内容**:
- 新增 `filterFindingsByAct()` 函数（12 行）
- 更新 FindingsSelector 使用过滤逻辑（40 行）
- 更新 CardDescription 说明文字（5 行）

---

## 🎯 业务影响

### 用户体验改进

**改进前**:
- 😕 用户困惑为什么每个 Act 都显示相同的问题列表
- 😕 用户需要自己识别哪些问题适合当前 Act
- 😕 翻看大量无关问题浪费时间

**改进后**:
- 😊 每个 Act 只显示相关类型的问题，聚焦性强
- 😊 清晰的说明文字引导用户理解 Act 焦点
- 😊 空状态时有友好提示，不会迷失
- 😊 决策历史完整记录，便于回顾

### 符合专业剧本创作流程

这个修复使系统更贴近专业剧本创作的分层优化流程：

1. **ACT2 - 角色塑造**: 先解决角色一致性和弧线问题
2. **ACT3 - 世界观构建**: 确保设定逻辑和故事结构合理
3. **ACT4 - 节奏优化**: 调整时间分配和情节密度
4. **ACT5 - 主题深化**: 最后强化角色内核和主题表达

---

## 🚀 后续优化建议

### 1. 添加 Finding 类型统计

在 ActProgressBar 上显示每个 Act 有多少相关问题：

```typescript
<ActProgressBar
  currentAct={currentAct}
  completedActs={getCompletedActs()}
  unlockedActs={getUnlockedActs()}
  actFindingCounts={{  // NEW
    ACT2_CHARACTER: 5,
    ACT3_WORLDBUILDING: 3,
    ACT4_PACING: 2,
    ACT5_THEME: 4
  }}
  onActClick={...}
/>
```

### 2. 优化空状态提示

当某个 Act 没有相关 findings 时，提供更具体的建议：

```typescript
{filteredFindings.length === 0 && (
  <Alert>
    <AlertDescription>
      <p>当前 Act 没有相关问题需要处理。</p>
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium">建议操作：</p>
        <Button onClick={() => switchToNextAvailableAct()}>
          切换到 {getNextAvailableAct()}
        </Button>
        <Button variant="outline" onClick={() => goToSynthesis()}>
          直接进入合成阶段
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

### 3. 智能推荐下一个 Act

基于已完成的决策和剩余问题，智能推荐用户下一步应该处理哪个 Act。

---

## 📖 相关文档

- **Iteration Page**: `app/iteration/[projectId]/page.tsx`
- **FindingsSelector**: `components/workspace/findings-selector.tsx`
- **DecisionCard**: `components/workspace/decision-card.tsx`
- **Epic 文档**: `docs/epics/epic-005-interactive-workflow-core/README.md`

---

**创建日期**: 2025-10-10
**修复者**: Claude Code AI Assistant
**状态**: ✅ 已修复并提交
**用户反馈**: 待验证

---

## ✨ 总结

通过添加 `filterFindingsByAct()` 函数，我们成功解决了 Act 切换时显示内容不正确的问题：

1. ✅ 每个 Act 现在只显示相关类型的 findings
2. ✅ 清晰的说明文字帮助用户理解 Act 焦点
3. ✅ 空状态时有友好的提示和引导
4. ✅ 决策历史正确显示所有 Acts 的记录
5. ✅ 符合专业剧本创作的分层优化逻辑

**用户现在可以清晰地理解每个 Act 的关注焦点，聚焦解决相关问题，提高迭代效率。**

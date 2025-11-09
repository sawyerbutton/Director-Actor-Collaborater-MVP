# ACT2 工作流修复 - 测试检查清单

**日期**: 2025-10-10
**修复版本**: v1.1.0
**关联文档**: [ACT2_WORKFLOW_FIX_PLAN.md](./ACT2_WORKFLOW_FIX_PLAN.md)

---

## 🔍 测试前准备

### 环境准备
- [ ] 本地开发环境运行中 (`npm run dev`)
- [ ] PostgreSQL 数据库连接正常
- [ ] DeepSeek API key 已配置
- [ ] 浏览器开发者工具已打开
- [ ] 测试数据已准备（测试剧本）

### 数据准备
```bash
# 确保有测试数据
npx prisma db seed

# 或手动创建测试项目
# 1. 访问 /dashboard
# 2. 上传测试剧本（500-1000行）
# 3. 等待 Act 1 分析完成
```

---

## 📋 阶段1: Workflow Status 更新测试

### 测试1.1: 首次执行决策 - 状态转换
**前置条件**: 项目状态为 `ACT1_COMPLETE`

**测试步骤**:
1. [ ] 访问 `/iteration/{projectId}`
2. [ ] 确认页面右上角显示 `ACT1_COMPLETE`
3. [ ] 选择一个角色矛盾 finding
4. [ ] 点击"获取AI解决方案提案"
5. [ ] 等待AI生成提案（10-30秒）
6. [ ] 选择一个提案，点击"应用此方案"
7. [ ] 等待执行完成

**预期结果**:
- [ ] 页面右上角徽章从 `ACT1_COMPLETE` 变为 `ITERATING`
- [ ] 无 JavaScript 错误（检查 Console）
- [ ] 显示"✓ 本次迭代已完成！决策已保存到数据库"

**数据库验证**:
```sql
SELECT id, title, workflowStatus FROM "Project" WHERE id = '<projectId>';
-- Expected: workflowStatus = 'ITERATING'
```

---

### 测试1.2: 后续执行决策 - 状态保持
**前置条件**: 项目状态为 `ITERATING`（执行测试1.1后）

**测试步骤**:
1. [ ] 点击"继续下一个问题"
2. [ ] 选择另一个 finding
3. [ ] 获取提案并执行
4. [ ] 刷新页面

**预期结果**:
- [ ] 页面右上角徽章保持 `ITERATING`
- [ ] 刷新后状态仍为 `ITERATING`

**数据库验证**:
```sql
SELECT id, workflowStatus FROM "Project" WHERE id = '<projectId>';
-- Expected: workflowStatus = 'ITERATING'
```

---

### 测试1.3: 边界情况测试

#### Case 1: 直接进入 ITERATING 状态的项目
**前置条件**: 手动将项目状态设为 `ITERATING`

```sql
UPDATE "Project" SET "workflowStatus" = 'ITERATING' WHERE id = '<projectId>';
```

**测试步骤**:
1. [ ] 执行一个决策

**预期结果**:
- [ ] 状态保持 `ITERATING`（不重复更新）
- [ ] 无 SQL 错误

#### Case 2: 并发执行决策
**测试步骤**:
1. [ ] 在两个浏览器标签同时打开同一项目
2. [ ] 同时执行决策

**预期结果**:
- [ ] 两个决策都成功执行
- [ ] 状态最终为 `ITERATING`
- [ ] 无数据竞争错误

---

## 📋 阶段2: 决策历史显示测试

### 测试2.1: DecisionCard 基础功能

**测试步骤**:
1. [ ] 执行1-2个决策（使用测试1的流程）
2. [ ] 切换到"决策历史"标签
3. [ ] 验证决策卡片显示

**预期结果**:
- [ ] 显示所有已执行的决策
- [ ] 每个决策卡片包含：
  - [ ] Act 类型徽章（如"Act 2 - 角色弧光"）
  - [ ] 焦点名称
  - [ ] "✓ 已执行"徽章
  - [ ] 创建时间（本地化格式）
  - [ ] "查看详情"按钮

---

### 测试2.2: 展开/折叠功能

**测试步骤**:
1. [ ] 点击"查看详情"按钮

**预期结果**:
- [ ] 卡片展开，显示生成的修改内容
- [ ] 按钮文字变为"收起"
- [ ] 展开动画流畅

**再次点击**:
- [ ] 卡片收起
- [ ] 按钮文字变回"查看详情"

---

### 测试2.3: ACT2 决策显示

**前置条件**: 有至少1个 ACT2 已执行决策

**测试步骤**:
1. [ ] 展开 ACT2 决策卡片

**预期结果**:
- [ ] 显示"戏剧化动作:"标题
- [ ] 列出前3个动作（sceneNumber + action）
- [ ] 如果超过3个，显示"+ N 个更多动作"
- [ ] 显示"整体弧线:"（如果有）
- [ ] 文本不超出容器（overflow 正确处理）

**数据格式验证**:
```typescript
// generatedChanges 应该是：
{
  dramaticActions: [
    { sceneNumber: 1, action: "..." },
    // ...
  ],
  overallArc: "...",
  integrationNotes: "..."
}
```

---

### 测试2.4: ACT3/4/5 决策显示

**测试步骤**:
1. [ ] 切换到 ACT3，执行一个决策
2. [ ] 查看决策历史，展开 ACT3 决策

**预期结果 (ACT3)**:
- [ ] 显示"核心建议:"
- [ ] 内容截断到100字符 + "..."

**预期结果 (ACT4)**:
- [ ] 显示"预期改进:"
- [ ] 内容格式正确

**预期结果 (ACT5)**:
- [ ] 显示"角色核心:"
- [ ] 显示核心恐惧列表

---

### 测试2.5: 响应式设计测试

**测试步骤**:
1. [ ] 调整浏览器窗口大小（Desktop → Tablet → Mobile）
2. [ ] 检查决策卡片在不同屏幕尺寸下的显示

**预期结果**:
- [ ] Desktop (>1024px): 卡片宽度适中，排列合理
- [ ] Tablet (768-1024px): 卡片自适应宽度
- [ ] Mobile (<768px): 卡片堆叠显示，文字不换行溢出

---

## 📋 阶段3: Findings 标记测试

### 测试3.1: 已处理标记显示

**前置条件**: 有至少1个已执行决策

**测试步骤**:
1. [ ] 返回"迭代工作流"标签
2. [ ] 点击"继续下一个问题"（或刷新页面）
3. [ ] 查看 findings 列表

**预期结果**:
- [ ] 之前处理过的 finding 显示"✓ 已处理"徽章
- [ ] 已处理 finding 的透明度降低（opacity-60）
- [ ] 未处理 finding 保持正常显示
- [ ] 已处理 finding 仍可点击选择

---

### 测试3.2: 多次处理显示

**测试步骤**:
1. [ ] 选择一个已处理的 finding
2. [ ] 再次执行决策
3. [ ] 返回 findings 列表

**预期结果**:
- [ ] 徽章显示"✓ 已处理 (2次)"
- [ ] 数字随处理次数增加

---

### 测试3.3: 匹配准确性测试

**测试数据**:
创建3个相似但不同的 findings：
1. "角色 A 在场景1和场景2中行为矛盾"
2. "角色 A 在场景3中行为不一致"
3. "角色 B 在场景1中行为矛盾"

**测试步骤**:
1. [ ] 处理 finding 1
2. [ ] 检查 findings 列表

**预期结果**:
- [ ] 只有 finding 1 被标记为"已处理"
- [ ] finding 2 和 3 保持未处理状态
- [ ] 无误报（准确率 ≥95%）

---

### 测试3.4: 边界情况测试

#### Case 1: 空决策列表
**前置条件**: 新项目，无任何决策

**预期结果**:
- [ ] 所有 findings 都显示未处理
- [ ] 无 JavaScript 错误

#### Case 2: 已执行但无 generatedChanges
**测试步骤**:
1. [ ] 在数据库中手动将某个决策的 generatedChanges 设为 null

```sql
UPDATE "RevisionDecision"
SET "generatedChanges" = null
WHERE id = '<decisionId>';
```

**预期结果**:
- [ ] 对应的 finding 不被标记为"已处理"
- [ ] 其他 findings 标记正常

---

## 🧪 单元测试执行

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/integration/iteration-api-route-handlers.test.ts

# 运行 DecisionCard 组件测试（创建后）
npm test -- tests/unit/decision-card.test.tsx
```

**预期结果**:
- [ ] 所有测试通过（0 failed）
- [ ] 覆盖率 ≥80%
- [ ] 无 console.error 或 console.warn

---

## 🏗️ 构建测试

### TypeScript 编译
```bash
npm run typecheck
```

**预期结果**:
- [ ] 无类型错误
- [ ] 构建时间 <30秒

---

### 生产构建
```bash
npm run build
```

**预期结果**:
- [ ] 构建成功（无错误）
- [ ] 包大小增加 <10KB
- [ ] 所有页面静态生成或服务端渲染成功
- [ ] 构建时间 <2分钟

**检查输出**:
```
Route (app)                              Size     First Load JS
...
├ ƒ /iteration/[projectId]               XX kB         XXX kB
...
```

---

## 🌐 E2E 测试（可选）

### 完整工作流测试

**测试步骤**:
1. [ ] 启动开发服务器：`npm run dev`
2. [ ] 启动 E2E 测试：`npm run test:e2e:headed`
3. [ ] 执行完整工作流测试

**预期结果**:
- [ ] 所有 E2E 测试通过
- [ ] 无超时错误
- [ ] 截图正常（如果配置了截图）

---

## 📊 性能测试

### 页面加载时间
**工具**: Chrome DevTools → Network → Disable cache

**测试步骤**:
1. [ ] 清除浏览器缓存
2. [ ] 刷新迭代页面
3. [ ] 记录 DOMContentLoaded 时间

**预期结果**:
- [ ] DOMContentLoaded < 2秒
- [ ] Load 完成 < 3秒

---

### 决策历史渲染性能
**测试数据**: 创建10-20个决策

**测试步骤**:
1. [ ] 切换到"决策历史"标签
2. [ ] 使用 Chrome DevTools → Performance 记录
3. [ ] 展开/折叠多个决策卡片

**预期结果**:
- [ ] 初始渲染 < 500ms
- [ ] 展开/折叠动画 60fps
- [ ] 无明显卡顿

---

## 🔐 安全测试

### XSS 防护测试

**测试数据**: 在 finding description 中注入 XSS 代码
```sql
UPDATE "DiagnosticReport"
SET findings = '[{"description": "<script>alert(1)</script>", ...}]'
WHERE id = '<reportId>';
```

**预期结果**:
- [ ] 脚本不被执行
- [ ] 内容被转义显示为纯文本

---

## ✅ 最终验收检查清单

### 功能完整性
- [ ] Workflow Status 在首次执行决策时更新为 ITERATING
- [ ] 决策历史可查看，可展开/折叠
- [ ] 已处理的 findings 有视觉标记
- [ ] 所有 Act 类型的决策显示正确

### 用户体验
- [ ] 所有交互流畅，无卡顿
- [ ] 错误提示友好
- [ ] 加载状态有提示
- [ ] 响应式设计在各设备上正常

### 技术质量
- [ ] TypeScript 编译无错误
- [ ] 单元测试通过率 100%
- [ ] 生产构建成功
- [ ] 无 console 错误（除 debug 日志）

### 文档完整性
- [ ] 修复计划文档已创建
- [ ] 测试检查清单已创建
- [ ] CLAUDE.md 已更新（如需要）
- [ ] Git commit 信息清晰

---

## 🐛 问题记录

如果测试中发现问题，请在此记录：

### Issue #1:
**描述**:
**重现步骤**:
**预期行为**:
**实际行为**:
**严重程度**:
**状态**:

---

## ✅ 测试签收

- [ ] 所有测试用例执行完毕
- [ ] 所有预期结果符合要求
- [ ] 无阻塞性问题
- [ ] 可以进入下一阶段

**测试执行人**: __________
**测试日期**: __________
**测试结果**: ☐ 通过  ☐ 不通过

---

**文档版本**: v1.0
**最后更新**: 2025-10-10

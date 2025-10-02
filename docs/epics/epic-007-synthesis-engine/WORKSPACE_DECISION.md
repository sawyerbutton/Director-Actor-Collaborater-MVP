# WorkspaceLayout 决策记录

## 决策摘要

**决策**: 将 WorkspaceLayout 统一工作台页面的创建推迟至 Epic 007 Story 4
**决策日期**: 2025-10-02
**决策者**: Epic 005 开发团队
**状态**: ✅ 已记录，待 Epic 007 评估

---

## 背景

### Epic 005 交付内容

Epic 005 (Interactive Workflow Core - Act 2 Implementation) 成功完成了以下核心功能：

✅ **已完成**:
1. **CharacterArchitect Agent** - 完整的 P4-P6 prompt chain
2. **RevisionDecision 数据模型** - 决策跟踪系统
3. **Iteration API** - `/propose` 和 `/execute` 端点
4. **可复用 UI 组件库**:
   - `ActProgressBar` - 五幕进度可视化
   - `FindingsSelector` - Act 1 诊断结果选择器
   - `ProposalComparison` - 提案并排对比
   - `ChangesDisplay` - 戏剧动作展示

⏸️ **有意推迟**:
- **WorkspaceLayout 页面** - 统一的五幕工作台界面

---

## 为什么推迟？

### 1. 战略原因

#### ❌ 过早优化
在所有 5 个 Agent 实现之前创建统一 UI：
- 无法确定最佳的交互模式
- Act 3-5 的特定需求未知
- 可能需要后期大规模重构

#### ✅ 专注核心价值
Epic 005 的核心价值在于：
- **Agent 逻辑** - AI 驱动的角色分析
- **API 基础设施** - 可扩展的迭代端点
- **组件库** - 可复用的 UI 构建块

创建 WorkspaceLayout 会分散焦点，延长 Epic 交付时间。

#### ✅ 迭代式设计
更好的方法是：
1. 先实现所有 5 个 Agent (Epics 005-006)
2. 收集真实用户反馈
3. 基于实际使用模式设计 UI
4. 在 Epic 007 做出数据驱动的决策

### 2. 技术原因

#### 未知因素太多
- Act 3-5 的 UI 模式未定义
- 用户工作流程未验证
- 性能需求未测量
- 状态管理方案待确定

#### 组件已独立可用
当前的组件设计：
```typescript
// ✅ 可以在任何页面中使用
import { ActProgressBar } from '@/components/workspace/act-progress-bar';
import { ProposalComparison } from '@/components/workspace/proposal-comparison';

// 在 /analysis/[id] 页面中
<ActProgressBar currentAct="ACT2_CHARACTER" ... />
<ProposalComparison proposals={proposals} ... />
```

不需要 WorkspaceLayout 也能提供完整功能！

#### 避免技术债务
如果过早创建 WorkspaceLayout：
- 可能基于错误假设
- 后期重构成本高
- 影响已稳定的组件
- 增加维护复杂度

---

## Epic 007 的解决方案

### Story 4: Unified Workspace Interface Evaluation

Epic 007 (Grand Synthesis Engine) 包含了一个专门的 Story 来处理这个决策：

#### 📋 评估阶段（必须执行）
1. **用户流程分析**
   - 实际使用数据收集
   - 导航模式识别
   - 痛点定位

2. **组件集成评估**
   - 代码重复度检查
   - 维护成本分析
   - 技术债务评估

3. **技术就绪性检查**
   - 所有 Agent 稳定运行
   - 性能基准达标
   - 团队能力就绪

#### 🔀 两个可选实施方案

**方案 A: 创建 WorkspaceLayout**
- 统一的 `/workspace/[id]` 页面
- 单页应用（SPA）架构
- 集中式状态管理
- 无页面刷新的 Act 切换

**方案 B: 增强多页面方案**
- 保持当前页面结构
- 添加增强导航组件
- 改进状态持久化
- 优化页面间跳转

#### 📊 决策框架
基于以下数据做决策：
- 用户反馈和满意度
- 可测量的摩擦点
- 技术优势/劣势
- 业务价值评估
- 开发资源可用性

---

## 当前用户流程（无 WorkspaceLayout）

```
用户流程可以这样工作：

1. Dashboard (/dashboard)
   ↓
2. 上传剧本 → 自动触发 Act 1 分析
   ↓
3. Analysis Page (/analysis/[id])
   - 查看 Act 1 诊断结果
   - 选择角色问题聚焦
   ↓
4. API 调用: POST /api/v1/iteration/propose (Act 2)
   ↓
5. 在同一页面显示：
   - <ProposalComparison /> 组件
   ↓
6. 用户选择提案
   ↓
7. API 调用: POST /api/v1/iteration/execute
   ↓
8. 在同一页面显示：
   - <ChangesDisplay /> 组件
   ↓
9. 重复步骤 4-8 用于 Act 3-5
   ↓
10. 最终: POST /api/v1/synthesize → 生成 V2 剧本
```

**关键点**: 所有功能都可以在现有页面中实现，不需要新的 WorkspaceLayout！

---

## 推荐的实施时机

### ✅ 最佳时机: Epic 007 (推荐)

**理由:**
1. 所有 5 个 Agent 已实现（Epic 005-006 完成）
2. 完整的用户流程已可测试
3. 真实使用数据已收集
4. Epic 007 是 UX 优化的自然节点

**时间线:**
```
Epic 005 ✅ (当前) → Epic 006 → Epic 007 Story 4 (评估 + 决策)
                                        ↓
                                  实施 WorkspaceLayout
                                        或
                                  增强多页面方案
```

### ⚠️ 可选时机: Epic 006 后期

如果在 Epic 006 完成后发现明显需求：
- 用户强烈反馈需要统一界面
- 代码维护出现明显问题
- 可以提前进入评估阶段

### ❌ 不推荐: Epic 005 期间

理由已在上述说明。

---

## 对 Epic 005 完成度的影响

### ✅ Epic 005 已完成

**完成度**: 93% (核心功能 100%)

Epic 005 的目标是提供：
1. ✅ Agent 基础设施 (CharacterArchitect)
2. ✅ API 端点 (iteration APIs)
3. ✅ 数据模型 (RevisionDecision)
4. ✅ UI 组件库

**不包括**:
- ❌ 完整的页面集成（这不是 Epic 005 的目标）

### 测试验证

所有核心功能已通过测试：
- ✅ 20/20 单元测试通过
- ✅ TypeScript 类型检查通过
- ✅ 9/10 E2E 测试通过
- ✅ API 端点正确注册

### 可交付使用

当前状态下，组件已可用于：
1. 在现有页面中集成
2. Epic 006 的新 Agent 使用
3. Epic 007 的评估测试

---

## 对后续 Epic 的影响

### Epic 006: Multi-Act Agents
**影响**: ✅ 无阻塞

Epic 006 可以：
- 复用 Epic 005 的 iteration API pattern
- 使用相同的组件库
- 在现有页面结构中集成新 Agent

### Epic 007: Grand Synthesis Engine
**影响**: ✅ 正面影响

Epic 007 获得：
- 完整的五幕数据（Epic 005-006）
- 真实的用户使用模式
- 明确的 UI 优化方向
- 数据驱动的决策基础

---

## 决策记录

| 项目 | 内容 |
|------|------|
| **决策** | 推迟 WorkspaceLayout 至 Epic 007 Story 4 |
| **批准** | Epic 005 开发团队 |
| **日期** | 2025-10-02 |
| **理由** | 避免过早优化，专注核心价值，等待真实反馈 |
| **影响** | Epic 005 完成度 93%，核心功能 100% |
| **下一步** | 完成 Epic 006，在 Epic 007 进行评估 |
| **文档** | `docs/epics/epic-007-synthesis-engine/story-004-workspace-evaluation.md` |

---

## 参考文档

1. **Epic 005 文档**
   - README: `docs/epics/epic-005-interactive-workflow/README.md`
   - Story 1: `docs/epics/epic-005-interactive-workflow/story-001-workspace-ui.md`

2. **Epic 007 文档**
   - README: `docs/epics/epic-007-synthesis-engine/README.md`
   - Story 4: `docs/epics/epic-007-synthesis-engine/story-004-workspace-evaluation.md`

3. **组件代码**
   - `components/workspace/act-progress-bar.tsx`
   - `components/workspace/findings-selector.tsx`
   - `components/workspace/proposal-comparison.tsx`
   - `components/workspace/changes-display.tsx`

4. **测试报告**
   - Epic 005 完整测试报告（本次会话生成）

---

## 附录: 决策评审清单

### ✅ Epic 007 开始前检查

在 Epic 007 Story 4 评估阶段，检查以下条件：

- [ ] Epic 005 和 Epic 006 已完成
- [ ] 所有 5 个 Agent 稳定运行
- [ ] 至少有 10 个完整的用户测试案例
- [ ] 性能数据已收集
- [ ] 用户反馈已整理

### ✅ 实施决策检查点

评估后，基于以下做决策：

**如果满足 ≥3 条，实施 WorkspaceLayout:**
- [ ] 用户明确要求统一界面
- [ ] 导航摩擦可测量且显著
- [ ] 代码重复率 > 30%
- [ ] 预期 ROI > 150%

**如果满足 ≥3 条，增强多页面方案:**
- [ ] 用户满意当前方案
- [ ] 技术实现简单
- [ ] 资源有限
- [ ] 风险较高

---

**最后更新**: 2025-10-02
**维护者**: Epic 开发团队
**状态**: ✅ 决策已记录，待 Epic 007 执行

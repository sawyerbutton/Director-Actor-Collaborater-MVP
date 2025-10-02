# ScriptAI MVP - Epic文档中心

## 📋 当前Epic状态

| Epic ID | 标题 | 优先级 | Story Points | 状态 | 负责人 |
|---------|------|--------|--------------|------|--------|
| [Epic-001](./epic-001-intelligent-repair-bug-fix/) | 智能修复功能Bug修复 | 🔴 Critical | 11 | 完成 | TBD |
| [Epic-002](./epic-002-file-upload-enhancement/) | 文件上传增强 | 🟡 High | 16 | 完成 | TBD |
| [Epic-003](./epic-003-file-upload-type-restriction/) | 文件上传类型限制 | 🟡 High | 8 | 完成 | TBD |
| [Epic-004](./epic-004-architecture-migration/) | 架构迁移 & Act 1基础 | 🔴 Critical | 29 | 待开始 | TBD |
| [Epic-005](./epic-005-interactive-workflow/) | 交互式工作流核心 - Act 2实现 | 🔴 Critical | 29 | 待开始 | TBD |
| [Epic-006](./epic-006-multi-act-agents/) | 多幕Agent系统 - Acts 3-5 | 🟡 High | 24 | 待开始 | TBD |
| [Epic-007](./epic-007-synthesis-engine/) | 大合成引擎 | 🟡 High | 26 | 待开始 | TBD |

## 🎯 实施路线图

### Phase 1: 架构基础 (1-2周)
**目标**: 建立五幕工作流的技术基础

- **Epic-004**: 架构迁移 & Act 1基础
  - Week 1: 数据库激活与模型实现
  - Week 2: V1 API实现与前端迁移

### Phase 2: 交互式核心 (2-3周)
**目标**: 实现交互式共创模式

- **Epic-005**: 交互式工作流核心 - Act 2实现
  - Week 1: 交互式工作台UI
  - Week 2: CharacterArchitect Agent开发
  - Week 3: 决策跟踪系统

### Phase 3: 完整工作流 (2-3周)
**目标**: 完成五幕完整流程

- **Epic-006**: 多幕Agent系统
  - Week 1: RulesAuditor (Act 3)
  - Week 2: PacingStrategist (Act 4)
  - Week 3: ThematicPolisher (Act 5)

### Phase 4: 价值交付 (2周)
**目标**: 智能合成与版本管理

- **Epic-007**: 大合成引擎
  - Week 1: 增强型RevisionExecutive
  - Week 2: 版本管理与导出系统

## 📊 资源分配建议

### 五幕转型项目团队配置
- **技术负责人**: 高级架构师/技术Lead
- **后端开发**: 2名高级工程师（Agent系统、API）
- **前端开发**: 2名工程师（交互式UI、版本对比）
- **AI/ML工程师**: 1名（Prompt工程、LLM集成）
- **QA工程师**: 2名（E2E测试、Agent验证）
- **产品经理**: 1名（用户体验、工作流设计）
- **预计总工作量**: 7-10周，6-8人团队

## 🚨 风险和依赖

### 高优先级风险
1. **LLM输出一致性** (Epic-004至007)
   - 影响：AI生成的提案和修改可能格式不一致
   - 缓解：强化Prompt工程、输出验证、回退机制

2. **上下文窗口限制** (Epic-007)
   - 影响：长剧本可能超出LLM处理能力
   - 缓解：智能分块策略、增量合成

3. **用户流程复杂度** (Epic-005)
   - 影响：多步骤交互可能让用户困惑
   - 缓解：清晰的进度指示、上下文帮助、简化模式

### 关键依赖
- Epic-004是基础，必须首先完成
- Epic-005-007依次构建，每个Epic依赖前一个
- 需要稳定的DeepSeek API访问
- 数据库基础设施必须就绪

## 📈 成功指标

### 五幕转型项目成功标准

#### Epic-004 (架构迁移)
- ✅ 零数据丢失迁移
- ✅ Act 1分析成功率 > 95%
- ✅ API响应时间 < 2秒

#### Epic-005 (交互式工作流)
- ✅ Act 2完成率 > 80%
- ✅ 决策持久化100%成功
- ✅ 用户交互满意度 > 4/5

#### Epic-006 (多幕Agent)
- ✅ 所有五幕可完成
- ✅ Agent输出结构化率 > 90%
- ✅ 每幕平均时间 < 15分钟

#### Epic-007 (合成引擎)
- ✅ 合成连贯性 > 90%
- ✅ 风格保持度 > 85%
- ✅ 导出成功率 > 99%

## 🔗 相关文档

- [项目README](../../README.md)
- [架构文档](../architecture.md)
- [PRD文档](../prd.md)
- [API文档](../api/)

## 📝 Epic创建流程

1. **需求收集** → PM整理用户反馈和需求
2. **Epic创建** → 使用Brownfield Epic模板
3. **Story分解** → 每个Epic分解为1-3个Stories
4. **估算和排期** → Story Points估算和Sprint规划
5. **实施跟踪** → 每日站会和进度更新
6. **验收发布** → QA验证和产品验收

## 🏷️ Epic标签说明

- 🔴 **Critical**: 影响核心功能，需立即处理
- 🟡 **High**: 重要功能增强，下一Sprint处理
- 🟢 **Medium**: 有价值但不紧急，可安排在后续Sprint
- 🔵 **Low**: nice-to-have功能，资源充足时处理

## 💡 最佳实践

1. **保持Epic精简** - 每个Epic不超过3个Stories
2. **明确验收标准** - 每个Story都有可测量的完成定义
3. **风险前置** - 在Epic开始前识别并准备缓解方案
4. **持续沟通** - 每日更新进度，及时暴露阻塞
5. **文档驱动** - 所有决策和变更记录在文档中

---

*最后更新: 2025-09-29*
*下次评审: 项目启动会议*
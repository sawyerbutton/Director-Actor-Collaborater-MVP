# 参考文献目录

本目录存放项目设计和开发过程中参考的文献资料。

## 📚 文档列表

### 1. 参考文献-剧本修改的系统化Prompt任务链.md (5.1K)

**内容**: 系统化Prompt任务链设计方法论

该文档描述了五幕剧结构的Prompt设计方案：
- 第一幕：地基诊断 (Foundational Diagnosis)
- 第二幕：角色弧光 (Character Arc)
- 第三幕：世界观构建 (Worldbuilding)
- 第四幕：节奏控制 (Pacing)
- 第五幕：主题打磨 (Thematic Polish)

**参考价值**:
- ✅ 设计新的AI Agent时的Prompt结构参考
- ✅ 理解五幕剧工作流的理论基础
- ✅ 优化现有Prompt的指导思路

---

### 2. 参考文献-重构系统Workflow的详细方案.md (24K)

**内容**: 从批处理工具到交互式工作台的重构方案

该文档提出了四个核心设计理念转变：
1. 从"一次性批处理"到"多阶段交互式对话"
2. 从"全自动修复"到"人机协作决策"
3. 从"黑盒分析"到"透明化焦点选择"
4. 从"静态报告"到"动态迭代工作区"

**参考价值**:
- ✅ 理解当前交互式工作流的设计动机
- ✅ Epic 005-007 的设计理论依据
- ✅ 未来工作流优化的参考方向

---

## 🔗 相关文档

这些参考文献与以下实现文档相关：

### 实现文档
- `/docs/ai-analysis-repair-workflow.md` - 完整工作流实现
- `/docs/epics/epic-005-interactive-workflow/README.md` - 交互式工作流实现
- `/docs/epics/epic-006-multi-act-agents/README.md` - 多幕剧Agent实现
- `/docs/epics/epic-007-synthesis-engine/README.md` - 合成引擎实现

### Prompt文件
- `/lib/agents/prompts/consistency-prompts.ts` - Act 1 Prompt
- `/lib/agents/prompts/character-architect-prompts.ts` - Act 2 Prompt
- `/lib/agents/prompts/rules-auditor-prompts.ts` - Act 3 Prompt
- `/lib/agents/prompts/pacing-strategist-prompts.ts` - Act 4 Prompt
- `/lib/agents/prompts/thematic-polisher-prompts.ts` - Act 5 Prompt

---

## 📝 使用建议

当需要以下工作时，参考这些文献：

1. **设计新的AI Agent** → 参考Prompt任务链文档
2. **优化工作流交互** → 参考重构方案文档
3. **理解架构决策** → 两份文档都包含设计理念说明
4. **扩展五幕剧结构** → 参考Prompt任务链的方法论

---

**注意**: 这些是参考文献，描述的是设计思路和方法论。实际实现以代码和Epic文档为准。

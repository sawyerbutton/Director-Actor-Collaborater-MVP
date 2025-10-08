# docs/ 目录文档整理计划

## 📊 当前状况

docs/ 一级目录有 **19个markdown文件**，共 **157K**，存在以下问题：
- ❌ 核心文档与过程文档混杂
- ❌ 有重复文档（workflow v3 vs workflow完整版）
- ❌ 实现总结文档未归档
- ❌ 参考文献未分类存放

## 📁 文件分类分析

### ✅ 核心文档 - 保留在 docs/ (6个文件, 84.6K)

| 文件名 | 大小 | 作用 | 保留原因 |
|--------|------|------|----------|
| `ai-analysis-repair-workflow.md` | 37K | **V1 API完整工作流文档** | 当前架构的核心参考文档 |
| `architecture.md` | 5.9K | 全栈架构文档 v2.0 | 架构设计参考 |
| `brief.md` | 8.6K | 项目简报 | 项目背景和目标 |
| `prd.md` | 5.3K | 产品需求文档 | 产品需求定义 |
| `COMPREHENSIVE_TESTING_STRATEGY.md` | 24K | 综合测试策略 | 当前测试方法论 |
| `DEPLOYMENT_CHECKLIST.md` | 5.2K | 部署前检查清单 | 部署流程标准 |

### 📦 实现总结文档 - 归档到 archive/implementations/ (3个文件, 17.9K)

| 文件名 | 大小 | 内容 | 归档原因 |
|--------|------|------|----------|
| `ITERATION_PAGE_IMPLEMENTATION.md` | 8.9K | Acts 2-5 迭代页面实现文档 | 实现完成，作为历史记录 |
| `PHASE_2_COMPLETION_SUMMARY.md` | 4.6K | Phase 2 实现完成总结 | 实现完成，作为历史记录 |
| `DOCUMENTATION_CLEANUP_ANALYSIS.md` | 4.4K | 文档整理分析报告 | 本次整理的分析结果 |

### 📊 测试报告 - 归档到 archive/testing/ (3个文件, 29.9K)

| 文件名 | 大小 | 内容 | 归档原因 |
|--------|------|------|----------|
| `TEST_EXECUTION_REPORT.md` | 14K | 2025-10-02 测试执行报告 | 历史测试报告 |
| `TEST_FIXES_SUMMARY.md` | 11K | 测试修复总结 | 历史修复记录 |
| `test-report.md` | 4.9K | Epic-001 智能修复测试报告 | 历史测试报告 |

### 📚 参考文献 - 移动到 docs/references/ (2个文件, 29.1K)

| 文件名 | 大小 | 内容 | 移动原因 |
|--------|------|------|----------|
| `参考文献-剧本修改的系统化Prompt任务链.md` | 5.1K | Prompt 任务链设计参考 | 参考文献应分类存放 |
| `参考文献-重构系统Workflow的详细方案.md` | 24K | Workflow 重构方案 | 参考文献应分类存放 |

### 📖 用户指南 - 移动到 docs/guides/ (1个文件, 3.1K)

| 文件名 | 大小 | 内容 | 移动原因 |
|--------|------|------|----------|
| `LLM智能修复使用指南.md` | 3.1K | LLM 智能修复功能使用指南 | 与其他指南统一存放 |

### 🗑️ 重复/过时文档 - 删除或归档 (2个文件, 5.1K)

| 文件名 | 大小 | 内容 | 处理建议 |
|--------|------|------|----------|
| `ai-analysis-repair-workflow-v3.md` | 2.0K | V1 API 工作流程文档 v3（精简版） | **删除** - 内容与主文档重复 |
| `sprint-board.md` | 3.1K | Sprint 执行看板 (2025-09-25) | **归档** - 已过时，移动到 archive/planning/ |

### ⚙️ 配置文档 - 移动到 docs/config/ (2个文件, 6.8K)

| 文件名 | 大小 | 内容 | 移动原因 |
|--------|------|------|----------|
| `PROJECT_STRUCTURE.md` | 3.7K | 项目目录结构说明 | 配置类文档分类存放 |
| `SECURITY-NOTICE.md` | 3.1K | 安全注意事项（无认证演示） | 配置类文档分类存放 |

## 🎯 执行计划

### 阶段1: 创建新目录结构

```bash
mkdir -p docs/archive/implementations
mkdir -p docs/archive/planning
mkdir -p docs/references
mkdir -p docs/config
```

### 阶段2: 移动实现总结文档

```bash
git mv docs/ITERATION_PAGE_IMPLEMENTATION.md docs/archive/implementations/
git mv docs/PHASE_2_COMPLETION_SUMMARY.md docs/archive/implementations/
git mv docs/DOCUMENTATION_CLEANUP_ANALYSIS.md docs/archive/implementations/
```

### 阶段3: 移动测试报告

```bash
git mv docs/TEST_EXECUTION_REPORT.md docs/archive/testing/
git mv docs/TEST_FIXES_SUMMARY.md docs/archive/testing/
git mv docs/test-report.md docs/archive/testing/epic-001-test-report.md
```

### 阶段4: 移动参考文献

```bash
git mv docs/参考文献-剧本修改的系统化Prompt任务链.md docs/references/
git mv docs/参考文献-重构系统Workflow的详细方案.md docs/references/
```

### 阶段5: 移动用户指南

```bash
git mv docs/LLM智能修复使用指南.md docs/guides/
```

### 阶段6: 移动配置文档

```bash
git mv docs/PROJECT_STRUCTURE.md docs/config/
git mv docs/SECURITY-NOTICE.md docs/config/
```

### 阶段7: 处理重复/过时文档

```bash
# 删除重复的精简版（内容已在主文档中）
git rm docs/ai-analysis-repair-workflow-v3.md

# 归档过时的 Sprint 看板
git mv docs/sprint-board.md docs/archive/planning/
```

## 📂 整理后的 docs/ 结构

```
docs/
├── ai-analysis-repair-workflow.md        # V1 API 完整工作流 ✅
├── architecture.md                        # 架构文档 ✅
├── brief.md                               # 项目简报 ✅
├── prd.md                                 # 产品需求文档 ✅
├── COMPREHENSIVE_TESTING_STRATEGY.md      # 测试策略 ✅
├── DEPLOYMENT_CHECKLIST.md                # 部署清单 ✅
├── archive/                               # 归档文档
│   ├── README.md                          # 归档说明 ✅
│   ├── fixes/                             # 历史修复 ✅
│   ├── testing/                           # 历史测试 (新增3个文件)
│   ├── deployment/                        # 历史部署 ✅
│   ├── implementations/                   # 实现总结 (新增3个文件)
│   └── planning/                          # 计划文档 (新增1个文件)
├── guides/                                # 用户指南
│   ├── MANUAL_TESTING_GUIDE.md            ✅
│   ├── QUICK_START.md                     ✅
│   ├── LLM智能修复使用指南.md             (新增)
│   ├── LOCAL_DEPLOYMENT_NOTES.md          ✅
│   ├── LOCAL_TEST_GUIDE.md                ✅
│   └── README_CN.md                       ✅
├── references/                            # 参考文献 (新增目录)
│   ├── 参考文献-剧本修改的系统化Prompt任务链.md
│   └── 参考文献-重构系统Workflow的详细方案.md
├── config/                                # 配置文档 (新增目录)
│   ├── PROJECT_STRUCTURE.md
│   └── SECURITY-NOTICE.md
├── api/                                   # API 文档 ✅
├── architecture/                          # 详细架构 ✅
├── database/                              # 数据库文档 ✅
├── deployment/                            # 部署文档 ✅
├── design/                                # 设计文档 ✅
├── epics/                                 # Epic 文档 ✅
├── prd/                                   # PRD 详细文档 ✅
├── qa/                                    # QA 文档 ✅
├── stories/                               # Story 文档 ✅
└── sprint-change-proposals/               # Sprint 变更提案 ✅
```

## 📊 整理效果

### docs/ 一级目录文件数量对比

| 状态 | 文件数 | 总大小 |
|------|--------|--------|
| **整理前** | 19个 | 157K |
| **整理后** | 6个 | 84.6K |
| **减少** | -13个 (-68%) | -72.4K (-46%) |

### 文件去向统计

| 目标位置 | 文件数 | 说明 |
|---------|--------|------|
| **保留在 docs/** | 6 | 核心参考文档 |
| **archive/implementations/** | 3 | 实现总结 |
| **archive/testing/** | 3 | 测试报告 |
| **archive/planning/** | 1 | 过时计划 |
| **references/** | 2 | 参考文献 |
| **guides/** | 1 | 用户指南 |
| **config/** | 2 | 配置文档 |
| **删除** | 1 | 重复文档 |

## ✅ 整理收益

1. ✅ **目录更清晰** - docs/ 只保留6个核心文档，一目了然
2. ✅ **分类更合理** - 文档按类型分目录存放（参考文献、配置、归档）
3. ✅ **便于维护** - 历史文档归档，当前文档突出
4. ✅ **减少混淆** - 删除重复文档，避免版本混乱
5. ✅ **Git历史保留** - 使用 `git mv` 保留完整历史记录

## 📝 补充说明

1. **archive/README.md** 需要更新，添加新增归档目录的说明
2. **references/** 和 **config/** 目录建议添加 README.md 说明
3. 整理完成后，更新 `CLAUDE.md` 中的文档路径引用

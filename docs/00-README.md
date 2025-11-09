# 📚 项目文档导航

**ScriptAI MVP - 完整文档索引**

本目录包含ScriptAI项目的所有技术文档。建议按照以下导航快速找到所需内容。

---

## 🚀 快速开始

**首次接触项目？从这里开始：**

1. **[CLAUDE.md](../CLAUDE.md)** - AI开发指南（最重要！）
2. **[README.md](../README.md)** - 项目主文档
3. **[Architecture Overview](../ref/ARCHITECTURE_OVERVIEW.md)** - 系统架构概览

---

## 📖 核心参考文档 (`/ref`)

**位置**: 项目根目录 `/ref`

这些是**最常用**的参考文档，提供快速查阅的技术细节：

| 文档 | 描述 | 何时使用 |
|------|------|----------|
| [Architecture Overview](../ref/ARCHITECTURE_OVERVIEW.md) | 系统架构总览 | 理解整体设计 |
| [AI Agents Reference](../ref/AI_AGENTS.md) | 6个AI代理完整指南 | 实现新Agent功能 |
| [API Reference](../ref/API_REFERENCE.md) | V1 API完整文档 | 开发API端点 |
| [Database Schema](../ref/DATABASE_SCHEMA.md) | Prisma模型和服务 | 数据库操作 |
| [Frontend Components](../ref/FRONTEND_COMPONENTS.md) | 页面和组件指南 | 前端开发 |
| [Testing Guide](../ref/TESTING_GUIDE.md) | 测试模式和约定 | 编写测试 |
| [Deployment Guide](../ref/DEPLOYMENT_GUIDE.md) | 生产部署指南 | 部署到Vercel |
| [Workflow Reference](../ref/WORKFLOW_REFERENCE.md) | 五幕工作流系统 | 理解业务流程 |
| [Multi-File Analysis](../ref/MULTI_FILE_ANALYSIS.md) | 多文件分析参考 | Sprint 3功能 |
| [Bug Fixes Reference](../ref/BUG_FIXES.md) | 关键Bug修复 | 故障排查 |

---

## 🏗️ 详细架构文档 (`/architecture`)

**250+ 页深度技术文档**

| 文档 | 页数 | 描述 |
|------|------|------|
| [系统架构总索引](architecture/SYSTEM_ARCHITECTURE_COMPLETE.md) | - | 导航枢纽 |
| [01 - 业务流程](architecture/01_BUSINESS_FLOW.md) | 70+ | 产品定位、用户旅程、五幕工作流 |
| [02 - 数据库架构](architecture/02_DATABASE_ARCHITECTURE.md) | 40+ | Schema设计、索引、查询模式 |
| [03 - 前端架构](architecture/03_FRONTEND_ARCHITECTURE.md) | 40+ | React组件、状态管理、性能 |
| [04 - 后端API架构](architecture/04_BACKEND_API_ARCHITECTURE.md) | 45+ | API路由、异步任务、Serverless |
| [05 - LLM集成](architecture/05_LLM_INTEGRATION.md) | 40+ | DeepSeek API、6个AI代理、Prompt链 |
| [06 - 部署架构](architecture/06_DEPLOYMENT_ARCHITECTURE.md) | 30+ | Vercel部署、Supabase配置、监控 |

---

## 📋 Epic 开发文档 (`/epics`)

**按功能模块组织的开发历史**

| Epic | 状态 | 描述 |
|------|------|------|
| [Epic 001](epics/epic-001-intelligent-repair-bug-fix/) | ✅ 完成 | 智能修复Bug修复 |
| [Epic 002](epics/epic-002-file-upload-enhancement/) | ✅ 完成 | 文件上传增强 |
| [Epic 003](epics/epic-003-file-upload-type-restriction/) | ✅ 完成 | 文件类型限制 |
| [Epic 004](epics/epic-004-architecture-migration/) | ✅ 完成 | 数据库&V1 API迁移 |
| [Epic 005](epics/epic-005-interactive-workflow/) | ✅ 完成 | Act 2交互工作流 |
| [Epic 006](epics/epic-006-multi-act-agents/) | ✅ 完成 | Act 3-5多幕代理 |
| [Epic 007](epics/epic-007-synthesis-engine/) | ✅ 完成 | 合成引擎 |

每个Epic包含：
- `README.md` - Epic概述和实现指南
- `TEST_RESULTS.md` - 测试报告
- `EPIC_*_VERIFICATION_REPORT.md` - 验证报告

---

## 🛠️ 开发指南 (`/guides`)

**实用开发指南**

### 部署指南 (`/guides/deployment`)
- 待整合部署相关文档

### 故障排查 (`/fixes` - 将移至 `/guides/troubleshooting`)

**关键修复文档**:
- `ACT2_ASYNC_QUEUE_IMPLEMENTATION.md` - ACT2-5异步队列架构
- `ACT_FILTERING_FIX.md` - Act过滤业务逻辑
- `ACT1_REPAIR_API_DEBUGGING.md` - ACT1修复API故障排查
- `VERCEL_504_TIMEOUT_FIX.md` - Serverless超时配置
- `PRODUCT_IMPLEMENTATION_MISMATCH_FIX.md` - 产品-实现不匹配修复
- `SCRIPT_VERSIONING_ITERATION_TASK.md` - 脚本版本迭代

---

## 📦 归档文档 (`/archive`)

**历史文档和早期设计**

### 早期项目文件 (`/archive/early-project-files`)
- `.bmad-core/` - 早期AI开发框架 (808KB)
- `Appendix/` - 早期MVP需求文档 (80KB)
- `monitoring/` - 未使用的监控配置
- `services/` - Python转换服务 (已废弃, 92MB)

### 旧设计文档 (`/archive/old-design`)
- `ACT1_TECHNICAL_IMPLEMENTATION.md` (67KB) - 已被 `ref/AI_AGENTS.md` 替代
- `BUSINESS_FLOW.md` (37KB) - 已被 `architecture/01_BUSINESS_FLOW.md` 替代
- `BUSINESS_REQUIREMENTS_DISCUSSION.md` (13KB)
- `MULTI_SCRIPT_ANALYSIS_REQUIREMENTS.md` (23KB) - 已被 `ref/MULTI_FILE_ANALYSIS.md` 替代
- 其他早期设计文档...

### 其他归档 (`/archive/...`)
- `/archive/deployment` - 历史部署文档
- `/archive/fixes` - 历史修复记录
- `/archive/implementations` - 实现总结
- `/archive/planning` - 早期规划
- `/archive/testing` - 测试报告

---

## 📊 其他文档目录

### API文档 (`/api`)
- API相关设计文档

### 数据库 (`/database`)
- 数据库相关设计文档

### 设计 (`/design`)
- UI/UX设计文档

### 部署 (`/deployment`)
- 部署相关文档（待整合到 `/guides/deployment`）

### 迁移 (`/migrations`)
- 数据迁移文档

### PRD (`/prd`)
- 产品需求文档

### QA (`/qa`)
- 质量保证文档
  - `/qa/assessments` - 评估报告
  - `/qa/gates` - 质量门禁

### Sprint文档
- `/session-summaries` - 会话总结
- `/sprint-change-proposals` - Sprint变更提案
- `/sprint-summaries` - Sprint总结

### 故事 (`/stories`)
- 用户故事文档

### 测试 (`/testing`)
- 测试策略和报告

---

## 🔍 如何查找文档？

### 按场景查找

**场景1: 我是新成员，想了解项目**
1. 阅读 [CLAUDE.md](../CLAUDE.md) - AI开发指南
2. 阅读 [Architecture Overview](../ref/ARCHITECTURE_OVERVIEW.md) - 系统概览
3. 阅读 [Workflow Reference](../ref/WORKFLOW_REFERENCE.md) - 业务流程

**场景2: 我要开发新功能**
1. 查看 [API Reference](../ref/API_REFERENCE.md) - API端点
2. 查看 [AI Agents Reference](../ref/AI_AGENTS.md) - AI代理
3. 查看相关Epic文档 - 类似功能实现

**场景3: 我遇到了Bug**
1. 查看 [Bug Fixes Reference](../ref/BUG_FIXES.md) - 已知问题
2. 查看 `/fixes` 目录 - 详细修复文档
3. 查看 [Deployment Architecture](architecture/06_DEPLOYMENT_ARCHITECTURE.md) - 故障排查

**场景4: 我要写测试**
1. 查看 [Testing Guide](../ref/TESTING_GUIDE.md) - 测试模式
2. 查看现有测试文件 - `/tests` 目录
3. 查看Epic测试报告 - `TEST_RESULTS.md`

**场景5: 我要部署到生产**
1. 查看 [Deployment Guide](../ref/DEPLOYMENT_GUIDE.md) - 部署指南
2. 查看 [Deployment Architecture](architecture/06_DEPLOYMENT_ARCHITECTURE.md) - 详细配置
3. 查看 `/deployment` 目录 - 部署文档

### 按技术栈查找

- **前端开发** → `ref/FRONTEND_COMPONENTS.md`, `architecture/03_FRONTEND_ARCHITECTURE.md`
- **后端开发** → `ref/API_REFERENCE.md`, `architecture/04_BACKEND_API_ARCHITECTURE.md`
- **数据库** → `ref/DATABASE_SCHEMA.md`, `architecture/02_DATABASE_ARCHITECTURE.md`
- **AI集成** → `ref/AI_AGENTS.md`, `architecture/05_LLM_INTEGRATION.md`
- **测试** → `ref/TESTING_GUIDE.md`, `/testing`
- **部署** → `ref/DEPLOYMENT_GUIDE.md`, `architecture/06_DEPLOYMENT_ARCHITECTURE.md`

---

## 📝 文档维护准则

### 文档分类原则

1. **参考文档** (`/ref`) - 高频使用，快速查阅
2. **详细架构** (`/architecture`) - 深度技术细节
3. **Epic文档** (`/epics`) - 功能开发历史
4. **开发指南** (`/guides`) - 实用操作指南
5. **归档文档** (`/archive`) - 历史参考

### 文档更新规则

- ✅ **优先更新**: `/ref` 参考文档（最常用）
- ✅ **同步更新**: `CLAUDE.md`（AI开发指南）
- ⚠️ **谨慎更新**: `/architecture` 详细架构（除非重大变更）
- ❌ **不要修改**: `/archive` 归档文档（仅供参考）

### 新文档创建

- Epic文档 → 创建在 `/epics/epic-XXX-name/`
- Bug修复 → 创建在 `/fixes/` (或更新 `ref/BUG_FIXES.md`)
- 新指南 → 创建在 `/guides/category/`
- 参考文档 → 创建在 `/ref/` (高频使用)

---

## 🔗 外部资源

- **GitHub仓库**: [链接待补充]
- **Vercel部署**: [链接待补充]
- **Supabase控制台**: [链接待补充]
- **DeepSeek API文档**: https://platform.deepseek.com/docs

---

**最后更新**: 2025-11-09 (Phase 2 清理)
**维护者**: ScriptAI Team

# Story 001: 数据库激活与模型实现

## Story概述
**Story ID:** EPIC-004-STORY-001
**Story名称:** 数据库激活与模型实现
**Story Points:** 8
**优先级:** P0 - Critical

## 用户故事
作为一个系统架构师，
我需要激活PostgreSQL/Prisma基础设施并实现核心数据模型，
以便为五幕工作流提供持久化存储和状态管理能力。

## 验收标准

### 功能需求
1. [ ] Prisma配置完成，包含正确的DATABASE_URL和DIRECT_URL
2. [ ] 所有核心模型（Project, ScriptVersion, AnalysisJob, DiagnosticReport）创建完成
3. [ ] 状态机WorkflowStatus枚举正确实现
4. [ ] 数据库迁移成功执行
5. [ ] 连接池配置适合无服务器环境

### 技术需求
6. [ ] 数据库服务层实现CRUD操作
7. [ ] 事务支持关键操作
8. [ ] 索引优化查询性能
9. [ ] 错误处理和重试逻辑
10. [ ] 单元测试覆盖率 > 80%

## 技术细节

### 数据库连接配置
```typescript
// 使用Supabase连接池
DATABASE_URL="postgresql://[user]:[password]@[host]:6543/[database]?pgbouncer=true"
// 直接连接用于迁移
DIRECT_URL="postgresql://[user]:[password]@[host]:5432/[database]"
```

### 核心服务实现
- ProjectService: 项目CRUD和状态管理
- ScriptVersionService: 版本控制和检索
- AnalysisJobService: 异步任务管理
- DiagnosticReportService: 报告存储和查询

## 定义完成
- [ ] 所有验收标准满足
- [ ] 数据库迁移成功部署
- [ ] 服务层通过所有测试
- [ ] 代码审查通过
- [ ] 文档更新完成

## 风险和依赖
- **风险:** 数据库连接配置错误可能导致连接失败
- **缓解:** 提供详细的配置文档和验证脚本
- **依赖:** Supabase/PostgreSQL基础设施必须就绪

## 测试场景
1. 创建新项目并验证状态
2. 存储和检索剧本版本
3. 创建和更新分析任务
4. 状态机转换验证
5. 并发操作测试
6. 事务回滚测试

## 相关文档
- [Epic 004 README](./README.md)
- [Prisma Schema](../../../prisma/schema.prisma)
- [Database Services](../../../lib/db/services/)
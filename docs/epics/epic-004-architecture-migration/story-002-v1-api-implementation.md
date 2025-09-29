# Story 002: V1 API实现与异步处理

## Story概述
**Story ID:** EPIC-004-STORY-002
**Story名称:** V1 API实现与异步处理
**Story Points:** 13
**优先级:** P0 - Critical

## 用户故事
作为一个后端开发者，
我需要实现V1 API端点和异步任务队列系统，
以便支持Act 1分析的异步处理和状态轮询。

## 验收标准

### 功能需求
1. [ ] POST /api/v1/projects 端点创建新项目
2. [ ] POST /api/v1/analyze 端点触发异步分析
3. [ ] GET /api/v1/analyze/:jobId/status 端点支持状态轮询
4. [ ] GET /api/v1/projects/:id/report 端点获取诊断报告
5. [ ] ConsistencyGuardian集成为Agent

### 技术需求
6. [ ] 任务队列系统运行正常（BullMQ或类似）
7. [ ] 状态轮询机制工作正常
8. [ ] 错误处理和重试逻辑实现
9. [ ] API响应时间 < 2秒（不包括LLM处理）
10. [ ] 集成测试覆盖所有端点

## 技术细节

### API端点设计
```typescript
// 项目创建
POST /api/v1/projects
Request: { title: string, scriptContent: string }
Response: { projectId: string }

// 分析触发
POST /api/v1/analyze
Request: { projectId: string }
Response: { jobId: string } (202 Accepted)

// 状态轮询
GET /api/v1/analyze/:jobId/status
Response: { status: JobStatus, progress?: number }

// 报告获取
GET /api/v1/projects/:id/report
Response: { report: DiagnosticReport }
```

### 异步处理架构
- Worker进程处理长时间运行的任务
- Redis或内存队列管理任务
- 超时和死信队列处理
- 进度报告和日志记录

## 定义完成
- [ ] 所有API端点实现并测试
- [ ] 任务队列系统稳定运行
- [ ] ConsistencyGuardian成功集成
- [ ] 端到端测试通过
- [ ] API文档更新

## 风险和依赖
- **风险:** 队列系统可能丢失任务
- **缓解:** 实现持久化队列和恢复机制
- **依赖:** Story 001完成（数据库就绪）

## 测试场景
1. 创建项目并触发分析
2. 轮询状态直到完成
3. 获取并验证诊断报告
4. 并发分析请求处理
5. 任务失败和重试
6. 超时处理验证

## 相关文档
- [Epic 004 README](./README.md)
- [API Routes](../../../app/api/v1/)
- [ConsistencyGuardian Agent](../../../lib/agents/consistency-guardian.ts)
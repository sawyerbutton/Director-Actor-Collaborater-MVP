# Story 003: 前端迁移到V1 API

## Story概述
**Story ID:** EPIC-004-STORY-003
**Story名称:** 前端迁移到V1 API
**Story Points:** 8
**优先级:** P0 - Critical

## 用户故事
作为一个前端开发者，
我需要将前端从localStorage迁移到V1 API并实现轮询机制，
以便完全移除客户端持久化并使用服务器端状态管理。

## 验收标准

### 功能需求
1. [ ] 所有localStorage使用代码移除
2. [ ] 轮询机制实现（使用SWR或React Query）
3. [ ] 加载状态正确显示
4. [ ] 错误状态优雅处理
5. [ ] 过渡期间向后兼容

### 技术需求
6. [ ] API客户端更新为V1端点
7. [ ] 状态管理迁移到服务器端
8. [ ] 轮询间隔优化（避免过度请求）
9. [ ] 网络错误重试机制
10. [ ] 性能指标满足要求

## 技术细节

### 轮询实现策略
```typescript
// 使用SWR进行状态轮询
const { data: jobStatus } = useSWR(
  jobId ? `/api/v1/analyze/${jobId}/status` : null,
  fetcher,
  {
    refreshInterval: (data) => {
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        return 0; // 停止轮询
      }
      return 2000; // 每2秒轮询
    },
  }
);
```

### 迁移步骤
1. 更新API客户端到V1端点
2. 实现轮询hooks
3. 移除localStorage依赖
4. 更新状态管理逻辑
5. 添加过渡期兼容层

## 定义完成
- [ ] localStorage完全移除
- [ ] 轮询机制稳定工作
- [ ] 所有UI状态正确显示
- [ ] 零数据丢失验证
- [ ] 用户体验测试通过

## 风险和依赖
- **风险:** 迁移期间可能丢失用户数据
- **缓解:** 双写策略和数据验证
- **依赖:** Story 002完成（V1 API就绪）

## 测试场景
1. 完整用户流程测试
2. 网络断开重连测试
3. 轮询性能测试
4. 并发用户测试
5. 浏览器兼容性测试
6. 迁移数据完整性验证

## 相关文档
- [Epic 004 README](./README.md)
- [Frontend Components](../../../components/)
- [Analysis Store](../../../lib/stores/analysis-store.ts)
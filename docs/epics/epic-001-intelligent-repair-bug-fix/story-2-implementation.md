# Story 2: 实施修复和错误处理

**Story Points**: 5
**优先级**: 🔴 Critical
**预计时间**: 2天

## 用户故事

作为一名**用户**，
我想要**智能修复功能能够稳定工作**，
以便**成功修复剧本中检测到的逻辑错误**。

## 故事背景

### 现有系统集成
- **集成组件**: DeepSeek API客户端 (`lib/api/deepseek-client.ts`)
- **技术栈**: Next.js API Routes, TypeScript, Zod验证
- **遵循模式**: 现有的API响应处理和重试机制
- **触点**:
  - 修复生成流程
  - 验证流程
  - 应用流程

## 验收标准

### 功能需求
1. ✅ 修复Story 1中识别的所有根本问题
2. ✅ 实现健壮的错误处理机制
   - 超时处理（30秒超时）
   - 格式错误处理
   - API失败处理
3. ✅ 添加自动重试机制
   - 最多3次重试
   - 指数退避策略（1s, 2s, 4s）

### 集成需求
4. ✅ 保持现有API接口签名不变
5. ✅ 遵循现有的错误响应格式
6. ✅ 与现有的Zustand状态管理无缝集成

### 质量需求
7. ✅ 所有修复场景通过单元测试
8. ✅ 错误消息对用户友好且可操作
9. ✅ 性能影响控制在5%以内

## 技术说明

### 集成方式
扩展现有的`withMiddleware`错误处理

### 模式参考
使用现有的`createApiResponse`标准化响应

### 关键约束
- API响应时间不超过30秒
- 保持向后兼容
- 不影响其他功能模块

## 实施步骤

### 1. 错误处理增强

```typescript
// lib/agents/revision-executive.ts

interface RetryConfig {
  maxAttempts: number;
  backoffMs: number[];
  timeout: number;
}

class RevisionExecutive {
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    backoffMs: [1000, 2000, 4000],
    timeout: 30000
  };

  async generateFix(error: LogicalError): Promise<Fix> {
    return this.withRetry(async () => {
      // 实现修复逻辑
    });
  }

  private async withRetry<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    // 实现重试逻辑
  }
}
```

### 2. API响应验证增强

```typescript
// lib/api/validation/repair-response.ts

const RepairResponseSchema = z.object({
  success: z.boolean(),
  fix: z.object({
    content: z.string(),
    confidence: z.number().min(0).max(1),
    explanation: z.string()
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean()
  }).optional()
});
```

### 3. 用户友好的错误消息

```typescript
// lib/utils/error-messages.ts

export const ERROR_MESSAGES = {
  TIMEOUT: "修复请求超时，正在重试...",
  API_ERROR: "AI服务暂时不可用，请稍后再试",
  VALIDATION_ERROR: "修复内容格式有误，正在重新生成...",
  MAX_RETRIES: "多次尝试后仍无法完成修复，请联系支持"
};
```

### 4. 状态管理更新

```typescript
// lib/stores/revision-store.ts

interface RevisionState {
  isRepairing: boolean;
  repairProgress: number;
  repairError: Error | null;
  retryCount: number;
}
```

## 完成定义

- [ ] 所有识别的Bug已修复
- [ ] 重试机制正常工作
- [ ] 错误处理覆盖所有失败场景
- [ ] 通过所有回归测试
- [ ] 用户反馈消息清晰明确
- [ ] 代码审查通过

## 测试用例

### 单元测试
```typescript
// tests/unit/revision-executive.test.ts
describe('RevisionExecutive', () => {
  it('should retry on timeout', async () => {});
  it('should handle API errors gracefully', async () => {});
  it('should validate response format', async () => {});
  it('should respect max retry limit', async () => {});
});
```

### 集成测试
```typescript
// tests/integration/repair-flow.test.ts
describe('Repair Flow', () => {
  it('should complete repair successfully', async () => {});
  it('should recover from transient errors', async () => {});
  it('should provide user feedback during retries', async () => {});
});
```

## 输出交付物

1. **修复后的代码**
   - `lib/agents/revision-executive.ts`
   - `lib/api/deepseek-client.ts`
   - `lib/stores/revision-store.ts`

2. **新增的工具类**
   - `lib/utils/retry-helper.ts`
   - `lib/utils/error-messages.ts`

3. **更新的测试**
   - 单元测试套件
   - 集成测试套件

## 依赖关系

- 依赖Story 1的诊断结果
- Story 3依赖此Story的完成

## 风险

- **风险**: DeepSeek API可能需要调整请求格式
- **缓解**: 与DeepSeek文档保持同步，准备多个API适配器

## 备注

- 确保所有错误都有对应的监控指标
- 考虑添加功能开关以便快速回滚
- 保留详细的修复日志用于后续分析
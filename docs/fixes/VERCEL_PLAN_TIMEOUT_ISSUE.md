# Vercel Plan 超时问题诊断与解决

**日期**: 2025-10-10
**问题**: ACT2 propose API 返回 504 Gateway Timeout
**错误**: `FUNCTION_INVOCATION_TIMEOUT`
**状态**: ⚠️ 需要用户决策

---

## 🐛 问题描述

### 用户报告的错误

在 ACT2 迭代页面，点击"获取AI解决方案提案"按钮后，遇到以下错误：

```
POST /api/v1/iteration/propose 504 (Gateway Timeout)
FUNCTION_INVOCATION_TIMEOUT
Propose failed: Error: 获取提案失败: An error occurred with your deployment
```

### 错误场景
1. 用户完成 ACT1 分析
2. 进入 ACT2 迭代页面
3. 选择一个问题，点击"获取AI解决方案提案"
4. **等待约 10 秒后超时**
5. 返回 504 错误

---

## 🔍 根本原因分析

### Vercel Plan 限制

| Plan | 最大函数执行时间 | 当前配置 | 是否生效 | ACT2 实际需要 |
|------|-----------------|---------|---------|--------------|
| **Hobby** | **10 秒** | 60 秒 | ❌ 无效 | 30-60 秒 |
| **Pro** | **60 秒** | 60 秒 | ✅ 有效 | 30-60 秒 |
| **Enterprise** | **900 秒** | 60 秒 | ✅ 有效 | 30-60 秒 |

**关键发现**：
- `vercel.json` 中配置了 `maxDuration: 60`
- **但是 Hobby Plan 不支持超过 10 秒的函数执行**
- 配置被 Vercel 忽略，实际限制为 10 秒

### ACT2 Propose 执行流程

```typescript
// app/api/v1/iteration/propose/route.ts

switch (validatedData.act) {
  case 'ACT2_CHARACTER': {
    const agent = createCharacterArchitect();

    // 步骤 1: P4 - Focus Character (15-30 秒)
    const focus = await agent.focusCharacter(
      focusName,
      contradiction,
      scriptContext
    );

    // 步骤 2: P5 - Propose Solutions (15-30 秒)
    const proposalSet = await agent.proposeSolutions(focus);

    // 总计: 30-60 秒
    break;
  }
}
```

**时间分解**：
1. **P4 (focusCharacter)**:
   - 调用 DeepSeek API 分析角色矛盾
   - 提取上下文和关联场景
   - 预计耗时: **15-30 秒**

2. **P5 (proposeSolutions)**:
   - 调用 DeepSeek API 生成解决方案
   - 生成 2 个提案，包含利弊分析
   - 预计耗时: **15-30 秒**

3. **数据库操作**:
   - 保存 RevisionDecision 记录
   - 预计耗时: **1-2 秒**

**总执行时间**: 30-60 秒

**Hobby Plan 限制**: 10 秒后被强制终止 ❌

---

## ✅ 解决方案

### 方案 A：升级到 Vercel Pro Plan（强烈推荐）

这是**最简单、最可靠**的解决方案，无需修改代码。

#### 步骤

1. **访问 Vercel Dashboard**:
   ```
   https://vercel.com/[your-team]/[your-project]/settings/billing
   ```

2. **升级计划**:
   - 点击 "Upgrade to Pro"
   - 按照提示完成升级（$20/月/成员）

3. **重新部署**:
   ```bash
   git push origin feature/epic-1-rag-poc
   # 或者在 Vercel Dashboard 手动触发重新部署
   ```

4. **验证配置生效**:
   - 升级后，`vercel.json` 中的 `maxDuration: 60` 将生效
   - 测试 ACT2 propose 接口，应该在 30-60 秒内成功返回

#### Pro Plan 优势

| 功能 | Hobby | Pro |
|------|-------|-----|
| 函数执行时间 | 10 秒 | **60 秒** |
| 带宽 | 100 GB | **1 TB** |
| 并发构建 | 1 | **3** |
| 团队成员 | 无 | **无限** |
| 部署数量 | 无限 | **无限** |
| Serverless 执行 | 100K | **1M** |

**价格**: $20/月/成员

---

### 方案 B：优化代码以适配 Hobby Plan

如果暂时无法升级，可以通过以下方式优化代码：

#### B.1 异步队列模式（推荐）

将耗时的 AI 分析移到后台队列处理：

```typescript
// propose API 立即返回，创建后台任务
export async function POST(request: NextRequest) {
  // 1. 创建 Job 记录
  const job = await analysisJobService.create({
    projectId,
    type: JobType.ITERATION_PROPOSE,
    status: JobStatus.QUEUED
  });

  // 2. 立即返回 jobId (< 1 秒)
  return NextResponse.json({
    success: true,
    data: { jobId: job.id }
  });
}

// 前端轮询 job 状态
async function pollProposeJob(jobId: string) {
  while (attempts < MAX_ATTEMPTS) {
    await triggerProcessing(); // Serverless compatibility
    const status = await getJobStatus(jobId);

    if (status === 'COMPLETED') {
      const result = await getProposals(jobId);
      return result;
    }

    await sleep(5000); // 5 秒轮询
  }
}
```

**优点**:
- ✅ 完全兼容 Hobby Plan
- ✅ 与 ACT1 analysis 模式一致
- ✅ 支持更长的处理时间

**缺点**:
- 需要修改前端和后端代码
- 用户体验稍差（需要等待轮询）

#### B.2 减少 AI 调用次数

合并 P4 和 P5 为单次 AI 调用：

```typescript
// 当前: 2 次 AI 调用
const focus = await agent.focusCharacter(...);      // Call 1: 15-30s
const proposals = await agent.proposeSolutions(...); // Call 2: 15-30s

// 优化: 1 次 AI 调用
const result = await agent.focusAndPropose(...);    // Call 1: 20-35s
```

**优点**:
- ✅ 减少网络往返时间
- ✅ 可能在 10 秒内完成（小型剧本）

**缺点**:
- 可能仍然超过 10 秒（中大型剧本）
- 需要修改 agent 逻辑

#### B.3 缓存中间结果

缓存 P4 的结果，减少重复计算：

```typescript
// 第一次调用: 完整执行
const focus = await agent.focusCharacter(...);
await redis.set(`focus:${hash}`, focus, 3600); // 缓存 1 小时

// 后续调用: 使用缓存
const cached = await redis.get(`focus:${hash}`);
if (cached) {
  const proposals = await agent.proposeSolutions(cached);
  // 只执行 P5, 节省 15-30 秒
}
```

**优点**:
- ✅ 显著减少执行时间
- ✅ 改善用户体验

**缺点**:
- 需要引入 Redis 或类似缓存服务
- 增加系统复杂度

---

### 方案 C：混合方案

结合多种优化策略：

1. **首次访问**: 使用队列模式（确保成功）
2. **重复访问**: 使用缓存（提升速度）
3. **小型剧本**: 直接执行（< 10 秒）

```typescript
export async function POST(request: NextRequest) {
  const scriptSize = scriptContext.length;

  // 小型剧本 (< 1000 字符): 直接执行
  if (scriptSize < 1000) {
    const result = await executeDirectly();
    return NextResponse.json(result);
  }

  // 中大型剧本: 使用队列
  const job = await createBackgroundJob();
  return NextResponse.json({ jobId: job.id });
}
```

---

## 📊 方案对比

| 方案 | 实现难度 | 用户体验 | 成本 | Hobby Plan | Pro Plan |
|------|---------|---------|------|-----------|----------|
| **A. 升级 Pro** | ⭐ 简单 | ⭐⭐⭐⭐⭐ 优秀 | $20/月 | ❌ | ✅ |
| **B1. 异步队列** | ⭐⭐⭐ 中等 | ⭐⭐⭐ 良好 | $0 | ✅ | ✅ |
| **B2. 合并调用** | ⭐⭐ 较易 | ⭐⭐ 一般 | $0 | ⚠️ 可能 | ✅ |
| **B3. 缓存优化** | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐⭐ 很好 | Redis 费用 | ⚠️ 可能 | ✅ |
| **C. 混合方案** | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐⭐ 很好 | Redis 费用 | ✅ | ✅ |

---

## 🎯 推荐决策

### 如果您的项目处于以下情况，**强烈建议升级 Pro Plan**：

✅ 需要快速上线，不想花时间优化代码
✅ 用户体验优先，希望即时获得结果
✅ 未来可能需要处理更大的剧本（>10000 行）
✅ 团队有预算支持（$20/月）
✅ 需要其他 Pro 功能（团队协作、更多带宽等）

### 如果您的项目处于以下情况，**考虑优化代码**：

✅ 预算紧张，希望继续使用 Hobby Plan
✅ 有开发时间进行代码优化
✅ 用户可以接受轮询等待（5-10 秒）
✅ 技术团队有能力实现队列系统

---

## 🚀 立即行动

### 如果选择方案 A（升级 Pro）

```bash
# 1. 访问 Vercel Dashboard
https://vercel.com/[your-team]/[your-project]/settings/billing

# 2. 点击 "Upgrade to Pro"

# 3. 重新部署（确保配置生效）
git push origin feature/epic-1-rag-poc

# 4. 测试
# 在 ACT2 页面点击"获取AI解决方案提案"
# 应该在 30-60 秒内成功返回
```

### 如果选择方案 B1（异步队列）

我可以帮您实现异步队列模式，需要修改：
1. `app/api/v1/iteration/propose/route.ts` - 改为创建 Job
2. `lib/api/workflow-queue.ts` - 添加 ITERATION_PROPOSE 处理逻辑
3. `app/iteration/[projectId]/page.tsx` - 添加轮询逻辑

**预计开发时间**: 2-3 小时

---

## 📝 验证步骤

### 升级 Pro Plan 后验证

1. **检查 Vercel 配置**:
   ```bash
   vercel inspect [deployment-url]
   # 查看 Function Duration Limit 应该是 60s
   ```

2. **测试 ACT2 propose**:
   - 上传中型剧本（1000-3000 行）
   - 选择角色矛盾问题
   - 点击"获取AI解决方案提案"
   - ✅ 应该在 30-60 秒内返回结果

3. **查看 Vercel 日志**:
   ```
   函数执行时间: 35-55 秒
   状态: 200 OK
   ```

---

## 🔗 相关文档

- **Vercel Pricing**: https://vercel.com/pricing
- **Function Duration**: https://vercel.com/docs/functions/serverless-functions/runtimes#maxduration
- **vercel.json 配置**: `vercel.json`
- **propose API 实现**: `app/api/v1/iteration/propose/route.ts`
- **CharacterArchitect**: `lib/agents/character-architect.ts`

---

**创建日期**: 2025-10-10
**状态**: ⚠️ 等待用户决策
**推荐方案**: 升级 Vercel Pro Plan
**备选方案**: 实现异步队列模式

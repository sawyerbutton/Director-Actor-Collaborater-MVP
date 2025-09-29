# AI分析与修复工作流程文档 - 实际运行版本

## 重要说明 ⚠️

**本文档描述的是系统当前实际运行的流程，而不是理想设计。** 项目中存在两套代码：
1. **实际运行版本**（简化版）- 前端正在使用
2. **架构设计版本**（v1版本）- 仅存在代码中，未被使用

## 一、当前实际运行的流程

### 1.1 整体流程图

```
用户上传剧本 → 点击"开始AI分析" → 调用 /api/analysis (非v1版本)
    ↓
直接调用 DeepSeek API 或 返回模拟数据
    ↓
返回分析结果 → 存储在 localStorage → 跳转到结果页面
    ↓
用户选择接受/拒绝建议 → 点击"AI智能修复"
    ↓
调用 /api/script-repair → DeepSeek API 重写剧本
    ↓
返回修复后的剧本 → 导出为文件
```

### 1.2 前端入口 - 真实的触发点

**文件**: `app/dashboard/page.tsx`
**函数**: `handleAnalyze` (第35-74行)

```javascript
// 实际调用的API路径 - 注意不是 /api/v1/analyze
const response = await fetch('/api/analysis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scriptContent,      // 用户输入的剧本内容
    projectId: 'demo-project'  // 固定值
  })
})
```

**关键点**：
- 使用 `localStorage` 存储分析结果（非数据库）
- 直接跳转URL，没有使用React Router
- 没有用户认证，使用固定的 `demo-project`

### 1.3 后端API - 实际运行的版本

**文件**: `app/api/analysis/route.ts` （注意：不是 v1 目录下的）
**实际执行逻辑**：

```javascript
// 第81-188行的核心逻辑
const apiKey = process.env.DEEPSEEK_API_KEY

if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
  // 有真实API Key时，调用DeepSeek
  const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
    model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 2000
  })
  // 直接在prompt中要求返回JSON格式的分析结果
} else {
  // 没有API Key时，返回模拟数据（第19-78行定义的mockAnalysisResult）
  return mockAnalysisResult
}
```

**重要发现**：
- **没有使用 Agent 系统**（ConsistencyGuardian、RevisionExecutive 等类完全未被调用）
- **没有异步队列**（直接同步处理）
- **没有数据库存储**（虽然引入了 prisma，但未使用）
- 直接通过 prompt engineering 让 DeepSeek 返回结构化数据

### 1.4 分析结果的数据结构

实际返回的数据格式（第20-78行）：
```javascript
{
  id: "随机生成的ID",
  projectId: "demo-project",
  scriptContent: "原始剧本内容",
  status: "completed",
  errors: [
    {
      id: "1",
      type: "timeline_inconsistency",  // 5种类型之一
      typeName: "时间线不一致",
      severity: "high/medium/low",
      line: 5,                         // 行号
      content: "原文内容",
      description: "错误描述",
      suggestion: "修改建议",
      confidence: 0.92                // 置信度
    }
  ],
  summary: {
    totalErrors: 3,
    highSeverity: 1,
    mediumSeverity: 1,
    lowSeverity: 1
  }
}
```

## 二、修复功能的实际流程

### 2.1 前端触发修复

**文件**: `app/analysis/[id]/page.tsx`
**函数**: `handleSmartRepair` (第62-100行)

```javascript
// 调用修复API
const response = await fetch('/api/script-repair', {
  method: 'POST',
  body: JSON.stringify({
    originalScript: modifiedScript,     // 原始剧本
    acceptedErrors: acceptedErrors,     // 用户接受的修改
    rejectedErrors: rejectedErrors      // 用户拒绝的修改
  })
})
```

### 2.2 修复API实现

**文件**: `app/api/script-repair/route.ts`
**核心逻辑**：

1. **没有API Key时**（第14-24行）：
   - 返回原文 + "[模拟修复：由于未配置API，返回原文]"

2. **有API Key时**（第26-99行）：
   - 构建详细的修复prompt（第27-56行）
   - 调用DeepSeek API让其重写剧本
   - 要求AI：
     - 保持剧本风格
     - 自然衔接上下文
     - 只修复接受的问题
     - 考虑修改间的关联性

### 2.3 导出功能

**文件**: `app/analysis/[id]/page.tsx`
**函数**: `handleExport` 和 `performExport` (第102-138行)

实际行为：
- 如果有接受的修改但没修复：弹出警告
- 导出.txt格式：使用Blob和URL.createObjectURL
- .docx格式：仅显示"开发中"

## 三、未使用但存在的代码

### 3.1 Agent系统（完全未使用）

以下文件存在但**从未被调用**：
- `lib/agents/consistency-guardian.ts` - 一致性检测Agent
- `lib/agents/revision-executive.ts` - 修订执行Agent
- `lib/agents/collaboration-coordinator.ts` - 协作协调器
- `lib/analysis/incremental-engine.ts` - 增量分析引擎

**验证方法**：在 `app/api/` 目录下搜索这些类名，结果为0

### 3.2 v1版本API（未使用）

`app/api/v1/` 目录下的API存在但前端未调用：
- `/api/v1/analyze` - 带异步队列的分析API
- `/api/v1/projects` - 项目管理API
- `/api/v1/export` - 导出API

这些API有更完善的实现（验证、队列、数据库），但前端没有使用。

### 3.3 数据库功能（部分使用）

虽然配置了Prisma和PostgreSQL，但实际运行中：
- 分析结果存在 `localStorage`，不是数据库
- 用户系统使用固定的 `demo-user`
- 项目ID固定为 `demo-project`

## 四、关键问题和改进建议

### 4.1 当前系统的问题

1. **Agent系统未集成**：花费精力开发的Agent系统完全没有使用
2. **两套API并存**：造成维护困惑
3. **没有持久化**：使用localStorage，刷新会丢失
4. **没有真正的异步处理**：长文本会阻塞

### 4.2 如何激活高级功能

要使用Agent系统和v1 API，需要：

1. **修改前端调用**：
   ```javascript
   // app/dashboard/page.tsx 第44行
   // 从: const response = await fetch('/api/analysis', {
   // 改为: const response = await fetch('/api/v1/analyze', {
   ```

2. **实现状态轮询**：
   v1 API返回202状态，需要轮询获取结果

3. **集成Agent到API**：
   在 `/api/v1/analyze/route.ts` 中调用 ConsistencyGuardian

### 4.3 快速定位代码

**要修改分析逻辑**：
- 文件：`app/api/analysis/route.ts`
- 行号：86-123（DeepSeek调用部分）

**要修改修复逻辑**：
- 文件：`app/api/script-repair/route.ts`
- 行号：27-75（prompt构建和API调用）

**要修改前端流程**：
- 入口：`app/dashboard/page.tsx:35-74`
- 结果页：`app/analysis/[id]/page.tsx`

## 五、部署和环境变量

### 5.1 必需的环境变量

```bash
# 当前系统实际需要的
DEEPSEEK_API_KEY=xxx  # 没有这个将使用模拟数据

# 配置了但未使用的
DATABASE_URL=xxx      # 数据库连接
NEXTAUTH_URL=xxx      # 认证系统
NEXTAUTH_SECRET=xxx   # JWT密钥
```

### 5.2 判断系统状态

通过以下方式判断系统运行模式：
1. 检查 `process.env.DEEPSEEK_API_KEY` 是否存在
2. 存在且有效：使用真实AI分析
3. 不存在或无效：返回模拟数据

---

## 总结

**当前系统是一个简化的MVP版本**：
- 直接调用DeepSeek API，没有复杂的Agent协作
- 使用localStorage而非数据库
- 同步处理而非异步队列

**如果要使用完整功能**，需要：
1. 切换到v1 API
2. 实现前端轮询
3. 集成Agent系统到API中
4. 配置数据库连接

本文档基于代码实际运行路径编写，而非理想架构。

---

*文档更新日期: 2025-01-28*
*版本: 2.0.0 - 重写版，反映实际运行状态*
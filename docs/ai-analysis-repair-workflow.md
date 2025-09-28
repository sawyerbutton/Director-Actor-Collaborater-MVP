# AI分析与修复工作流程文档

## 概述

本文档详细描述了ScriptAI MVP系统中"开始AI分析"按钮点击后的完整执行流程，以及用户确认修复后的处理逻辑。系统采用三层架构实现：前端交互层、API服务层、AI智能处理层。

## 一、AI分析流程

### 1.1 前端触发分析

**位置**: `app/dashboard/page.tsx:35-74`

用户点击"开始AI分析"按钮后触发以下流程：

```typescript
// 1. 验证剧本内容
if (!scriptContent.trim()) {
  alert('请先输入或上传剧本内容')
  return
}

// 2. 发送分析请求到后端
const response = await fetch('/api/analysis', {
  method: 'POST',
  body: JSON.stringify({
    scriptContent,
    projectId: 'demo-project'
  })
})

// 3. 保存结果并跳转
localStorage.setItem('lastAnalysis', JSON.stringify(result.data))
window.location.href = `/analysis/${result.data.id}`
```

### 1.2 后端API处理 (简化版)

**位置**: `app/api/analysis/route.ts`

旧版API直接处理分析请求：

1. **接收并验证请求**
   - 验证剧本内容非空
   - 长度检查（建议500-5000字）

2. **调用DeepSeek API**（如配置）
   ```typescript
   // 使用deepseek-chat模型进行分析
   model: 'deepseek-chat'
   temperature: 0.7
   max_tokens: 2000
   ```

3. **分析五种错误类型**
   - `timeline_inconsistency`: 时间线不一致
   - `character_behavior`: 角色行为矛盾
   - `scene_continuity`: 场景连续性问题
   - `dialogue_logic`: 对话逻辑错误
   - `prop_inconsistency`: 道具环境不一致

4. **返回分析结果**
   ```json
   {
     "id": "analysis_id",
     "errors": [...],
     "summary": {
       "totalErrors": 3,
       "highSeverity": 1,
       "mediumSeverity": 1,
       "lowSeverity": 1
     }
   }
   ```

### 1.3 新版API处理 (v1版本)

**位置**: `app/api/v1/analyze/route.ts`

新版API采用异步队列处理：

1. **请求验证与安全检查**
   - Zod schema验证
   - XSS防护（DOMPurify）
   - 请求大小限制（10MB）
   - 用户权限验证

2. **创建分析任务**
   ```typescript
   // 创建pending状态的分析记录
   const analysis = await analysisService.create({
     projectId,
     status: 'pending'
   })

   // 添加到异步队列
   const jobId = await analysisQueue.addJob(analysis.id, scriptContent)
   ```

3. **异步处理队列**
   - 使用Job Queue模式
   - 支持重试机制（最多3次）
   - 状态轮询获取结果

### 1.4 AI Agent协作系统

**核心Agents**:

#### 1.4.1 Consistency Guardian（一致性守护者）
**位置**: `lib/agents/consistency-guardian.ts`

主要功能：
- 并行分析脚本块以提升性能
- 检测五种逻辑错误类型
- 返回置信度评分（0-1）
- 支持缓存机制（TTL）

```typescript
// 并行处理配置
MAX_CONCURRENT_CHUNKS: 3
CHUNK_SIZE: 500 // 行数
CACHE_TTL: 5分钟
```

#### 1.4.2 Revision Executive（修订执行者）
**位置**: `lib/agents/revision-executive.ts`

主要功能：
- 为检测到的错误生成修复建议
- 支持三种建议深度：basic、detailed、comprehensive
- AI输出验证确保安全性
- 重试机制处理失败情况

#### 1.4.3 Incremental Analyzer（增量分析器）
**位置**: `lib/analysis/incremental-engine.ts`

主要功能：
- Delta分析优化性能
- 维护脚本版本历史
- 仅分析变更部分

## 二、分析结果展示

### 2.1 结果页面渲染

**位置**: `app/analysis/[id]/page.tsx`

展示内容：
1. **分析概览卡片**
   - 总错误数
   - 按严重度分类统计
   - 错误类型分布

2. **错误列表**
   - 每个错误显示：
     - 严重度标签（高/中/低）
     - 错误类型
     - 所在行号
     - 置信度百分比
     - 原文内容
     - 修改建议

3. **用户交互选项**
   - 接受修改（绿色按钮）
   - 拒绝修改（灰色按钮）
   - 撤销决定

## 三、智能修复流程

### 3.1 用户触发修复

**位置**: `app/analysis/[id]/page.tsx:62-100`

触发条件：
1. 至少选择一项"接受"的修改建议
2. 点击"开始AI智能修复"按钮

### 3.2 修复API处理

**位置**: `app/api/script-repair/route.ts`

处理流程：

1. **接收修复请求**
   ```typescript
   {
     originalScript: "原始剧本内容",
     acceptedErrors: [...], // 接受的错误
     rejectedErrors: [...]  // 拒绝的错误（仅供参考）
   }
   ```

2. **构建智能修复提示**
   - 保持剧本风格和语言特色
   - 确保修改与上下文自然衔接
   - 重新组织语言而非生硬替换
   - 保留情感基调和人物性格
   - 考虑多处修改的关联性

3. **调用DeepSeek API**
   ```typescript
   model: 'deepseek-chat'
   temperature: 0.7
   max_tokens: 3000
   ```

4. **返回修复结果**
   ```json
   {
     "repairedScript": "修复后的完整剧本",
     "summary": "已智能修复 N 处问题",
     "changes": [...],
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```

### 3.3 修复结果处理

1. **预览对话框**
   - 显示完整的修复后剧本
   - 支持滚动查看
   - 提供导出选项

2. **导出功能**
   - 支持.txt格式（已实现）
   - .docx格式（开发中）
   - 文件名包含修复状态标识

### 3.4 导出警告机制

当用户有接受的修改但未进行AI修复时：
1. 弹出警告对话框
2. 提示需要先进行AI智能修复
3. 提供三个选项：
   - 立即进行AI智能修复
   - 继续导出原始剧本
   - 取消操作

## 四、文件格式支持

### 4.1 支持的格式
- `.txt` - 纯文本格式
- `.md` - Markdown格式
- `.markdown` - Markdown格式

### 4.2 不支持的格式（已弃用）
- `.fdx` - Final Draft格式
- `.fountain` - Fountain格式
- `.docx` - Word文档格式

### 4.3 格式验证
- 前端验证：`DragDropUpload`组件
- 后端验证：`ScriptParser`类
- 错误提示：明确告知不支持的格式

## 五、性能优化策略

### 5.1 并行处理
- Consistency Guardian支持并行分析
- 最多同时处理3个脚本块
- 批次处理减少API调用

### 5.2 缓存机制
- 分析结果缓存5分钟
- 使用内存缓存Map结构
- 自动清理过期缓存

### 5.3 异步队列
- 分析任务异步处理
- 支持状态轮询
- 失败重试机制

### 5.4 虚拟滚动
- 大型脚本使用虚拟滚动
- 减少DOM节点数量
- 提升渲染性能

## 六、安全措施

### 6.1 输入验证
- Zod schema验证
- 请求大小限制（10MB）
- 脚本内容长度检查

### 6.2 XSS防护
- DOMPurify清理用户输入
- AI输出验证
- 安全的HTML渲染

### 6.3 API安全
- 速率限制
- CORS配置
- 安全响应头

### 6.4 权限控制
- 用户项目访问验证
- Session认证
- 资源隔离

## 七、错误处理

### 7.1 前端错误处理
- try-catch包裹异步操作
- 用户友好的错误提示
- 失败后的重试选项

### 7.2 后端错误处理
- 标准化错误响应
- 错误分类和状态码
- 详细的错误日志

### 7.3 AI服务错误处理
- API调用失败降级
- 使用模拟数据兜底
- 重试机制（最多3次）

## 八、状态管理

### 8.1 前端状态
- LocalStorage临时存储
- React State管理UI状态
- Zustand管理全局状态

### 8.2 后端状态
- PostgreSQL持久化存储
- Prisma ORM数据访问
- 事务保证数据一致性

### 8.3 分析状态流转
```
pending → processing → completed/failed
```

## 九、用户体验优化

### 9.1 加载状态
- Loading动画
- 进度提示
- 预计时间显示

### 9.2 实时反馈
- 按钮状态变化
- 成功/错误提示
- 操作确认对话框

### 9.3 批量操作
- 一键接受所有建议
- 批量拒绝
- 重置所有决定

## 十、未来改进方向

### 10.1 功能增强
- 支持更多文件格式
- 实时协作编辑
- 版本对比功能
- AI模型选择

### 10.2 性能优化
- WebSocket实时通信
- 服务端事件推送
- CDN加速
- 数据库索引优化

### 10.3 用户体验
- 拖拽排序错误
- 键盘快捷键
- 批注功能
- 导出模板自定义

---

## 附录：关键文件清单

### 前端文件
- `/app/dashboard/page.tsx` - 主工作台页面
- `/app/analysis/[id]/page.tsx` - 分析结果页面
- `/components/upload/DragDropUpload.tsx` - 文件上传组件

### API文件
- `/app/api/analysis/route.ts` - 旧版分析API
- `/app/api/script-repair/route.ts` - 修复API
- `/app/api/v1/analyze/route.ts` - 新版分析API

### AI Agent文件
- `/lib/agents/consistency-guardian.ts` - 一致性检测
- `/lib/agents/revision-executive.ts` - 修订建议生成
- `/lib/analysis/incremental-engine.ts` - 增量分析引擎

### 工具类文件
- `/lib/api/job-queue.ts` - 异步任务队列
- `/lib/api/sanitization.ts` - 输入清理
- `/lib/parser/script-parser.ts` - 脚本解析器

### 数据库服务
- `/lib/db/services/analysis.service.ts` - 分析服务
- `/lib/db/services/project.service.ts` - 项目服务

---

*文档更新日期: 2025-01-28*
*版本: 1.0.0*
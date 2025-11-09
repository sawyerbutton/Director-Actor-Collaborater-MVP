# ACT1 Repair API 500 错误调试指南

**日期**: 2025-10-10
**接口**: POST /api/v1/projects/[id]/apply-act1-repair
**错误**: 500 Internal Server Error

---

## 🔍 已实施的修复

### 1. 后端错误处理改进
- ✅ 添加 try-catch 包裹所有逻辑
- ✅ 使用 `WorkflowStatus.ITERATING` 枚举而不是字符串
- ✅ 所有错误都返回 JSON 响应，不再 throw
- ✅ 添加详细的 console.log 日志

### 2. 前端错误处理改进
- ✅ 检查 content-type 再解析 JSON
- ✅ 处理 HTML 错误响应
- ✅ 更好的用户错误提示

---

## 🐛 如何查看 Vercel 实时日志

### 方法 1: Vercel Dashboard (推荐)

1. **访问 Vercel Dashboard**:
   ```
   https://vercel.com/[your-team]/[your-project]
   ```

2. **进入 Functions 页面**:
   - 点击顶部导航栏的 "Functions"
   - 找到 `apply-act1-repair` 函数

3. **查看实时日志**:
   - 点击函数名称
   - 选择 "Logs" 标签
   - 触发保存操作
   - 查看实时输出的 console.log 信息

4. **寻找关键日志**:
   ```
   [ACT1 Repair] Creating script version...
   [ACT1 Repair] Version created: { versionId: '...', version: 1 }
   [ACT1 Repair] Project content updated
   [ACT1 Repair] Workflow status updated to ITERATING
   ```

5. **如果看到错误**:
   ```
   [ACT1 Repair] Error: { name: '...', message: '...', stack: '...' }
   ```

### 方法 2: Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 实时查看日志
vercel logs --follow

# 触发保存操作，观察日志输出
```

---

## 🔎 常见错误原因和解决方案

### 错误 1: 数据库连接失败

**症状**:
```
Error: Can't reach database server
```

**解决方案**:
1. 检查 `DATABASE_URL` 环境变量是否正确
2. 确认使用 Connection Pooler URL (端口 6543)
3. 验证 `pgbouncer=true&connection_limit=1` 参数存在

```bash
# 在 Vercel Dashboard 检查环境变量
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### 错误 2: WorkflowStatus 状态机验证失败

**症状**:
```
Error: Invalid workflow transition from ACT1_COMPLETE to ITERATING
```

**原因**: 项目的当前 workflowStatus 不允许转换到 ITERATING

**解决方案**:
```typescript
// 检查项目当前状态
const project = await projectService.findById(projectId);
console.log('Current workflow status:', project.workflowStatus);

// 状态机允许的转换 (lib/db/services/project.service.ts:137-147):
// ACT1_COMPLETE -> ITERATING ✅
// INITIALIZED   -> ITERATING ❌
// ITERATING     -> ITERATING ✅
```

**临时修复**: 手动更新项目状态
```sql
-- 使用 Prisma Studio 或 SQL
UPDATE "Project"
SET "workflowStatus" = 'ACT1_COMPLETE'
WHERE id = 'cmgkg9tjk0001jo04piuqox2d';
```

### 错误 3: VersionManager.createVersion 失败

**症状**:
```
Error: Cannot create version: [reason]
```

**可能原因**:
1. Prisma Client 未生成
2. ScriptVersion 表不存在
3. 数据格式不匹配

**解决方案**:
```bash
# 1. 重新生成 Prisma Client
npx prisma generate

# 2. 检查数据库 schema
npx prisma db push

# 3. 验证表存在
# 在 Supabase SQL Editor:
SELECT * FROM "ScriptVersion" LIMIT 1;
```

### 错误 4: 请求体太大

**症状**:
```
Error: Request body too large
```

**原因**: 修复后的剧本内容超过 Vercel 函数请求大小限制 (4.5MB)

**解决方案**:
```typescript
// 检查请求大小
console.log('Repaired script size:', repairedScript.length);

// Vercel 限制:
// - Hobby Plan: 4.5 MB
// - Pro Plan:   4.5 MB
// - Enterprise: 自定义

// 如果剧本过大，考虑:
// 1. 压缩文本
// 2. 分块上传
// 3. 使用对象存储 (S3)
```

### 错误 5: Serverless 超时

**症状**:
```
Error: Function execution timeout
```

**原因**: 操作耗时超过 60 秒

**解决方案**:
```json
// vercel.json
{
  "functions": {
    "app/api/v1/projects/[id]/apply-act1-repair/route.ts": {
      "maxDuration": 60  // 已设置为最大值
    }
  }
}
```

**优化建议**:
1. 减少不必要的数据库查询
2. 使用批量操作
3. 考虑异步处理大文件

---

## 📊 调试检查清单

执行保存操作时，按顺序检查以下日志：

### 步骤 1: 请求到达
```
[Middleware] POST /api/v1/projects/.../apply-act1-repair
```

### 步骤 2: 验证通过
```
Body size: X bytes
Accepted errors: N
```

### 步骤 3: 项目查找
```
[ACT1 Repair] Creating script version...
{
  projectId: 'cmgkg9tjk0001jo04piuqox2d',
  scriptLength: 12345,
  errorsCount: 5
}
```

### 步骤 4: 版本创建
```
[ACT1 Repair] Version created: {
  versionId: 'clx...',
  version: 1
}
```

### 步骤 5: 内容更新
```
[ACT1 Repair] Project content updated
```

### 步骤 6: 状态更新
```
[ACT1 Repair] Workflow status updated to ITERATING
```

### 步骤 7: 成功响应
```
Response: 200 OK
{
  "success": true,
  "data": {
    "versionId": "...",
    "version": 1,
    "message": "ACT1 修复已成功保存到项目"
  }
}
```

---

## 🛠️ 手动测试 API

### 使用 curl 测试

```bash
# 1. 准备测试数据
cat > test-repair.json <<'EOF'
{
  "repairedScript": "测试修复后的剧本内容...",
  "acceptedErrors": [
    {
      "id": "error-0",
      "type": "character_inconsistency",
      "typeName": "character_inconsistency",
      "severity": "critical",
      "line": 10,
      "content": "原文内容",
      "description": "错误描述",
      "suggestion": "建议修改",
      "confidence": 0.9
    }
  ],
  "metadata": {
    "source": "ACT1_SMART_REPAIR",
    "errorCount": 1,
    "timestamp": "2025-10-10T12:00:00Z"
  }
}
EOF

# 2. 发送请求
curl -X POST https://your-app.vercel.app/api/v1/projects/cmgkg9tjk0001jo04piuqox2d/apply-act1-repair \
  -H "Content-Type: application/json" \
  -d @test-repair.json \
  -v

# 3. 检查响应
# - 200: 成功
# - 400: 验证失败
# - 404: 项目不存在
# - 500: 服务器错误
```

---

## 🔧 应急修复方案

如果持续失败，可以临时使用以下方案：

### 方案 A: 直接更新 Project.content

```typescript
// 跳过版本创建，只更新内容
await projectService.updateContent(projectId, repairedScript);
await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ITERATING);
```

### 方案 B: 本地测试

```bash
# 1. 本地启动
npm run dev

# 2. 测试 API
curl -X POST http://localhost:3001/api/v1/projects/[id]/apply-act1-repair \
  -H "Content-Type: application/json" \
  -d @test-repair.json

# 3. 查看控制台日志
```

---

## 📝 下一步行动

1. **立即执行**:
   - 部署最新修复到 Vercel
   - 在 Vercel Dashboard 打开 Functions Logs
   - 触发保存操作
   - 截图完整日志输出

2. **根据日志排查**:
   - 找到第一个错误点
   - 根据上面的"常见错误原因"部分对症下药

3. **如果还是失败**:
   - 提供完整的 Vercel 日志截图
   - 提供项目 ID
   - 提供请求体大小信息

---

**创建日期**: 2025-10-10
**状态**: 等待 Vercel 日志反馈
**下一步**: 部署并查看实时日志

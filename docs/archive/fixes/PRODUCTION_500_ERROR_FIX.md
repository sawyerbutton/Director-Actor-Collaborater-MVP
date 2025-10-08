# 生产环境 500 错误排查和修复指南

## 🔍 错误信息分析

**错误**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred"
  },
  "meta": {
    "timestamp": "2025-10-02T10:06:45.263Z",
    "version": "v1"
  }
}
```

**触发场景**: 点击"开始分析"按钮，调用 `POST /api/v1/analyze`

## 🎯 最可能的原因（按优先级）

### 1. ❌ Supabase 数据库连接失败（最高可能性）

#### 原因
- `env/.env.production` 中的 DATABASE_URL 和 DIRECT_URL **配置反了**
- Supabase 数据库已暂停（免费版会自动暂停）
- 环境变量未在 Vercel 中正确配置

#### 当前错误配置
```bash
# ❌ 错误（当前配置）
DATABASE_URL="postgresql://postgres:xYtHER5aQ4H1FObG@db.qgawrfrwfqqxjwhvvotg.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

#### 正确配置
```bash
# ✅ 正确（应该是）
DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:xYtHER5aQ4H1FObG@db.qgawrfrwfqqxjwhvvotg.supabase.co:5432/postgres"
```

**说明**:
- `DATABASE_URL` (应用运行时) = Pooler URL (端口 6543) + `?pgbouncer=true`
- `DIRECT_URL` (数据库迁移) = Direct URL (端口 5432)

### 2. ❌ DEEPSEEK_API_KEY 未配置或无效

#### 检查方法
工作流队列在提交分析任务时会验证 API key：
```typescript
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  throw new Error('DEEPSEEK_API_KEY is not configured');
}
```

### 3. ❌ demo-user 不存在于生产数据库

#### 原因
API 硬编码使用 `demo-user`:
```typescript
const userId = 'demo-user';
```

如果生产数据库未运行 seed 脚本，此用户不存在。

---

## 🛠️ 修复步骤

### 步骤 1: 检查并修复 Vercel 环境变量

#### 1.1 访问 Vercel Dashboard
1. 登录 https://vercel.com/dashboard
2. 选择您的项目
3. Settings → Environment Variables

#### 1.2 检查必需的环境变量

**必需变量**:

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Production, Preview |
| `DIRECT_URL` | `postgresql://postgres:xYtHER5aQ4H1FObG@db.qgawrfrwfqqxjwhvvotg.supabase.co:5432/postgres` | Production, Preview |
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxxxxxxxxxx` | Production, Preview |
| `NODE_ENV` | `production` | Production |

#### 1.3 如何获取正确的 Supabase URL

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 `qgawrfrwfqqxjwhvvotg`
3. Settings → Database → Connection string
4. **Transaction pooler** → 复制用于 `DATABASE_URL`（记得加 `?pgbouncer=true`）
5. **Direct connection** → 复制用于 `DIRECT_URL`

#### 1.4 更新环境变量后

1. **不要**手动触发重新部署
2. 直接在 Vercel 中点击 "Redeploy" 按钮
3. 或推送新 commit 触发自动部署

---

### 步骤 2: 重新激活 Supabase 数据库

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 `qgawrfrwfqqxjwhvvotg`
3. 如果显示 "Paused"，点击 "Resume"
4. 等待 1-2 分钟让数据库启动

---

### 步骤 3: 确保 demo-user 存在于生产数据库

#### 3.1 连接到生产数据库

使用正确的 `DIRECT_URL`：
```bash
# 本地执行
export DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres:xYtHER5aQ4H1FObG@db.qgawrfrwfqqxjwhvvotg.supabase.co:5432/postgres"

# 推送 schema
npx prisma db push

# 创建 demo-user
npx prisma db seed
```

#### 3.2 或者手动创建 demo-user

使用 psql 或 Supabase SQL Editor：
```sql
INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
VALUES (
  'demo-user',
  'demo@example.com',
  'Demo User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

---

### 步骤 4: 使用诊断 API 验证配置

#### 4.1 添加 DEBUG_SECRET

在 Vercel 环境变量中添加：
```
DEBUG_SECRET=your-secret-key-here
```

#### 4.2 访问诊断端点

部署后访问：
```
https://your-app.vercel.app/api/debug/env?secret=your-secret-key-here
```

应该看到：
```json
{
  "NODE_ENV": "production",
  "database": {
    "DATABASE_URL": {
      "exists": true,
      "prefix": "postgresql://postgres.qgawrf..."
    },
    "DIRECT_URL": {
      "exists": true,
      "prefix": "postgresql://postgres:xYtHER..."
    }
  },
  "deepseek": {
    "DEEPSEEK_API_KEY": {
      "exists": true,
      "length": 48,
      "prefix": "sk-xxxx..."
    }
  }
}
```

#### 4.3 验证后删除诊断端点

**重要**: 修复后删除 `app/api/debug/env/route.ts`，防止信息泄露。

---

### 步骤 5: 检查 Vercel 部署日志

1. Vercel Dashboard → Deployments → 点击最新部署
2. 切换到 "Functions" 标签页
3. 找到失败的 API 调用（红色标记）
4. 查看详细错误堆栈

**常见错误信息**:
- `P1001: Can't reach database server` → 数据库连接失败
- `DEEPSEEK_API_KEY is not configured` → API key 缺失
- `NotFoundError: User` → demo-user 不存在

---

## 🧪 快速验证清单

部署后依次测试：

### 1. 健康检查
```bash
curl https://your-app.vercel.app/api/health
# 预期: {"status":"ok","timestamp":"..."}
```

### 2. 环境变量检查
```bash
curl "https://your-app.vercel.app/api/debug/env?secret=your-secret"
# 预期: 所有 exists 字段都是 true
```

### 3. 创建项目测试
```bash
curl -X POST https://your-app.vercel.app/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试项目",
    "content": "测试内容\n\n场景1\n对话内容",
    "description": "测试描述"
  }'
# 预期: 返回项目 ID
```

### 4. 开始分析测试
使用步骤 3 返回的项目 ID：
```bash
curl -X POST https://your-app.vercel.app/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"projectId": "项目ID"}'
# 预期: 返回 jobId 和 status: "processing"
```

---

## 🔧 如果问题仍然存在

### 查看完整错误堆栈

在 Vercel 函数日志中查找：
```
Error: [具体错误信息]
  at [函数堆栈]
```

### 常见问题和解决方案

#### 问题 1: `P1001: Can't reach database server`
**原因**: DATABASE_URL 错误或 Supabase 暂停
**解决**:
- 检查 URL 格式（Pooler 应该是 6543 端口）
- 重新激活 Supabase 数据库

#### 问题 2: `P2025: Record not found`
**原因**: demo-user 或项目不存在
**解决**: 运行 `npx prisma db seed`

#### 问题 3: `DeepSeek API error`
**原因**: API key 无效或配额用尽
**解决**:
- 验证 API key 有效性
- 检查 DeepSeek 控制台配额

---

## 📋 更新后的环境变量配置文件

创建 `.env.production.correct` 供参考：

```bash
# Supabase Database (Correct Configuration)
DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:xYtHER5aQ4H1FObG@db.qgawrfrwfqqxjwhvvotg.supabase.co:5432/postgres"

# DeepSeek API
DEEPSEEK_API_KEY="sk-your-actual-api-key-here"
DEEPSEEK_API_URL="https://api.deepseek.com"

# Node Environment
NODE_ENV="production"

# Optional: For debugging (REMOVE after fixing)
DEBUG_SECRET="your-secret-key-for-debugging"
```

---

## ✅ 成功标志

修复成功后，您应该能够：

1. ✅ 访问 Dashboard 页面
2. ✅ 上传剧本并创建项目
3. ✅ 点击"开始分析"返回 jobId（而不是 500 错误）
4. ✅ 轮询状态显示 "PROCESSING" → "COMPLETED"
5. ✅ 查看 Act 1 诊断报告

---

**需要进一步帮助？** 请提供：
1. Vercel 函数日志中的完整错误堆栈
2. `/api/debug/env` 的输出结果
3. Supabase 数据库状态截图

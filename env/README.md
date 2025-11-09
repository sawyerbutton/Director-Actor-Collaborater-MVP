# 环境配置说明

本目录包含不同环境的配置模板文件。

---

## 📋 文件说明

| 文件 | 用途 | 何时使用 |
|------|------|----------|
| `.env.example` | 开发环境模板 | 本地开发 |
| `.env.production.example` | 生产环境模板 | Vercel部署 |

---

## 🚀 快速开始

### 1. 本地开发环境

复制开发环境模板：

```bash
cp env/.env.example .env.local
```

编辑 `.env.local` 并填入实际值：

```bash
# 数据库配置 (本地PostgreSQL)
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"

# DeepSeek API
DEEPSEEK_API_KEY=your_actual_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com

# 开发模式配置
DISABLE_RATE_LIMIT=true  # 禁用速率限制
NODE_ENV=development
```

### 2. 生产环境 (Vercel)

在Vercel Dashboard设置环境变量（不使用.env文件）：

```bash
# 数据库配置 (Supabase)
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"

# DeepSeek API
DEEPSEEK_API_KEY=your_production_api_key
DEEPSEEK_API_URL=https://api.deepseek.com

# 生产配置
NODE_ENV=production
# DISABLE_RATE_LIMIT 留空 (启用速率限制)
```

---

## 🔐 必需环境变量

### 数据库 (PostgreSQL/Prisma)

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 主数据库连接 | 见上文 |
| `DIRECT_URL` | 直连URL (迁移用) | 见上文 |

**本地开发**:
- 使用Docker PostgreSQL (见下方启动命令)
- 端口: 5432
- 用户: `director_user`
- 密码: `director_pass_2024`
- 数据库: `director_actor_db`

**生产环境 (Supabase)**:
- 使用Connection Pooler (`pooler.supabase.com:6543`)
- 必须包含 `pgbouncer=true&connection_limit=1`
- 直连URL用于数据库迁移 (端口 5432)

### AI服务 (DeepSeek)

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | https://platform.deepseek.com |
| `DEEPSEEK_API_URL` | API端点 | 固定值: `https://api.deepseek.com` |

### 开发配置 (可选)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DISABLE_RATE_LIMIT` | 禁用速率限制 | `false` (生产) / `true` (开发) |
| `NODE_ENV` | 运行环境 | `development` / `production` |

---

## 🐳 本地PostgreSQL启动

使用Docker启动本地数据库：

```bash
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 \
  postgres:16-alpine
```

初始化数据库：

```bash
npx prisma db push
npx prisma db seed  # 创建demo-user
```

---

## ⚙️ Supabase 生产配置

### 1. 创建Supabase项目

1. 访问 https://supabase.com
2. 创建新项目
3. 选择区域（建议：Singapore - 最近中国大陆）
4. 等待项目初始化完成

### 2. 获取数据库连接信息

在Supabase Dashboard:

**Settings** → **Database** → **Connection String**

- **Transaction Pooler** (用于应用连接):
  ```
  postgresql://postgres.xxx:xxx@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

- **Session Pooler** (用于迁移):
  ```
  postgresql://postgres.xxx:xxx@xxx.pooler.supabase.com:5432/postgres
  ```

### 3. 配置Vercel环境变量

在Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL = postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL = postgresql://...@pooler.supabase.com:5432/postgres
DEEPSEEK_API_KEY = sk-xxx...
DEEPSEEK_API_URL = https://api.deepseek.com
NODE_ENV = production
```

**重要**: `connection_limit=1` 是Vercel Serverless必需配置

### 4. 运行数据库迁移

```bash
# 本地执行 (连接到Supabase)
npx prisma migrate deploy

# 或在Vercel部署后，通过Supabase SQL Editor执行
```

---

## 🔍 环境变量验证

检查环境变量是否正确配置：

```bash
# 检查.env.local是否存在
ls -la .env.local

# 检查环境变量是否加载
node -e "console.log(process.env.DATABASE_URL)"

# 测试数据库连接
npx prisma db pull
```

---

## 🚨 安全注意事项

### ❌ 不要提交敏感信息到Git

确保以下文件在 `.gitignore` 中：

```gitignore
.env
.env.local
.env*.local
.env.*.backup
/env/.env*
!env/.env*.example
```

### ✅ 仅提交模板文件

可以提交的文件：
- ✅ `env/.env.example`
- ✅ `env/.env.production.example`
- ✅ `env/README.md`

**绝对不能提交**:
- ❌ `.env.local`
- ❌ `.env`
- ❌ 任何包含真实API密钥的文件

### 🔑 API密钥管理

- 使用不同的API密钥用于开发和生产
- 定期轮换API密钥
- 不要在代码中硬编码密钥
- 使用环境变量或密钥管理服务

---

## 🐛 常见问题

### 问题1: 数据库连接失败

**症状**: `Prisma Client could not connect to database`

**解决方案**:
1. 检查Docker PostgreSQL是否运行: `docker ps | grep postgres`
2. 检查 `DATABASE_URL` 是否正确
3. 检查端口5432是否被占用: `lsof -i :5432`
4. 重启PostgreSQL: `docker restart director-postgres`

### 问题2: DeepSeek API调用失败

**症状**: `API key is invalid` 或 `401 Unauthorized`

**解决方案**:
1. 检查 `DEEPSEEK_API_KEY` 是否设置
2. 验证API密钥是否有效: 访问 https://platform.deepseek.com
3. 检查API配额是否用完
4. 确认 `DEEPSEEK_API_URL` 是否正确

### 问题3: Vercel部署后环境变量未生效

**症状**: 应用无法读取环境变量

**解决方案**:
1. 在Vercel Dashboard检查环境变量是否设置
2. 确认环境变量应用于正确的环境 (Production/Preview/Development)
3. 重新部署应用 (Vercel需要重新部署才能加载新环境变量)
4. 检查Vercel部署日志

### 问题4: Supabase连接超时

**症状**: `Connection timeout` 或 `Too many connections`

**解决方案**:
1. 确认使用Connection Pooler (端口6543)
2. 添加 `?pgbouncer=true&connection_limit=1`
3. 检查Supabase项目状态
4. 增加连接超时时间配置

---

## 📚 参考文档

- **完整部署指南**: `ref/DEPLOYMENT_GUIDE.md`
- **数据库Schema**: `ref/DATABASE_SCHEMA.md`
- **架构文档**: `docs/architecture/06_DEPLOYMENT_ARCHITECTURE.md`
- **Vercel部署清单**: `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`

---

**最后更新**: 2025-11-09 (Phase 3 清理)
**维护者**: ScriptAI Team

# 🚀 Vercel + Supabase 部署指南

本指南将帮助您将 Director-Actor-Collaborater-MVP 部署到生产环境。

## 📋 目录
1. [前置准备](#前置准备)
2. [Supabase 数据库设置](#supabase-数据库设置)
3. [Vercel 项目部署](#vercel-项目部署)
4. [环境变量配置](#环境变量配置)
5. [部署后验证](#部署后验证)
6. [故障排查](#故障排查)

---

## 前置准备

### 需要注册的账号（免费）：
- [ ] GitHub 账号: https://github.com
- [ ] Vercel 账号: https://vercel.com (使用GitHub登录)
- [ ] Supabase 账号: https://supabase.com (使用GitHub登录)

### 本地准备：
```bash
# 1. 确保代码已提交到GitHub
git add .
git commit -m "准备部署到生产环境"
git push origin main

# 2. 本地测试生产构建
npm run build
# 如果构建成功，继续下一步
```

---

## 🗄️ Supabase 数据库设置

### 步骤 1: 创建新项目
1. 访问 https://app.supabase.com
2. 点击 **"New Project"**
3. 填写项目信息：
   - **Name**: director-actor-mvp
   - **Database Password**: 设置一个强密码（⚠️ 重要：请保存好这个密码！）
   - **Region**: 选择 Southeast Asia (Singapore) - 离中国最近
   - **Pricing Plan**: Free tier (免费套餐)
4. 点击 **"Create new project"** (创建需要1-2分钟)

### 步骤 2: 获取数据库连接字符串（2024年最新流程）

1. 项目创建完成后，在项目仪表板中
2. 点击顶部的 **"Connect"** 按钮（或进入 Settings → Database）
3. 您会看到三种连接字符串类型：
   - **Direct Database Connection** - 直连数据库
   - **Transaction Pooler** - 事务模式连接池（无服务器环境推荐）
   - **Session Pooler** - 会话模式连接池

#### 获取 Prisma 所需的两个连接字符串：

**方法一：使用连接字符串页面**

1. **获取 DATABASE_URL（应用运行时使用）：**
   - 选择 **"Transaction Pooler"** 选项卡
   - 复制连接字符串（端口 6543）
   - 格式：`postgresql://postgres.[项目ref]:[密码]@aws-0-[地区].pooler.supabase.com:6543/postgres`
   - 在连接字符串末尾添加 `?pgbouncer=true`

2. **获取 DIRECT_URL（数据库迁移使用）：**
   - 选择 **"Direct Database Connection"** 选项卡
   - 复制连接字符串（端口 5432）
   - 格式：`postgresql://postgres.[项目ref]:[密码]@aws-0-[地区].pooler.supabase.com:5432/postgres`

**方法二：为 Prisma 创建专用用户（推荐）**

1. 在 Supabase SQL Editor 中运行：
   ```sql
   -- 创建 Prisma 专用用户
   CREATE USER prisma_user WITH PASSWORD '生成的强密码';
   GRANT ALL PRIVILEGES ON SCHEMA public TO prisma_user;
   ```

2. 使用新用户的连接字符串

> ⚠️ **重要说明：**
> - Vercel 等无服务器环境必须使用 **Transaction Pooler**（端口 6543）作为 DATABASE_URL
> - Prisma 迁移必须使用 **Direct Connection**（端口 5432）作为 DIRECT_URL
> - Transaction 模式不支持预处理语句，需在连接字符串添加 `?pgbouncer=true`

### 步骤 3: 配置 Prisma 并初始化数据库

#### 3.1 更新 prisma/schema.prisma 文件

确保您的 schema.prisma 包含 directUrl 配置：

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")  // Transaction Pooler 连接
  directUrl = env("DIRECT_URL")    // Direct Connection 连接
}
```

#### 3.2 创建本地环境文件

```bash
# 创建 .env.production 文件
cat > .env.production << 'EOF'
# Transaction Pooler（应用运行时）
DATABASE_URL="postgresql://postgres.[你的项目ref]:[密码]@aws-0-singapore.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection（数据库迁移）
DIRECT_URL="postgresql://postgres.[你的项目ref]:[密码]@aws-0-singapore.pooler.supabase.com:5432/postgres"
EOF
```

#### 3.3 初始化数据库

```bash
# 1. 生成 Prisma Client
npx prisma generate

# 2. 推送数据库结构到 Supabase（使用 DIRECT_URL）
npx prisma db push

# 3. 验证表创建成功（可选）
npx prisma studio
```

✅ **成功标志：**
- 看到 "Your database is now in sync with your Prisma schema"
- Supabase Table Editor 中能看到创建的表

⚠️ **故障排查：**
- IPv6 连接问题：某些网络环境不支持 IPv6，可尝试使用 VPN
- 连接超时：确保 Supabase 项目已完全初始化（等待 2-3 分钟）
- 权限错误：检查数据库密码是否正确

---

## 🌐 Vercel 项目部署

### 步骤 1: 导入GitHub项目
1. 访问 https://vercel.com/dashboard
2. 点击 **"Add New..."** → **"Project"**
3. 选择 **"Import Git Repository"**
4. 找到您的仓库 `Director-Actor-Collaborater-MVP`
5. 点击 **"Import"**

### 步骤 2: 配置构建设置
在导入页面，Vercel会自动检测到Next.js项目，确认以下设置：

- **Framework Preset**: Next.js (自动检测)
- **Root Directory**: `./` (保持默认)
- **Build Command**: `npm run build` (保持默认)
- **Output Directory**: `.next` (保持默认)
- **Install Command**: `npm install` (保持默认)

**不要点击Deploy！先配置环境变量**

### 步骤 3: 配置环境变量（2024年最新要求）

在 Vercel 导入页面，展开 **"Environment Variables"** 部分：

#### 必需的环境变量

| 变量名 | 值 | 说明 | 环境 |
|--------|-----|------|------|
| `DATABASE_URL` | Transaction Pooler 连接 + `?pgbouncer=true` | 应用运行时连接（端口 6543） | Production, Preview, Development |
| `DIRECT_URL` | Direct Connection 连接 | Prisma 迁移连接（端口 5432） | Production, Preview, Development |
| `DEEPSEEK_API_KEY` | `sk-xxxxx` | DeepSeek API 密钥 | Production, Preview |
| `DEEPSEEK_API_ENDPOINT` | `https://api.deepseek.com/v1` | API 端点 | Production, Preview |
| `NODE_ENV` | `production` | 环境标识 | Production |
| `NEXT_PUBLIC_APP_URL` | 暂时留空 | 部署后填写实际 URL | Production |

#### 添加步骤：

1. 逐个输入变量名和值
2. 选择变量应用的环境（Production/Preview/Development）
3. 点击 "Add" 添加每个变量
4. **确认所有 6 个变量都已添加**
5. 点击 "Deploy" 开始部署

#### 正确的连接字符串格式：

```env
# ✅ 正确格式
DATABASE_URL="postgresql://postgres.xxx:[密码]@aws-0-singapore.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[密码]@aws-0-singapore.pooler.supabase.com:5432/postgres"

# ❌ 错误格式（缺少 pgbouncer 参数）
DATABASE_URL="postgresql://postgres.xxx:[密码]@aws-0-singapore.pooler.supabase.com:6543/postgres"
```

> ⚠️ **2024 年重要更新：**
> - 环境变量修改后**必须重新部署**才能生效
> - 客户端变量必须以 `NEXT_PUBLIC_` 开头
> - 可使用 `vercel env pull` 同步本地环境变量

### 步骤 4: 部署项目
1. 确认所有环境变量已添加
2. 点击 **"Deploy"** 按钮
3. 等待部署完成（通常需要2-5分钟）
4. 部署成功后，您会看到：
   - ✅ Building
   - ✅ Deploying
   - ✅ Deployed

### 步骤 5: 获取部署URL
部署完成后：
1. 记录您的应用URL：`https://[项目名].vercel.app`
2. 返回Vercel项目设置
3. 更新 `NEXT_PUBLIC_APP_URL` 环境变量为实际的部署URL
4. 重新部署以应用更改

---

## 🔧 环境变量配置详解

### 在Vercel中更新环境变量：
1. 进入项目仪表板
2. 点击 **"Settings"** → **"Environment Variables"**
3. 添加或修改变量
4. 点击 **"Save"**
5. 需要重新部署才能生效：
   - 点击 **"Deployments"** 标签
   - 点击最新部署旁的三个点
   - 选择 **"Redeploy"**

### 环境变量完整模板（2024年版）：

```env
# === Supabase 数据库配置 ===
# Transaction Pooler（无服务器环境必需，端口 6543）
DATABASE_URL="postgresql://postgres.[项目ref]:[密码]@aws-0-singapore.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection（Prisma 迁移必需，端口 5432）
DIRECT_URL="postgresql://postgres.[项目ref]:[密码]@aws-0-singapore.pooler.supabase.com:5432/postgres"

# === DeepSeek API 配置 ===
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1

# === 应用配置 ===
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://[项目名].vercel.app  # 部署成功后更新
```

#### 2024 年关键更新：

1. **连接池模式选择：**
   - **Transaction Mode**（端口 6543）：用于无服务器/边缘函数
   - **Session Mode**（端口 5432）：用于持久连接
   - **Direct Connection**：仅用于迁移和开发

2. **Prisma 配置要求：**
   - 必须在 schema.prisma 中同时配置 `url` 和 `directUrl`
   - Transaction 模式必须添加 `?pgbouncer=true` 参数

3. **Vercel 部署注意：**
   - 环境变量更改后必须重新部署
   - 使用 `vercel env pull` 保持本地同步
   - 客户端变量必须以 `NEXT_PUBLIC_` 开头

---

## ✅ 部署后验证

### 1. 基础功能检查
访问您的应用URL，检查：
- [ ] 主页正常加载
- [ ] 页面样式正常显示
- [ ] 没有控制台错误

### 2. API健康检查
在浏览器访问：
```
https://你的应用.vercel.app/api/health
```
应该返回：`{"status":"ok"}`

### 3. 数据库连接验证
1. 在Supabase仪表板查看 **"Database"** → **"Tables"**
2. 确认所有表已创建（通过Prisma迁移）

### 4. 查看部署日志
在Vercel仪表板：
1. 点击 **"Functions"** 标签
2. 查看API路由的调用日志
3. 点击 **"Logs"** 查看实时日志

---

## 🔧 故障排查

### 常见问题和解决方案：

#### 1. 构建失败
**错误**: `Build error occurred`
```bash
# 本地测试构建
npm run build

# 检查TypeScript错误
npm run typecheck

# 清理缓存重试
rm -rf .next node_modules
npm install
npm run build
```

#### 2. 数据库连接失败
**错误**: `Can't reach database server`
- 检查DATABASE_URL格式是否正确
- 确认Supabase项目状态为Active
- 验证密码是否正确（注意特殊字符需要URL编码）

#### 3. 500错误
**错误**: `500 Internal Server Error`
1. 查看Vercel Functions日志
2. 检查环境变量是否都已设置
3. 查看浏览器控制台错误信息

#### 4. Prisma 错误（2024 常见问题）

**错误**: `The table does not exist`
```bash
# 使用 DIRECT_URL 进行数据库推送
DIRECT_URL="你的直连字符串" npx prisma db push
```

**错误**: `prepared statement "s0" does not exist`
- 原因：Transaction 模式不支持预处理语句
- 解决：确保 DATABASE_URL 包含 `?pgbouncer=true`

**错误**: `P1001: Can't reach database server`
- 检查 IPv6 支持（某些网络不支持）
- 使用 Session Pooler 代替 Direct Connection
- 确认端口号正确（6543 vs 5432）

#### 5. API调用失败
**错误**: `Failed to fetch`
- 确认DEEPSEEK_API_KEY正确
- 检查API端点URL
- 查看网络请求详情

---

## 📝 2024 部署检查清单

### ✅ 第一步：Supabase 准备
- [ ] 创建 Supabase 项目，保存数据库密码
- [ ] 等待项目完全初始化（2-3分钟）
- [ ] 从 Connect 按钮获取两个连接字符串：
  - [ ] Transaction Pooler URL（端口 6543）
  - [ ] Direct Connection URL（端口 5432）
- [ ] 在 DATABASE_URL 末尾添加 `?pgbouncer=true`
- [ ] 更新 prisma/schema.prisma 添加 `directUrl`
- [ ] 本地运行 `npx prisma db push` 成功

### ✅ 第二步：Vercel 配置
- [ ] GitHub 仓库已准备好
- [ ] 在 Vercel 导入项目
- [ ] 添加所有 6 个环境变量
- [ ] 选择正确的环境（Production/Preview）
- [ ] 确认 DATABASE_URL 包含 `?pgbouncer=true`
- [ ] 点击 Deploy 开始部署

### ✅ 第三步：部署验证
- [ ] 部署成功完成
- [ ] 获取部署 URL
- [ ] 更新 NEXT_PUBLIC_APP_URL 环境变量
- [ ] 触发重新部署（Redeploy）
- [ ] 访问 `/api/health` 验证 API
- [ ] 测试数据库连接
- [ ] 测试 DeepSeek API 调用

### ✅ 第四步：后续优化
- [ ] 使用 `vercel env pull` 同步本地环境
- [ ] 配置自定义域名（可选）
- [ ] 启用 Vercel Analytics（可选）
- [ ] 设置监控和告警（可选）

---

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**：
   - Vercel: Dashboard → Functions → Logs
   - Supabase: Dashboard → Logs → API

2. **调试模式**：
   在Vercel环境变量添加：
   ```
   DEBUG=true
   ```

3. **社区支持**：
   - Vercel Discord: https://vercel.com/discord
   - Supabase Discord: https://discord.supabase.com

4. **文档参考**：
   - Vercel文档: https://vercel.com/docs
   - Supabase文档: https://supabase.com/docs
   - Next.js部署: https://nextjs.org/docs/deployment

---

## 🎉 部署成功后

恭喜！您的应用已成功部署。接下来可以：

1. **配置自定义域名**（可选）：
   - Vercel Dashboard → Settings → Domains
   - 添加您的域名

2. **设置环境分支**：
   - 为开发和生产环境设置不同的分支
   - main分支自动部署到生产环境

3. **监控和分析**：
   - 启用Vercel Analytics
   - 查看性能指标

4. **备份策略**：
   - Supabase自动每日备份（免费套餐7天）
   - 定期导出重要数据

---

**祝您部署顺利！** 🚀

如有任何问题，请参考上述故障排查部分或查看官方文档。
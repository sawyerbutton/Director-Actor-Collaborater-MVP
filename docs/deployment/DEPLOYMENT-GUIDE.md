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

### 步骤 2: 获取数据库连接字符串（2024年12月最新）

1. 项目创建完成后，在项目仪表板中
2. 点击顶部的 **"Connect"** 按钮
3. 选择 **"ORMs"** 选项卡
4. 选择 **"Prisma"**
5. Supabase 会自动生成两个连接字符串

#### 📝 复制连接字符串：

Supabase 会显示如下格式的环境变量（直接复制即可）：

```bash
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.[项目ref]:[密码]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.[项目ref]:[密码]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**⚠️ 重要提示：**
- 如果密码显示为 `[YOUR-PASSWORD]` 或带有方括号 `[密码]`，需要去掉方括号
- DATABASE_URL 使用端口 **6543**（连接池）
- DIRECT_URL 使用端口 **5432**（直连）
- DATABASE_URL 必须包含 `?pgbouncer=true` 参数

#### 实际示例：

```bash
# ✅ 正确格式（注意没有方括号）
DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ❌ 错误格式（密码带方括号）
DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:[xYtHER5aQ4H1FObG]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

> 📌 **关键要点：**
> - Vercel 等无服务器环境必须使用 **Transaction Pooler**（端口 6543）作为 DATABASE_URL
> - Prisma 迁移必须使用 **Direct Connection**（端口 5432）作为 DIRECT_URL
> - Transaction 模式不支持预处理语句，必须添加 `?pgbouncer=true`
> - 区域可能是 `aws-0` 或 `aws-1`，取决于您的项目创建时间

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
# 创建 .env 文件（如果还没有）
cp .env.example .env

# 编辑 .env 文件，添加从 Supabase 复制的连接字符串
```

确保您的 `.env` 文件包含：

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_VERSION=v1

# Database - 从 Supabase ORMs → Prisma 复制
DATABASE_URL="postgresql://postgres.你的项目ref:密码@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.你的项目ref:密码@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# DeepSeek API Configuration
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_API_URL=https://api.deepseek.com
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

⚠️ **常见问题及解决方案：**

1. **密码格式问题**
   - 错误：`FATAL: Tenant or user not found`
   - 解决：确保密码没有方括号 `[]`，直接使用原始密码

2. **连接失败问题**
   - 错误：`P1001: Can't reach database server`
   - 解决：
     - 检查是否使用了正确的连接字符串格式
     - 确认项目 region（aws-0 或 aws-1）
     - 等待 Supabase 项目完全初始化（2-3分钟）

3. **端口错误**
   - 确保 DATABASE_URL 使用端口 6543
   - 确保 DIRECT_URL 使用端口 5432
   - 不要混用端口号

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
| `DATABASE_URL` | 从 Supabase 复制（含 `?pgbouncer=true`） | 应用运行时连接（端口 6543） | Production, Preview, Development |
| `DIRECT_URL` | 从 Supabase 复制 | Prisma 迁移连接（端口 5432） | Production, Preview, Development |
| `DEEPSEEK_API_KEY` | 您的 DeepSeek API 密钥 | AI 服务密钥 | Production, Preview |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com` | API 基础 URL（注意：不是 /v1） | Production, Preview |
| `NODE_ENV` | `production` | 环境标识 | Production |
| `NEXT_PUBLIC_APP_URL` | 暂时留空 | 部署后填写实际 URL | Production |
| `NEXT_PUBLIC_API_VERSION` | `v1` | API 版本 | Production, Preview |

#### 添加步骤：

1. 逐个输入变量名和值
2. 选择变量应用的环境（Production/Preview/Development）
3. 点击 "Add" 添加每个变量
4. **确认所有 6 个变量都已添加**
5. 点击 "Deploy" 开始部署

#### 添加环境变量的具体步骤：

1. **从 Supabase 复制连接字符串**
   - 进入 Supabase → Connect → ORMs → Prisma
   - 复制两行连接字符串
   - **重要**：去掉密码中的方括号（如果有）

2. **在 Vercel 中添加变量**
   - 逐个添加每个环境变量
   - Key 输入变量名（如 `DATABASE_URL`）
   - Value 粘贴对应的值
   - 选择应用环境（通常全选）
   - 点击 "Add"

3. **验证格式**
   ```env
   # ✅ 正确格式（注意密码没有方括号）
   DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:xYtHER5aQ4H1FObG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

   # ❌ 错误格式（密码有方括号）
   DATABASE_URL="postgresql://postgres.qgawrfrwfqqxjwhvvotg:[xYtHER5aQ4H1FObG]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
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
DEEPSEEK_API_URL=https://api.deepseek.com  # 注意：是 API_URL 不是 API_ENDPOINT

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
- **原因 1**：密码格式错误（包含方括号）
  - 解决：去掉密码中的 `[]`
- **原因 2**：使用了旧的连接字符串格式
  - 解决：使用 Supabase ORMs 选项卡提供的新格式
- **原因 3**：端口号错误
  - 解决：DATABASE_URL 用 6543，DIRECT_URL 用 5432
- **原因 4**：区域错误
  - 解决：确认是 aws-0 还是 aws-1

**错误**: `FATAL: Tenant or user not found`
- 原因：连接字符串格式不正确
- 解决：从 Supabase ORMs → Prisma 重新复制

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

## 🛠️ 实用工具脚本

### 部署前检查脚本

运行以下命令进行部署前检查：

```bash
# 运行部署前检查
./scripts/pre-deploy-check.sh
```

该脚本会自动检查：
- ✅ 环境变量格式是否正确
- ✅ 数据库连接字符串端口号
- ✅ pgbouncer 参数是否存在
- ✅ 密码格式（无方括号）
- ✅ Prisma 配置
- ✅ 数据库连接测试
- ✅ 生产构建测试

---

## 📚 关键经验总结

根据实际部署经验，以下是最重要的注意事项：

1. **Supabase 连接字符串**
   - 必须从 ORMs → Prisma 选项卡复制
   - 密码中的方括号 `[]` 必须去掉
   - DATABASE_URL 必须包含 `?pgbouncer=true`

2. **环境变量名称**
   - 使用 `DEEPSEEK_API_URL` 而不是 `DEEPSEEK_API_ENDPOINT`
   - 值是 `https://api.deepseek.com` 不带 `/v1`

3. **端口号区分**
   - DATABASE_URL: 端口 6543（连接池）
   - DIRECT_URL: 端口 5432（直连）

4. **Vercel 部署**
   - 修改环境变量后必须重新部署
   - 构建命令需要包含 `npx prisma generate`

---

**祝您部署顺利！** 🚀

如有任何问题，请参考上述故障排查部分或查看官方文档。
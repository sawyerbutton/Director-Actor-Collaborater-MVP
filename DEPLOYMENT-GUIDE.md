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
   - **Project name**: director-actor-mvp
   - **Database Password**: 设置一个强密码（保存好！）
   - **Region**: 选择 Southeast Asia (新加坡) - 离中国最近
   - **Pricing Plan**: Free (免费套餐)
4. 点击 **"Create new project"** (创建需要1-2分钟)

### 步骤 2: 获取数据库连接字符串
1. 项目创建完成后，进入项目仪表板
2. 点击左侧菜单的 **"Settings"** (设置)
3. 点击 **"Database"**
4. 找到 **"Connection string"** 部分
5. 选择 **"URI"** 标签
6. 复制连接字符串，格式如下：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

   > ⚠️ 注意：将 `[YOUR-PASSWORD]` 替换为您在步骤1设置的数据库密码

### 步骤 3: 初始化数据库结构
在本地终端运行：

```bash
# 1. 创建临时环境文件用于数据库迁移
echo "DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > .env.production

# 2. 运行Prisma迁移
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 3. 生成Prisma客户端
npx prisma generate

# 4. (可选) 验证数据库连接
npx prisma db push
```

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

### 步骤 3: 配置环境变量
在同一页面，展开 **"Environment Variables"** 部分：

添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| DATABASE_URL | `postgresql://postgres:[密码]@db.[项目REF].supabase.co:5432/postgres` | Supabase数据库连接 |
| DIRECT_URL | 同上 | Prisma需要的直连URL |
| DEEPSEEK_API_KEY | `sk-xxxxx` | 您的DeepSeek API密钥 |
| DEEPSEEK_API_ENDPOINT | `https://api.deepseek.com/v1` | DeepSeek API端点 |
| NODE_ENV | `production` | 生产环境标识 |
| NEXT_PUBLIC_APP_URL | `https://[你的项目名].vercel.app` | 应用URL(部署后更新) |

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

### 环境变量清单：
```env
# 数据库配置（Supabase）
DATABASE_URL=postgresql://postgres:你的密码@db.项目ref.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:你的密码@db.项目ref.supabase.co:5432/postgres

# DeepSeek API配置
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1

# 应用配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://你的应用.vercel.app
```

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

#### 4. Prisma错误
**错误**: `The table does not exist`
```bash
# 重新运行迁移
DATABASE_URL="你的连接字符串" npx prisma migrate deploy
DATABASE_URL="你的连接字符串" npx prisma generate
```

#### 5. API调用失败
**错误**: `Failed to fetch`
- 确认DEEPSEEK_API_KEY正确
- 检查API端点URL
- 查看网络请求详情

---

## 📝 部署检查清单

### 部署前：
- [ ] 代码已推送到GitHub
- [ ] 本地构建测试通过
- [ ] 环境变量已准备

### Supabase设置：
- [ ] 项目创建成功
- [ ] 数据库密码已保存
- [ ] 连接字符串已获取
- [ ] 数据库迁移成功

### Vercel部署：
- [ ] 项目导入成功
- [ ] 环境变量已配置
- [ ] 首次部署成功
- [ ] 应用URL可访问

### 验证测试：
- [ ] 主页加载正常
- [ ] API端点响应
- [ ] 数据库连接正常
- [ ] 功能测试通过

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
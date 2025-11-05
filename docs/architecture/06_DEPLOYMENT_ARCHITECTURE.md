# 06 - 部署架构文档

**版本**: 1.0.0
**更新日期**: 2025-10-11
**状态**: 生产就绪 ✅

---

## 📋 目录

1. [部署概览](#1-部署概览)
2. [本地开发环境](#2-本地开发环境)
3. [Vercel生产部署](#3-vercel生产部署)
4. [Supabase数据库](#4-supabase数据库)
5. [环境变量配置](#5-环境变量配置)
6. [监控与日志](#6-监控与日志)
7. [故障排查](#7-故障排查)

---

## 1. 部署概览

### 1.1 架构图

```
[用户浏览器]
     ↓
[Vercel Edge Network]
     ↓
[Next.js Serverless Functions]
     ↓
[Supabase PostgreSQL]
     ↓
[DeepSeek API]
```

### 1.2 服务清单

| 服务 | 提供商 | 用途 | 费用 |
|-----|-------|------|------|
| **前端+API** | Vercel | Next.js托管 | Pro Plan ($20/月) |
| **数据库** | Supabase | PostgreSQL | Free/Pro ($25/月) |
| **AI服务** | DeepSeek | LLM API | 按Token计费 |
| **本地开发** | Docker | PostgreSQL | 免费 |

### 1.3 网络流量

**生产环境**:
- 用户 → Vercel CDN (全球)
- Vercel → Supabase (Pooler: port 6543)
- Vercel → DeepSeek API (HTTPS)

**本地环境**:
- 浏览器 → localhost:3000
- Next.js → localhost:5432 (Docker PostgreSQL)
- Next.js → DeepSeek API (HTTPS)

---

## 2. 本地开发环境

### 2.1 系统要求

- **Node.js**: 18.17+
- **npm**: 9.0+
- **Docker**: 20.0+（用于PostgreSQL）
- **WSL2** (Windows) / **macOS** / **Linux**

### 2.2 安装步骤

#### Step 1: 克隆代码
```bash
git clone https://github.com/your-org/Director-Actor-Collaborater-MVP.git
cd Director-Actor-Collaborater-MVP
```

#### Step 2: 安装依赖
```bash
npm install
```

#### Step 3: 启动PostgreSQL
```bash
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 \
  postgres:16-alpine
```

**检查运行状态**:
```bash
docker ps
# 应该看到 director-postgres 容器 (Up)
```

#### Step 4: 配置环境变量

创建 `.env` 文件：
```bash
# Database
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"

# DeepSeek API
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com

# Development
DISABLE_RATE_LIMIT=true
NODE_ENV=development
```

#### Step 5: 初始化数据库
```bash
# 应用Schema
npx prisma db push

# 生成Prisma Client
npx prisma generate

# 种子数据（创建demo-user）
npx prisma db seed
```

#### Step 6: 启动开发服务器
```bash
npm run dev
```

访问: http://localhost:3000/dashboard

**端口冲突处理**: Next.js自动递增（3000 → 3001 → 3002...）

### 2.3 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 类型检查和格式化
npm run typecheck        # TypeScript类型检查
npm run lint             # ESLint检查
npm run check:all        # typecheck + lint + build

# 测试
npm test                 # 单元测试
npm run test:watch       # 测试监听模式
npm run test:e2e         # E2E测试

# 数据库
npx prisma studio        # 打开Prisma Studio GUI
npx prisma db push       # 推送Schema变更
npx prisma migrate dev   # 创建迁移
npx prisma db seed       # 种子数据
```

---

## 3. Vercel生产部署

### 3.1 前提条件

**Vercel账号要求**:
- ✅ **Vercel Pro Plan** ($20/月)
  - 原因: 需要60秒函数超时（Hobby限制10秒）
  - ACT1分析、ACT2-5迭代、合成都需要>10秒

**部署检查清单**:
- [ ] Vercel Pro Plan已激活
- [ ] Supabase数据库已创建
- [ ] DeepSeek API Key已获取
- [ ] 环境变量已配置

### 3.2 Vercel配置文件

**vercel.json**:
```json
{
  "framework": "nextjs",
  "buildCommand": "npx prisma generate && npm run build",
  "installCommand": "npm install",
  "functions": {
    "app/api/v1/analyze/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/analyze/process/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/iteration/propose/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/iteration/execute/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/synthesize/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "DATABASE_URL": "@database-url",
    "DIRECT_URL": "@direct-url",
    "DEEPSEEK_API_KEY": "@deepseek-api-key"
  }
}
```

**关键配置**:
- `maxDuration: 60`: 60秒函数超时（Pro Plan必需）
- `buildCommand`: 先生成Prisma Client，再构建
- 环境变量用`@`引用（Vercel Secrets）

### 3.3 部署步骤

#### Step 1: 推送代码到GitHub
```bash
git add .
git commit -m "feat: production ready"
git push origin main
```

#### Step 2: 连接Vercel

访问 https://vercel.com/new

1. 选择GitHub仓库
2. 选择框架: **Next.js**
3. Root Directory: `./`

#### Step 3: 配置环境变量

在Vercel Dashboard → Project Settings → Environment Variables:

| 变量名 | 值 | 环境 |
|--------|---|------|
| `DATABASE_URL` | `postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1` | Production |
| `DIRECT_URL` | `postgresql://...:5432/postgres` | Production |
| `DEEPSEEK_API_KEY` | `sk-...` | All |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com` | All |
| `DISABLE_RATE_LIMIT` | `false` | Production |

**注意**:
- `DATABASE_URL`: 使用Pooler端口6543（含pgbouncer参数）
- `DIRECT_URL`: 使用直连端口5432（用于迁移）

#### Step 4: 触发部署

点击 **Deploy** 按钮

**构建流程**:
```
1. Install dependencies (npm install)
2. Generate Prisma Client (npx prisma generate)
3. Build Next.js (npm run build)
4. Deploy to Edge Network
```

**预期时间**: 2-5分钟

#### Step 5: 运行数据库迁移

部署后，在本地执行：
```bash
# 设置生产数据库URL
export DATABASE_URL="postgresql://...:5432/postgres"

# 应用迁移
npx prisma migrate deploy

# 种子数据（创建demo-user）
npx prisma db seed
```

### 3.4 部署验证

#### 健康检查
```bash
# 检查API可用性
curl https://your-app.vercel.app/api/v1/projects

# 应返回:
# {"success":true,"data":{"items":[],"pagination":{...}}}
```

#### 完整流程测试
1. 访问 https://your-app.vercel.app/dashboard
2. 上传测试剧本（500-1000字）
3. 启动ACT1分析
4. 等待30-60秒，检查结果
5. 进入迭代页面
6. 测试ACT2-5提案生成

### 3.5 持续部署

**自动部署**（已配置）:
- Push到`main`分支 → 自动部署生产环境
- Push到其他分支 → 自动部署预览环境

**手动部署**:
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

---

## 4. Supabase数据库

### 4.1 创建项目

1. 访问 https://supabase.com/dashboard
2. 点击 **New Project**
3. 填写信息：
   - Name: `director-actor-mvp`
   - Database Password: 强密码（保存！）
   - Region: `East Asia (Singapore)` 或 最近的区域
4. 等待2-3分钟初始化

### 4.2 连接信息

在Project Settings → Database → Connection String:

**Transaction Pooler（推荐用于Vercel）**:
```
postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Session Pooler**:
```
postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Direct Connection（用于迁移）**:
```
postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 4.3 连接池配置

**为什么需要Pooler？**

Serverless函数每次调用创建新连接 → 连接数爆炸 → 数据库崩溃

**解决方案**: pgbouncer连接池

**配置**:
```
DATABASE_URL="...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

**参数说明**:
- `pooler.supabase.com:6543`: Transaction Pooler端口
- `pgbouncer=true`: 启用连接池
- `connection_limit=1`: 每Serverless函数限1连接

### 4.4 数据库迁移

**开发环境**（使用db push）:
```bash
npx prisma db push
```

**生产环境**（使用migrations）:
```bash
# 1. 本地创建迁移
npx prisma migrate dev --name init

# 2. 推送到生产（使用DIRECT_URL）
export DATABASE_URL="postgresql://...@db.xxx.supabase.co:5432/postgres"
npx prisma migrate deploy
```

**关键区别**:
- `db push`: 快速开发，不保留历史
- `migrate deploy`: 生产环境，版本控制

### 4.5 数据库监控

Supabase Dashboard → Database → Logs:

- **Connections**: 当前连接数（应<100）
- **Queries**: 慢查询识别
- **Errors**: 错误日志

**告警设置**:
- 连接数>80 → 邮件通知
- 慢查询>5秒 → 优化索引

---

## 5. 环境变量配置

### 5.1 环境变量清单

| 变量名 | 本地开发 | Vercel生产 | 说明 |
|--------|---------|-----------|------|
| `DATABASE_URL` | localhost:5432 | pooler:6543 | Prisma连接（Pooler） |
| `DIRECT_URL` | localhost:5432 | db:5432 | 迁移连接（Direct） |
| `DEEPSEEK_API_KEY` | sk-... | sk-... | AI API密钥 |
| `DEEPSEEK_API_URL` | https://api.deepseek.com | 同左 | AI API地址 |
| `DISABLE_RATE_LIMIT` | true | false | 开发环境禁用限流 |
| `NODE_ENV` | development | production | 环境标识 |

### 5.2 安全实践

**❌ 不要**:
- 将`.env`文件提交到Git
- 在代码中硬编码密钥
- 在客户端暴露API密钥

**✅ 要**:
- 使用`.env.local`（Git忽略）
- 使用Vercel Secrets管理生产密钥
- 所有敏感变量用`process.env`

**`.gitignore`**:
```
.env
.env.local
.env.*.local
```

### 5.3 Vercel Secrets管理

**创建Secret**:
```bash
# 方法1: CLI
vercel env add DATABASE_URL

# 方法2: Dashboard
# Vercel Dashboard → Settings → Environment Variables → Add
```

**使用Secret**:
```json
// vercel.json
{
  "env": {
    "DATABASE_URL": "@database-url"  // 引用名为 database-url 的 secret
  }
}
```

---

## 6. 监控与日志

### 6.1 Vercel日志

**访问路径**: Vercel Dashboard → Project → Deployments → Logs

**日志类型**:
- **Build Logs**: 构建过程日志（npm install, prisma generate, build）
- **Function Logs**: 运行时日志（console.log, console.error）
- **Edge Logs**: CDN访问日志

**关键指标**:
- 函数执行时间（应<60秒）
- 错误率（应<5%）
- 冷启动时间（应<2秒）

### 6.2 应用日志规范

**日志级别**:
```typescript
console.log('[INFO] Normal operation')       // 信息
console.warn('[WARN] Potential issue')       // 警告
console.error('[ERROR] Operation failed')    // 错误
```

**结构化日志**:
```typescript
console.log('[ConsistencyGuardian]', {
  action: 'analyze',
  projectId: 'clxxx',
  scriptLength: 5000,
  duration: 1234,
  errorsFound: 5,
  timestamp: new Date().toISOString()
});
```

### 6.3 错误追踪

**Vercel集成（可选）**:
- **Sentry**: 错误追踪和性能监控
- **LogRocket**: 用户会话回放
- **Datadog**: 全栈监控

**安装Sentry示例**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 6.4 性能监控

**Vercel Analytics（内置）**:
- Core Web Vitals (LCP, FID, CLS)
- 页面加载时间
- API响应时间

**自定义性能指标**:
```typescript
// 记录AI调用时间
const startTime = Date.now();
const result = await agent.analyze(script);
const duration = Date.now() - startTime;

console.log('[Performance]', {
  operation: 'ACT1_ANALYSIS',
  duration,
  scriptLength: script.length,
  errorsFound: result.errors.length
});
```

---

## 7. 故障排查

### 7.1 常见问题

#### 问题1: 504 Gateway Timeout

**症状**: API调用超时，返回504错误

**可能原因**:
1. Vercel Hobby Plan（10秒限制）
2. AI分析时间过长（>60秒）
3. 数据库查询慢

**排查步骤**:
```bash
# 1. 检查Vercel Plan
# Dashboard → Settings → Plan → 确认是 Pro Plan

# 2. 检查函数超时配置
# vercel.json → functions → maxDuration: 60

# 3. 检查日志
# Dashboard → Deployments → Function Logs
# 查找 "Task timed out after 10.00 seconds"

# 4. 检查数据库连接
# 测试查询速度
npx prisma studio
```

**解决方案**:
- 升级到Vercel Pro Plan
- 优化AI Prompt（减少Token）
- 添加数据库索引

---

#### 问题2: Job卡在QUEUED状态

**症状**: 分析Job创建后一直QUEUED，不转为PROCESSING

**可能原因**:
1. WorkflowQueue未运行（Serverless环境）
2. 未调用手动触发端点

**排查步骤**:
```bash
# 1. 检查Job状态
# Prisma Studio → AnalysisJob表 → status字段

# 2. 检查是否Serverless环境
# Vercel Logs → 查找 "Serverless mode: manual trigger required"

# 3. 检查前端是否调用 triggerProcessing()
# 前端代码 → v1ApiService.triggerProcessing()
```

**解决方案**:
```typescript
// 确保轮询前调用 triggerProcessing()
useEffect(() => {
  const poll = async () => {
    await v1ApiService.triggerProcessing();  // ✅ 关键
    const status = await v1ApiService.getJobStatus(jobId);
  };
  setInterval(poll, 5000);
}, [jobId]);
```

---

#### 问题3: Prisma Client未生成

**症状**: 构建失败，提示 `@prisma/client` not found

**可能原因**:
1. `postinstall`脚本未运行
2. `vercel.json` buildCommand配置错误

**排查步骤**:
```bash
# 1. 本地测试生成
npx prisma generate

# 2. 检查 package.json
# 确认有 "postinstall": "npx prisma generate"

# 3. 检查 vercel.json
# buildCommand应包含 "npx prisma generate"
```

**解决方案**:
```json
// vercel.json
{
  "buildCommand": "npx prisma generate && npm run build"
}
```

---

#### 问题4: 数据库连接池耗尽

**症状**: `Error: P2024: Timed out fetching a connection from the pool`

**可能原因**:
1. 未使用Connection Pooler
2. `connection_limit`设置过高
3. 连接泄漏（未关闭）

**排查步骤**:
```bash
# 1. 检查DATABASE_URL
echo $DATABASE_URL
# 应包含 "pooler.supabase.com:6543" 和 "pgbouncer=true"

# 2. 检查Supabase连接数
# Supabase Dashboard → Database → Connections
# 应 < 100 (Free Plan限制)

# 3. 检查代码是否有连接泄漏
# 搜索 prisma.$connect() 未匹配的 prisma.$disconnect()
```

**解决方案**:
```typescript
// ✅ 使用 Pooler URL
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

// ✅ Prisma自动管理连接（不需要手动disconnect）
const result = await prisma.project.findMany();
```

---

#### 问题5: CORS错误

**症状**: 前端请求API时报CORS错误

**可能原因**:
1. API未设置CORS头
2. Vercel域名与请求源不匹配

**排查步骤**:
```bash
# 1. 检查浏览器控制台
# 应看到具体的CORS错误信息

# 2. 检查Vercel域名
# Dashboard → Domains → 确认域名

# 3. 测试API
curl -I https://your-app.vercel.app/api/v1/projects
# 查看响应头 Access-Control-Allow-Origin
```

**解决方案**:
```typescript
// middleware/index.ts
if (process.env.NODE_ENV === 'development') {
  // 开发环境允许localhost
  headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
}
```

---

### 7.2 调试工具

#### Vercel CLI
```bash
# 安装
npm i -g vercel

# 查看部署
vercel ls

# 查看日志
vercel logs [deployment-url]

# 本地运行（模拟Serverless）
vercel dev
```

#### Prisma Studio
```bash
# 启动GUI
npx prisma studio

# 访问 http://localhost:5555
# 可以直接查看/编辑数据
```

#### DeepSeek API测试
```bash
# 测试API连接
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 8. 扩展性考虑

### 8.1 流量增长

**当前架构**（适合MVP，<1000 DAU）:
- Vercel Pro: 100GB带宽/月
- Supabase Free: 500MB数据库
- DeepSeek: 按需付费

**扩展方案**（>10000 DAU）:
1. **数据库**: Supabase Pro ($25/月，8GB数据库)
2. **CDN**: Vercel Enterprise（定制化）
3. **缓存**: Redis（Upstash，减少AI调用）
4. **队列**: BullMQ（处理异步Job）

### 8.2 成本优化

**AI成本**（主要开销）:
- ACT1分析: ~6000 tokens/次 → $0.006
- ACT2-5迭代: ~3000 tokens/次 → $0.003
- 合成: ~10000 tokens/次 → $0.01

**优化策略**:
- 缓存分析结果（相同剧本）
- 减少Prompt长度
- 使用更小的模型（gpt-3.5-turbo）

### 8.3 可用性

**目标**: 99.9% uptime（每月<43分钟停机）

**架构**:
- Vercel: 全球CDN，自动故障转移
- Supabase: 多区域复制
- DeepSeek: 自动重试机制

**监控**:
- Uptime Robot: 每5分钟ping健康检查
- PagerDuty: 故障告警

---

## 9. 安全最佳实践

### 9.1 环境隔离

| 环境 | 数据库 | API Keys | 域名 |
|-----|--------|---------|------|
| 开发 | localhost | 测试密钥 | localhost:3000 |
| 预览 | Supabase Preview | 生产密钥 | preview.vercel.app |
| 生产 | Supabase Production | 生产密钥 | app.vercel.app |

### 9.2 密钥管理

**✅ 推荐**:
- 使用Vercel Secrets管理生产密钥
- 定期轮换API密钥（每90天）
- 最小权限原则（只授予必要权限）

**❌ 避免**:
- 在代码中硬编码密钥
- 在Git中存储`.env`文件
- 在日志中打印密钥

### 9.3 数据备份

**Supabase自动备份**:
- 每日备份（保留7天）
- 按需恢复

**手动备份**:
```bash
# 导出数据库
pg_dump $DATABASE_URL > backup.sql

# 恢复
psql $DATABASE_URL < backup.sql
```

---

## 附录A：部署检查清单

### A.1 部署前检查

- [ ] 所有测试通过（`npm run check:all`）
- [ ] 环境变量已配置（DATABASE_URL, DEEPSEEK_API_KEY）
- [ ] Vercel Pro Plan已激活
- [ ] Supabase数据库已创建
- [ ] `vercel.json` maxDuration设置为60秒
- [ ] `.gitignore`包含`.env`

### A.2 部署后验证

- [ ] 健康检查通过（`/api/v1/projects`返回200）
- [ ] 数据库迁移成功（`npx prisma migrate deploy`）
- [ ] 种子数据已创建（demo-user存在）
- [ ] ACT1分析完整流程测试通过
- [ ] ACT2-5迭代流程测试通过
- [ ] 合成流程测试通过
- [ ] 日志正常（无CORS/504/连接池错误）

### A.3 监控设置

- [ ] Vercel Analytics已启用
- [ ] Supabase告警已配置（连接数>80）
- [ ] Uptime监控已设置（每5分钟ping）
- [ ] 错误追踪已集成（Sentry/可选）

---

## 附录B：快速部署命令

```bash
# 1. 本地准备
npm install
npx prisma generate
npm run build

# 2. 部署到Vercel
vercel --prod

# 3. 运行迁移（部署后）
export DATABASE_URL="postgresql://...@db.xxx.supabase.co:5432/postgres"
npx prisma migrate deploy
npx prisma db seed

# 4. 验证
curl https://your-app.vercel.app/api/v1/projects
```

---

## 附录C：环境变量模板

**`.env.local`（本地开发）**:
```bash
# Database
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"

# DeepSeek API
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com

# Development
DISABLE_RATE_LIMIT=true
NODE_ENV=development
```

**Vercel生产环境**:
```bash
# Database (Supabase Pooler)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Database (Direct - for migrations)
DIRECT_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"

# DeepSeek API
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com

# Production
DISABLE_RATE_LIMIT=false
NODE_ENV=production
```

---

**文档结束** | [返回主文档](./SYSTEM_ARCHITECTURE_COMPLETE.md)

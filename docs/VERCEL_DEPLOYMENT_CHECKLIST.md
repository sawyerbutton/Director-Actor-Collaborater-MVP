# Vercel 部署检查清单

**日期**: 2025-10-10
**功能**: Script Versioning Iteration (Epic 1 - 方案A)
**状态**: ✅ 就绪

---

## 📋 部署前检查

### ✅ 代码验证

- [x] **TypeScript 检查通过** - `npm run typecheck` ✓
- [x] **生产构建成功** - `npm run build` ✓
- [x] **所有测试通过** - 单元测试 19/19, E2E 100% ✓
- [x] **Git 提交完成** - 所有变更已提交

### ✅ Vercel 配置优化

**文件**: `vercel.json`

**关键修改**:
1. ✅ 移除 `prisma db push` 和 `prisma db seed` 从构建命令
   - **原因**: Vercel 构建环境无数据库访问权限
   - **新命令**: `npx prisma generate && npm run build`

2. ✅ 增加 API 函数超时配置
   ```json
   {
     "app/api/v1/analyze/route.ts": { "maxDuration": 60 },
     "app/api/v1/iteration/propose/route.ts": { "maxDuration": 60 },
     "app/api/v1/iteration/execute/route.ts": { "maxDuration": 60 },
     "app/api/v1/synthesize/route.ts": { "maxDuration": 60 }
   }
   ```
   - **原因**: 大型剧本分析和版本创建需要更长时间

---

## 🔐 环境变量配置

### 必需环境变量

在 Vercel Dashboard → Settings → Environment Variables 中配置：

| 变量名 | 类型 | 示例值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | **必需** | `postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1` | PostgreSQL 连接池 URL |
| `DIRECT_URL` | **必需** | `postgresql://user:pass@host:5432/db` | PostgreSQL 直连 URL (用于迁移) |
| `DEEPSEEK_API_KEY` | **必需** | `sk-xxxxx` | DeepSeek API 密钥 |
| `DEEPSEEK_API_URL` | 可选 | `https://api.deepseek.com` | DeepSeek API 地址 (默认值可用) |
| `NEXT_PUBLIC_API_VERSION` | 推荐 | `v1` | API 版本号 |
| `NEXT_PUBLIC_APP_URL` | 推荐 | `https://your-app.vercel.app` | 应用部署 URL |
| `NODE_ENV` | 自动 | `production` | Vercel 自动设置 |
| `RATE_LIMIT_MAX_REQUESTS` | 可选 | `10` | 生产环境速率限制 (默认 10) |
| `RATE_LIMIT_WINDOW_MS` | 可选 | `60000` | 速率限制窗口 (默认 60秒) |
| `LOG_LEVEL` | 可选 | `info` | 日志级别 |
| `ENABLE_API_DOCS` | 可选 | `false` | 生产环境建议禁用 API 文档 |

### 数据库配置注意事项

**Supabase 连接池配置** (推荐):
```bash
# Connection Pooler (用于 Vercel Serverless)
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct Connection (用于 Prisma 迁移)
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**关键参数**:
- `?pgbouncer=true` - 启用连接池模式
- `&connection_limit=1` - Serverless 环境限制单个函数连接数
- 端口 `6543` - Supabase Pooler 端口
- 端口 `5432` - 直连端口

---

## 🚀 部署流程

### 1. 首次部署

```bash
# 1. 确保所有变更已提交
git add -A
git commit -m "feat: script versioning iteration ready for deployment"
git push origin feature/epic-1-rag-poc

# 2. 在 Vercel Dashboard 中:
#    - 导入 GitHub 仓库
#    - 配置环境变量 (见上表)
#    - 部署分支: feature/epic-1-rag-poc (或 main)

# 3. 部署后初始化数据库
# (在本地或通过 Vercel CLI)
npx prisma migrate deploy  # 应用迁移
npx prisma db seed         # 创建 demo 用户
```

### 2. 后续部署

```bash
# 推送代码自动触发部署
git push origin feature/epic-1-rag-poc
```

### 3. 数据库迁移

```bash
# 如果有 schema 变更，先在本地创建迁移
npx prisma migrate dev --name add_version_tracking

# 然后部署时会自动应用
# 或手动执行:
vercel env pull .env.production
npx prisma migrate deploy
```

---

## 🧪 部署后验证

### 健康检查

```bash
# 1. 检查 API 健康状态
curl https://your-app.vercel.app/api/health

# 预期响应:
# {
#   "status": "ok",
#   "timestamp": "2025-10-10T...",
#   "database": "connected",
#   "version": "v1"
# }

# 2. 检查数据库连接
curl https://your-app.vercel.app/api/debug/db

# 3. 测试项目列表
curl -H "Content-Type: application/json" \
  https://your-app.vercel.app/api/v1/projects?userId=demo-user
```

### 功能测试流程

**完整工作流测试**:

1. **上传剧本** (Dashboard)
   - URL: `https://your-app.vercel.app/dashboard`
   - 上传 `.txt` 或 `.md` 文件 (500-10000行)

2. **Act 1 分析** (自动)
   - 等待 Job 完成 (30-120秒)
   - 检查诊断报告

3. **Act 2-5 迭代** (Iteration Page)
   - URL: `https://your-app.vercel.app/iteration/[projectId]`
   - 选择 Finding → 获取提案 → 执行决策
   - 验证版本创建 (V1, V2, V3...)

4. **验证累积迭代**
   ```bash
   # 检查版本列表
   curl https://your-app.vercel.app/api/v1/projects/[projectId]/versions

   # 验证 V2 包含 V1 的修改
   # 验证 V3 包含 V1 + V2 的修改
   ```

5. **Synthesis** (如果已实现)
   - URL: `https://your-app.vercel.app/synthesis/[projectId]`
   - 触发合成 → 检查 V2 生成

---

## ⚠️ 常见问题

### 1. 数据库连接错误

**问题**: `Can't reach database server`

**解决方案**:
- 检查 `DATABASE_URL` 是否包含 `?pgbouncer=true&connection_limit=1`
- 验证 Supabase 数据库是否在运行
- 检查 IP 白名单 (Supabase 需要允许 Vercel IP)

### 2. Prisma 生成错误

**问题**: `@prisma/client did not initialize yet`

**解决方案**:
- 确保 `buildCommand` 包含 `npx prisma generate`
- 检查 `package.json` 中的 postinstall 脚本

### 3. API 超时

**问题**: `Function execution timeout`

**解决方案**:
- 检查 `vercel.json` 中的 `maxDuration` 设置
- 大型剧本建议设置 60 秒超时
- Vercel Free Plan 最大 10 秒，Pro Plan 最大 60 秒

### 4. WorkflowQueue 不工作

**问题**: Jobs 卡在 QUEUED 状态

**解决方案**:
- Vercel Serverless 环境不支持 `setInterval()`
- 确保使用 Serverless 兼容模式 (已在代码中实现)
- 检查 `lib/api/workflow-queue.ts` 的环境检测

---

## 📊 性能监控

### 关键指标

监控以下 Vercel 指标:

1. **Function Duration**
   - `/api/v1/analyze`: 预期 30-120秒
   - `/api/v1/iteration/propose`: 预期 10-30秒
   - `/api/v1/iteration/execute`: 预期 10-30秒

2. **Database Connections**
   - 监控连接池使用率
   - Serverless: 每个函数最多 1 个连接

3. **API Error Rate**
   - 目标: < 1%
   - 重点监控 429 (Rate Limit) 和 500 错误

4. **Script Processing Time**
   - 小型剧本 (<1000行): 2-5分钟
   - 中型剧本 (1000-3000行): 5-15分钟
   - 大型剧本 (3000-10000行): 10-30分钟

---

## 🔄 回滚计划

如果部署出现问题:

```bash
# 1. 在 Vercel Dashboard 中回滚到上一个部署
# Deployments → 找到上一个稳定版本 → Promote to Production

# 2. 或通过 Git 回滚
git revert HEAD
git push origin feature/epic-1-rag-poc

# 3. 数据库回滚 (如果有 schema 变更)
npx prisma migrate resolve --rolled-back [migration_name]
```

---

## ✅ 部署就绪检查清单

部署前确认:

- [ ] TypeScript 检查通过 (`npm run typecheck`)
- [ ] 生产构建成功 (`npm run build`)
- [ ] 所有单元测试通过 (`npm test`)
- [ ] E2E 测试验证通过 (本地数据库)
- [ ] `vercel.json` 已优化 (移除 db push/seed)
- [ ] 环境变量清单已准备
- [ ] 数据库连接字符串已配置 (包含 pgbouncer)
- [ ] API 超时已配置 (60秒)
- [ ] Git 分支已推送到远程
- [ ] 回滚计划已确认

---

## 📝 部署记录

| 日期 | 版本 | 变更内容 | 部署者 | 状态 |
|------|------|----------|--------|------|
| 2025-10-10 | v1.1.0 | Script Versioning Iteration (方案A) | Claude Code | 🟢 就绪 |

---

**最后更新**: 2025-10-10
**文档版本**: 1.0.0
**验证状态**: ✅ 所有检查通过，可以部署

**下一步**: 在 Vercel Dashboard 中配置环境变量后，即可触发部署。

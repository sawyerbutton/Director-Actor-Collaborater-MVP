# 🚀 Vercel 部署准备清单

> **本次修复内容**: Act 2 执行结果显示修复（数据结构对齐）
> **相关文件**: `app/api/v1/iteration/execute/route.ts`, `app/iteration/[projectId]/page.tsx`

---

## ✅ 已完成的准备工作

### 1. 代码质量检查
- ✅ **TypeScript**: 类型检查通过
- ✅ **Build**: 生产构建成功（23个路由）
- ⚠️ **ESLint**: 有过时配置警告（不影响部署）

### 2. 关键修复已集成
- ✅ **Act 2 数据结构修复**: 
  - 后端返回 `generatedChanges` 包装完整对象
  - 数据库存储完整执行结果（dramaticActions + overallArc + integrationNotes）
  - 前端添加调试日志和 Act 类型判断
- ✅ **Serverless 兼容**: WorkflowQueue 双模式架构
- ✅ **超时配置**: AI API 超时 120 秒

---

## 📋 部署前必做事项

### Step 1: 查看完整部署指南
```bash
# 项目已有完整的部署文档（16KB，非常详细）
cat docs/deployment/DEPLOYMENT-GUIDE.md
```

**关键章节**:
1. Supabase 数据库设置（免费）
2. Vercel 环境变量配置
3. Prisma 迁移和数据库初始化
4. 部署后验证清单

### Step 2: 准备生产环境数据库

**如果还没有 Supabase 数据库**:
1. 访问 https://supabase.com 创建免费项目
2. 从 **Connect** → **ORMs** → **Prisma** 获取连接字符串
3. 复制两个 URL:
   - `DATABASE_URL` (端口 6543, 带 `?pgbouncer=true`)
   - `DIRECT_URL` (端口 5432)

### Step 3: 配置 Vercel 环境变量

在 Vercel Dashboard 中配置:

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | Supabase Transaction Pooler | `postgresql://postgres.[ref]:[pwd]@...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase Direct Connection | `postgresql://postgres.[ref]:[pwd]@...pooler.supabase.com:5432/postgres` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-...` |
| `DEEPSEEK_API_URL` | API 基础 URL | `https://api.deepseek.com` |
| `NODE_ENV` | 环境标识 | `production` |
| `NEXT_PUBLIC_APP_URL` | 应用 URL（部署后更新） | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_API_VERSION` | API 版本 | `v1` |

⚠️ **重要**: 密码中如有方括号 `[]` 必须去掉！

---

## 🔧 提交代码前的最后检查

### 检查修改内容
```bash
git status
git diff
```

### 暂存所有修改
```bash
git add .
```

### 创建提交
```bash
git commit -m "fix: resolve Act 2 execution display issue

- Fix Act 2-5 data structure alignment (generatedChanges wrapper)
- Store complete execution results in database
- Add debug logging for execution responses
- Update frontend to handle different Act types

Related: Epic 005 - Interactive Workflow Core"
```

### 推送到远程仓库
```bash
git push origin feature/epic-1-rag-poc
```

---

## 🧪 部署后验证清单（重要！）

### 1. 基础健康检查
```bash
curl https://your-app.vercel.app/api/health
# 预期: {"status":"ok","message":"API is running"}
```

### 2. **Act 2 执行流程测试**（本次修复重点）

1. 上传测试剧本（500-1000 行）
2. 完成 Act 1 分析
3. 进入 Iteration 页面 → 选择 Act 2
4. 选择一个角色矛盾问题
5. 获取 AI 提案
6. **执行一个提案**
7. **验证**:
   - ✅ 页面显示"戏剧化修改"内容（不再是"暂无生成的变更"）
   - ✅ 浏览器控制台有 `[Execute] Response data` 日志
   - ✅ 显示戏剧化动作、整体弧线、整合建议

### 3. Serverless 兼容性验证
- Act 1 分析任务在 5 秒内从 QUEUED 转为 PROCESSING
- 任务不会卡在 QUEUED 状态超过 10 秒

---

## 🛠️ 使用现有部署脚本（可选）

项目提供了自动化检查脚本:

```bash
# 快速检查（推荐）
./scripts/deployment/quick-deploy-check.sh

# 完整检查（需要 Supabase 生产数据库连接）
./scripts/deployment/pre-deploy-check.sh

# 部署清单
./scripts/deployment/deploy-checklist.sh
```

---

## ⚠️ 常见问题

### Q1: 任务卡在 QUEUED 状态？
**A**: Serverless 环境需要手动触发处理。前端会自动调用 `/api/v1/analyze/process`。

### Q2: Act 2 仍显示"暂无生成的变更"？
**A**: 
1. 清除浏览器缓存
2. 查看控制台日志确认 API 返回数据
3. 确保部署了最新代码

### Q3: DeepSeek API 超时？
**A**: 
- 超时已增加到 120 秒
- 剧本建议 <10000 行
- 查看 Vercel Functions 日志

---

## 📚 参考文档

- **完整部署指南**: `docs/deployment/DEPLOYMENT-GUIDE.md`
- **项目架构**: `CLAUDE.md` (Serverless 兼容性架构)
- **本次修复**: 查看 git commit 详情

---

**准备就绪！** 🎉  
按照上述步骤配置 Vercel 环境变量后即可部署。

部署成功后，务必测试 **Act 2 执行流程** 验证修复效果。

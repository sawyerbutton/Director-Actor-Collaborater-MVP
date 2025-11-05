# 多文件分析系统生产环境配置指南

**文档版本**: v1.0
**创建日期**: 2025-11-05
**Sprint**: Sprint 4 - T4.6
**适用版本**: ScriptAI v1.0 Beta (Sprint 3 多文件分析功能)

---

## 📋 概览

本文档提供**多文件分析系统**在生产环境部署的完整配置指南。Sprint 3引入了多剧本文件上传、跨文件一致性检查等新功能，需要额外的环境配置和服务部署。

**新增功能**:
- 多剧本文件上传 (单个/批量)
- 跨文件一致性分析 (4种检查类型)
- Python转换器微服务
- 增强的API端点超时配置

---

## 🎯 配置目标

完成本指南后，您的生产环境将支持：
- ✅ 单文件和多文件剧本分析
- ✅ 跨文件时间线、角色、情节、设定一致性检查
- ✅ Python格式转换服务（可选，用于未来扩展）
- ✅ 高可用性和性能优化配置

---

## 🚀 快速配置清单

### 1. 核心服务配置（必需）

**Vercel环境变量**:
```bash
# 数据库 (Supabase)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# AI服务
DEEPSEEK_API_KEY=sk-xxx...
DEEPSEEK_API_URL=https://api.deepseek.com

# 应用配置
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_VERSION=v1
NODE_ENV=production
```

### 2. 多文件分析配置（新增）

**Python转换器服务**:
```bash
# 选项A: 外部服务部署 (推荐，见下文Railway部署)
PYTHON_CONVERTER_URL=https://your-python-converter.railway.app

# 选项B: Docker自托管
# PYTHON_CONVERTER_URL=http://your-server-ip:8001
```

### 3. Vercel超时配置（已更新）

**vercel.json** - 新增多文件分析端点:
```json
{
  "functions": {
    "app/api/v1/projects/[id]/files/route.ts": {
      "maxDuration": 30
    },
    "app/api/v1/projects/[id]/files/batch/route.ts": {
      "maxDuration": 60
    },
    "app/api/v1/projects/[id]/analyze/cross-file/route.ts": {
      "maxDuration": 60
    }
  }
}
```

---

## 📦 Python转换器服务部署

### 部署选项

#### 选项1: Railway部署（推荐 ⭐）

**优势**:
- ✅ 零配置Dockerfile支持
- ✅ 自动HTTPS和域名
- ✅ 免费额度足够Beta版使用
- ✅ 自动重启和健康检查

**步骤**:
1. Fork或推送代码到GitHub仓库
2. 在Railway.app创建项目
3. 连接GitHub仓库 → `services/python-converter`目录
4. 设置环境变量（见下文）
5. 部署后获取服务URL: `https://your-service.railway.app`
6. 在Vercel设置 `PYTHON_CONVERTER_URL=https://your-service.railway.app`

**Railway环境变量**:
```bash
PORT=8001
HOST=0.0.0.0
WORKERS=4
LOG_LEVEL=info
MAX_SCRIPT_SIZE_MB=10
CONVERSION_TIMEOUT_SECONDS=300
MAX_CONCURRENT_CONVERSIONS=10
```

**健康检查**:
```bash
# Railway会自动检测服务端口
# 手动验证:
curl https://your-service.railway.app/health
# 响应: {"status": "healthy", "version": "1.0.0"}
```

---

#### 选项2: Docker自托管

**适用场景**: 已有VPS/云服务器

**步骤**:
1. 在服务器上安装Docker
2. 构建并运行Python转换器容器:

```bash
# 克隆项目
git clone <repo-url>
cd Director-Actor-Collaborater-MVP

# 启动Python转换器
docker-compose up -d python-converter

# 验证服务
curl http://localhost:8001/health
```

**Nginx反向代理**（如需HTTPS）:
```nginx
server {
    listen 443 ssl;
    server_name converter.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Vercel环境变量**:
```bash
PYTHON_CONVERTER_URL=https://converter.yourdomain.com
```

---

#### 选项3: Beta版临时方案（不推荐）

**如果暂时无法部署Python转换器**:

1. **禁用转换器功能**（代码修改）:
```typescript
// lib/db/services/script-file.service.ts
async createFile(data: CreateScriptFileInput): Promise<ScriptFile> {
  // 跳过转换，直接标记为completed
  return await prisma.scriptFile.create({
    data: {
      ...data,
      conversionStatus: 'completed', // 原本为'pending'
      jsonContent: null // 不执行转换
    }
  });
}
```

2. **环境变量**:
```bash
# 设置为本地（会被忽略）
PYTHON_CONVERTER_URL=http://localhost:8001
```

**限制**:
- ⚠️ 跨文件分析依赖jsonContent，将无法工作
- ⚠️ 只能使用单文件ACT1-5分析功能
- ⚠️ 不适合生产环境

---

## 🔧 数据库迁移

**重要**: Sprint 3新增了2个数据库表，必须在部署后运行迁移。

### 迁移步骤

```bash
# 1. 验证DIRECT_URL配置正确（端口5432）
echo $DIRECT_URL

# 2. 运行迁移（使用DIRECT_URL，不经过pgbouncer）
npx prisma migrate deploy

# 3. 验证表已创建
npx prisma studio
# 确认存在: ScriptFile, CrossFileFinding表
```

**新增表**:
- `ScriptFile` - 存储多个剧本文件（关联到Project）
- `CrossFileFinding` - 存储跨文件分析结果

### 迁移脚本位置

```
prisma/migrations/
├── 20251104092521_add_script_file_model/
│   └── migration.sql (Sprint 3 - T1.2)
└── 20251104XXXXXX_add_cross_file_finding_model/
    └── migration.sql (Sprint 3 - T2.X)
```

---

## ⚙️ 性能优化配置

### API超时设置

**vercel.json完整配置**:
```json
{
  "functions": {
    "app/api/v1/analyze/route.ts": {"maxDuration": 60},
    "app/api/v1/analyze/process/route.ts": {"maxDuration": 60},
    "app/api/v1/iteration/propose/route.ts": {"maxDuration": 60},
    "app/api/v1/iteration/execute/route.ts": {"maxDuration": 60},
    "app/api/v1/synthesize/route.ts": {"maxDuration": 60},

    // Sprint 3新增 - 多文件分析
    "app/api/v1/projects/[id]/files/route.ts": {"maxDuration": 30},
    "app/api/v1/projects/[id]/files/batch/route.ts": {"maxDuration": 60},
    "app/api/v1/projects/[id]/analyze/cross-file/route.ts": {"maxDuration": 60},

    "app/api/health/route.ts": {"maxDuration": 10}
  }
}
```

**超时说明**:
- **30秒**: 单文件上传 (足够处理10MB文件)
- **60秒**: 批量上传 (处理最多50个文件)
- **60秒**: 跨文件分析 (基于性能基线测试 PERF-002/003)

---

### 速率限制

**生产环境推荐配置**:
```bash
RATE_LIMIT_WINDOW_MS=900000    # 15分钟
RATE_LIMIT_MAX_REQUESTS=100    # 每15分钟100次请求
```

**说明**:
- 基于多文件分析性能基线：10文件分析279ms
- 100次请求/15分钟 = 最多1000个文件/15分钟
- 足够支持10-20个并发用户

---

### 数据库连接池

**DATABASE_URL参数**（必需）:
```
?pgbouncer=true&connection_limit=1
```

**说明**:
- `pgbouncer=true`: 启用Supabase连接池
- `connection_limit=1`: 每个Serverless函数限制1个连接
- 防止Serverless函数耗尽数据库连接

---

## 📊 监控和日志

### 关键指标

**多文件分析性能指标**（基于Sprint 4 T4.2性能测试）:

| 指标 | 目标值 | 监控方法 |
|------|--------|----------|
| 5文件上传+分析 | <500ms | Vercel Analytics |
| 10文件上传+分析 | <1000ms | Vercel Analytics |
| 跨文件分析吞吐量 | >30 files/sec | 自定义日志 |
| Python转换器响应 | <5s | Health check endpoint |
| 数据库连接池使用率 | <80% | Supabase Dashboard |

### 日志配置

**Vercel日志**:
```bash
# 查看部署日志
vercel logs [deployment-id]

# 实时日志
vercel logs --follow
```

**Python转换器日志**（Railway）:
```bash
# Railway CLI
railway logs

# 或在Railway Dashboard查看实时日志
```

---

## 🔒 安全配置

### 环境变量安全

**敏感信息**（不要泄露）:
- ❌ DEEPSEEK_API_KEY
- ❌ DATABASE_URL (包含密码)
- ❌ DIRECT_URL (包含密码)

**安全实践**:
1. 使用Vercel Environment Variables（加密存储）
2. 不要在代码中硬编码密钥
3. 不要提交.env文件到Git
4. 定期轮换API密钥

### CORS配置

**生产环境CORS**（已在vercel.json配置）:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {"key": "Access-Control-Allow-Origin", "value": "https://your-domain.vercel.app"},
        {"key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS"},
        {"key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization"}
      ]
    }
  ]
}
```

---

## 🧪 部署后验证

### 验证清单

完成部署后，按顺序验证以下功能：

#### 1. 基础健康检查
```bash
# 1.1 应用健康
curl https://your-domain.vercel.app/api/health
# 预期: {"status": "healthy"}

# 1.2 Python转换器健康
curl https://your-python-converter.railway.app/health
# 预期: {"status": "healthy", "version": "1.0.0"}
```

#### 2. 数据库连接
```bash
# 2.1 检查表是否存在
npx prisma studio
# 确认: User, Project, ScriptFile, CrossFileFinding等表存在

# 2.2 测试查询
npx prisma db execute --sql "SELECT COUNT(*) FROM ScriptFile"
# 预期: 返回数字（可能为0）
```

#### 3. 多文件上传测试
```bash
# 3.1 创建测试项目
curl -X POST https://your-domain.vercel.app/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Project", "userId": "demo-user"}'
# 保存返回的projectId

# 3.2 上传单个文件
curl -X POST https://your-domain.vercel.app/api/v1/projects/{projectId}/files \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "episode1.md",
    "episodeNumber": 1,
    "rawContent": "# Episode 1\n\n## Scene 1\nContent here..."
  }'
# 预期: 返回文件对象，conversionStatus为"completed"
```

#### 4. 跨文件分析测试
```bash
# 4.1 上传3个测试文件（使用batch endpoint）
curl -X POST https://your-domain.vercel.app/api/v1/projects/{projectId}/files/batch \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"filename": "ep1.md", "episodeNumber": 1, "rawContent": "..."},
      {"filename": "ep2.md", "episodeNumber": 2, "rawContent": "..."},
      {"filename": "ep3.md", "episodeNumber": 3, "rawContent": "..."}
    ]
  }'

# 4.2 执行跨文件分析
curl -X POST https://your-domain.vercel.app/api/v1/projects/{projectId}/analyze/cross-file \
  -H "Content-Type: application/json" \
  -d '{
    "checkTypes": ["cross_file_timeline", "cross_file_character"]
  }'
# 预期: 返回findings数组
```

#### 5. 性能验证（基于PERF-002/003基线）
```bash
# 5.1 测量上传+分析时间（5文件）
time curl -X POST https://your-domain.vercel.app/api/v1/projects/{projectId}/files/batch \
  -H "Content-Type: application/json" \
  -d '{ "files": [...5 files...] }'
# 预期: <500ms (基线: 152ms)

# 5.2 测量跨文件分析时间（10文件）
time curl -X POST https://your-domain.vercel.app/api/v1/projects/{projectId}/analyze/cross-file \
  -H "Content-Type: application/json" \
  -d '{ "checkTypes": ["cross_file_timeline", "cross_file_character"] }'
# 预期: <1000ms (基线: 279ms)
```

---

## 🚨 故障排查

### 常见问题

#### 问题1: Python转换器连接失败
**症状**: `ECONNREFUSED` 或超时错误

**排查步骤**:
```bash
# 1. 验证环境变量
echo $PYTHON_CONVERTER_URL
# 应该是外部URL，不是localhost

# 2. 测试转换器健康
curl https://your-python-converter.railway.app/health

# 3. 检查Railway服务状态
# 访问 Railway Dashboard → Services → python-converter → Logs
```

**解决方案**:
- 确认PYTHON_CONVERTER_URL配置正确
- 检查Railway服务是否正常运行
- 验证防火墙/网络配置

---

#### 问题2: 跨文件分析超时
**症状**: Vercel函数超时（504错误）

**排查步骤**:
```bash
# 1. 检查vercel.json超时配置
cat vercel.json | grep "cross-file"
# 应显示: "maxDuration": 60

# 2. 查看Vercel日志
vercel logs --follow
# 查找timeout相关错误

# 3. 检查文件数量和大小
# 超过10个大文件（>5000行/文件）可能需要更长时间
```

**解决方案**:
- 确保Vercel账户为Pro Plan（Hobby限制10s）
- 考虑在客户端限制批量上传数量（最多10个文件）
- 对大文件启用Plot/Setting检查优化（参考PERF基线报告）

---

#### 问题3: 数据库连接池耗尽
**症状**: "remaining connection slots reserved" 错误

**排查步骤**:
```bash
# 1. 检查DATABASE_URL参数
echo $DATABASE_URL | grep "pgbouncer"
# 必须包含: ?pgbouncer=true&connection_limit=1

# 2. 查看Supabase连接池使用率
# Supabase Dashboard → Database → Connection Pooling
```

**解决方案**:
- 确保DATABASE_URL包含pgbouncer参数
- 设置connection_limit=1
- 升级Supabase计划（免费版限制60连接）

---

## 📚 参考文档

### 内部文档
- **部署指南**: `ref/DEPLOYMENT_GUIDE.md`
- **API文档**: `docs/api/MULTI_FILE_ANALYSIS_API.md`
- **性能基线**: `docs/testing/PERFORMANCE_BASELINE_REPORT.md`
- **Docker验证**: `docs/testing/DOCKER_DEPLOYMENT_VERIFICATION.md`

### 外部资源
- **Vercel部署**: https://vercel.com/docs/deployments
- **Supabase数据库**: https://supabase.com/docs/guides/database
- **Railway部署**: https://docs.railway.app/deploy/deployments
- **DeepSeek API**: https://platform.deepseek.com/docs

---

## 📝 配置模板

### .env.production完整模板

```bash
# =====================================
# 生产环境配置 / Production Configuration
# =====================================

# 应用环境
NODE_ENV=production

# 数据库 (Supabase)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# DeepSeek AI
DEEPSEEK_API_KEY=sk-xxx...
DEEPSEEK_API_URL=https://api.deepseek.com

# 应用URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_VERSION=v1

# Python转换器服务 (Sprint 3)
PYTHON_CONVERTER_URL=https://your-python-converter.railway.app

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# NextAuth (自动生成或手动设置)
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=xxx... # 最少32字符

# 可选 - 监控
LOG_LEVEL=info
ENABLE_API_DOCS=false  # 生产环境关闭
```

---

## ✅ 部署完成确认

完成以下所有检查项后，多文件分析系统即可投入生产使用：

### 配置检查
- [ ] DATABASE_URL和DIRECT_URL已配置（Supabase）
- [ ] DEEPSEEK_API_KEY已配置且有效
- [ ] PYTHON_CONVERTER_URL已配置（Railway或自托管）
- [ ] NEXT_PUBLIC_APP_URL已更新为实际域名
- [ ] vercel.json包含所有多文件分析端点超时配置
- [ ] 数据库迁移已运行（ScriptFile和CrossFileFinding表存在）

### 功能验证
- [ ] 健康检查通过（应用+Python转换器）
- [ ] 单文件上传成功
- [ ] 批量文件上传成功
- [ ] 跨文件分析返回findings
- [ ] 性能达到基线要求（5文件<500ms, 10文件<1000ms）

### 监控设置
- [ ] Vercel Analytics已启用
- [ ] Railway日志已配置（如使用Railway）
- [ ] 错误追踪已设置（可选，如Sentry）

---

**最后更新**: 2025-11-05
**负责人**: AI Assistant
**Sprint**: Sprint 4 - T4.6
**状态**: ✅ 配置指南完成
**下一步**: 执行生产部署并验证

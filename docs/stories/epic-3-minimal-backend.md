# Epic C: 最小后端支撑

## Epic信息
- **Epic ID**: EPIC-003
- **优先级**: P0 (最高)
- **预计时长**: 第3周（与Epic B并行）
- **依赖**: 部分依赖Epic A的接口定义
- **状态**: 待开始

## Epic目标
快速搭建一个**极简但稳固**的后端地基，以支撑AI引擎和用户界面能够顺利运行。遵循"刚好够用"原则，避免过度工程化。

## 业务价值
- **技术价值**: 提供数据持久化和用户管理能力
- **产品价值**: 使MVP成为完整可部署的应用
- **运营价值**: 支持用户注册、项目管理和使用追踪

## 技术范围
### 包含内容
- Next.js API Routes设置
- PostgreSQL数据库配置（通过Supabase）
- Prisma ORM集成
- 基础用户认证（NextAuth.js）
- 核心业务API端点
- 文件处理和存储
- 基础错误处理和日志

### 不包含内容
- 复杂的权限系统
- 实时通信（WebSocket）
- 缓存层（Redis等）
- 微服务架构
- API版本管理

## Stories列表

### Story C.1: 搭建Next.js单体应用后端结构
**描述**: 初始化后端基础架构和项目结构
**验收标准**:
- [ ] 配置Next.js API Routes
- [ ] 设置环境变量管理（.env文件）
- [ ] 实现基础中间件（CORS、请求日志）
- [ ] 配置错误处理和响应格式标准化
- [ ] 设置API路由约定和文件结构
**技术细节**:
```
/app/api/
  /auth/        # 认证相关
  /projects/    # 项目管理
  /analysis/    # 分析相关
  /middleware/  # 中间件
```
**估时**: 1天

### Story C.2: 初始化数据库并配置ORM
**描述**: 设置Supabase PostgreSQL和Prisma ORM
**验收标准**:
- [ ] Supabase项目创建和配置
- [ ] Prisma schema定义（User、Project、Analysis）
- [ ] 数据库迁移脚本设置
- [ ] Seed数据脚本（测试数据）
- [ ] 数据库连接池配置
**Prisma Schema概要**:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  projects  Project[]
  createdAt DateTime @default(now())
}

model Project {
  id         String     @id @default(cuid())
  title      String
  content    String     @db.Text
  userId     String
  user       User       @relation(fields: [userId], references: [id])
  analyses   Analysis[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

model Analysis {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  results     Json
  suggestions Json
  status      String   @default("pending")
  createdAt   DateTime @default(now())
}
```
**估时**: 1天

### Story C.3: 实现核心业务API端点
**描述**: 开发支撑核心功能的API接口
**验收标准**:
- [ ] POST /api/projects - 创建项目
- [ ] GET /api/projects - 获取用户项目列表
- [ ] POST /api/analysis - 启动分析（异步）
- [ ] GET /api/analysis/[id] - 获取分析结果
- [ ] PATCH /api/analysis/[id] - 更新分析（接受/拒绝建议）
- [ ] GET /api/export/[projectId] - 导出项目
**API规范示例**:
```typescript
// POST /api/analysis
{
  projectId: string
  scriptContent: string
}
// Response: 202 Accepted
{
  analysisId: string
  status: "processing"
}
```
**估时**: 2天

### Story C.4: 集成简单用户认证
**描述**: 使用NextAuth.js实现基础认证功能
**验收标准**:
- [ ] 配置NextAuth.js v5
- [ ] 实现邮箱/密码认证
- [ ] 支持Google OAuth（可选）
- [ ] 会话管理和JWT配置
- [ ] 保护需要认证的API端点
- [ ] 实现注册、登录、登出流程
**技术细节**:
- 使用NextAuth.js的Credentials Provider
- JWT策略存储会话
- 密码使用bcrypt加密
**估时**: 2天

## API设计规范
### RESTful约定
- 使用标准HTTP方法（GET、POST、PATCH、DELETE）
- 统一的响应格式
- 合理的状态码使用

### 响应格式
```typescript
// 成功响应
{
  success: true,
  data: any,
  message?: string
}

// 错误响应
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### 错误码规范
- AUTH_001: 未认证
- AUTH_002: 无权限
- VAL_001: 输入验证失败
- BIZ_001: 业务逻辑错误
- SYS_001: 系统错误

## 依赖关系
### 环境依赖
- Node.js 18+
- PostgreSQL 15+（通过Supabase）
- Vercel账号（部署）

### 服务依赖
- Supabase项目配置
- DeepSeek API密钥
- NextAuth密钥生成

### Epic A接口依赖
需要集成Epic A提供的分析引擎:
```typescript
import { analyzeScript } from '@/lib/ai/analyzer'
```

## 风险与缓解
| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|----------|
| 数据库连接问题 | 高 | 低 | 实现连接池和重试机制 |
| API限流问题 | 中 | 中 | 实现请求限流和队列 |
| 认证安全漏洞 | 高 | 低 | 使用成熟的NextAuth.js |
| 大文件处理 | 中 | 中 | 设置上传限制，使用流处理 |

## 性能要求
- API响应时间 < 500ms（不含AI处理）
- 数据库查询优化（使用索引）
- 支持100并发用户
- 文件上传限制: 10MB

## 验收标准
### Epic级验收标准
- [ ] 所有API端点可用并通过测试
- [ ] 用户可以注册、登录、创建项目
- [ ] 数据正确持久化到数据库
- [ ] 认证和授权机制正常工作
- [ ] 与前端集成测试通过

### 质量标准
- API有完整的TypeScript类型
- 使用Zod进行输入验证
- 错误处理覆盖所有端点
- 数据库操作使用事务
- 敏感信息不在日志中暴露

## 完成定义 (DoD)
- [ ] 所有Story完成并测试
- [ ] API文档编写完成
- [ ] 数据库迁移脚本就绪
- [ ] 环境变量模板提供
- [ ] 部署配置完成
- [ ] 集成测试通过

## 部署准备
### Vercel配置
```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 环境变量
```env
DATABASE_URL=
DEEPSEEK_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## 备注
- 优先实现核心API，其他可以迭代添加
- 保持架构简单，避免过早优化
- 确保与Epic B的前端开发同步进行
- 预留扩展点但不要过度设计
- 重点关注数据安全和用户隐私
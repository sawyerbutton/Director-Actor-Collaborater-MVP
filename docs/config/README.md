# 配置文档目录

本目录存放项目配置相关的说明文档。

## 📁 文档列表

### 1. PROJECT_STRUCTURE.md (3.7K)

**内容**: 项目目录结构说明

详细说明了整个项目的目录组织方式：
- `app/` - Next.js App Router 页面和 API 路由
- `components/` - React 组件
- `lib/` - 核心业务逻辑、服务、工具函数
- `prisma/` - 数据库模式和迁移
- `tests/` - 测试文件
- `docs/` - 项目文档

**用途**:
- ✅ 新成员快速了解项目结构
- ✅ 确定新文件应该放在哪个目录
- ✅ 理解项目的组织原则

---

### 2. SECURITY-NOTICE.md (3.1K)

**内容**: 安全注意事项 - 演示环境说明

**重要提示**: ⚠️ 本应用当前运行时**没有身份认证机制**，仅用于演示和测试目的。

该文档说明：
- 认证机制已在 Story 4.2 (2025-01-16) 中被移除
- 所有用户使用 `demo-user` 账户
- 适用于演示环境，**不适用于生产环境**
- 未来若需要生产环境，需要重新实现认证系统

**安全影响**:
- ❌ 无用户隔离
- ❌ 无访问控制
- ❌ 数据可被任何人访问和修改
- ✅ 适合本地开发和演示
- ✅ 简化了MVP开发流程

**相关配置**:
- `/lib/db/services/*.service.ts` - 所有服务硬编码使用 `demo-user`
- `/app/api/v1/*/route.ts` - API 路由使用 `const userId = 'demo-user'`
- `/prisma/seed.ts` - 数据库种子创建 demo-user

---

## 🔗 相关文档

### 架构文档
- `/docs/architecture.md` - 全栈架构文档
- `/docs/epics/epic-*` - Epic 实现文档

### 数据库配置
- `/prisma/schema.prisma` - 数据库模式定义
- `/docs/database/` - 数据库相关文档
- `/.env` - 环境变量配置（本地）
- Vercel - 生产环境变量配置

### 部署配置
- `/vercel.json` - Vercel 部署配置
- `/docs/deployment/DEPLOYMENT-GUIDE.md` - 部署指南
- `/docs/DEPLOYMENT_CHECKLIST.md` - 部署检查清单

---

## 📝 配置文件位置

### 环境配置
```
/.env                    # 本地开发环境变量
/.env.example            # 环境变量模板
/vercel.json             # Vercel 部署配置
```

### 应用配置
```
/next.config.js          # Next.js 配置
/tsconfig.json           # TypeScript 配置
/jest.config.js          # Jest 测试配置
/playwright.config.ts    # Playwright E2E 配置
```

### 数据库配置
```
/prisma/schema.prisma    # Prisma 数据库模式
/prisma/seed.ts          # 数据库种子数据
```

---

## ⚙️ 配置修改建议

1. **修改项目结构** → 更新 `PROJECT_STRUCTURE.md`
2. **添加认证系统** → 更新 `SECURITY-NOTICE.md` 并移除警告
3. **修改数据库模式** → 参考 `/docs/database/` 文档
4. **修改部署配置** → 参考 `/docs/deployment/` 文档

---

**维护**: 配置文档应与实际配置保持同步，修改配置时请同步更新文档。

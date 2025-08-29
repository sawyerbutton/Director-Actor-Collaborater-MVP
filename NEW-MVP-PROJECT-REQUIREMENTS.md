# 🎬 AI剧本助手 MVP - 项目需求文档 v2.0

> 基于深刻教训的重新出发：简单、聚焦、快速交付价值

---

## 📋 项目概述

### 项目名称

**ScriptAI MVP** - 智能剧本分析与修改助手

### 一句话描述

一个使用3个AI Agent协作的剧本逻辑检查和优化工具，帮助编剧在10秒内发现并修复剧本中的逻辑错误。

### 核心价值主张

- **节省80%的剧本修改时间**
- **自动检测5种常见逻辑错误**
- **提供可执行的修改建议**
- **多AI协作确保建议质量**

### 目标用户

- 独立编剧
- 剧本工作室
- 影视制作公司的剧本部门

---

## 🎯 MVP范围定义（严格限定）

### ✅ MVP必须包含（4周内完成）

#### 1. 核心AI功能

- **3个协作Agent**：
  - 修改执行官：协调和决策
  - 一致性守护者：逻辑错误检测（最高优先级）
  - 风格适配器：基础语言优化
- **5种错误检测**：
  - 时间线冲突
  - 角色行为不一致
  - 场景连续性问题
  - 因果关系错误
  - 情节逻辑漏洞
- **DeepSeek API集成**（不是OpenAI）

#### 2. 最小用户界面

- 剧本上传/粘贴页面
- 分析结果展示页面
- 接受/拒绝建议的交互
- 导出修改后的剧本

#### 3. 基础后端

- 单体Node.js应用（不是微服务）
- PostgreSQL数据库（只需要这一个）
- 简单的用户认证
- 基础的项目管理

### ❌ MVP不包含（坚决不做）

#### 技术层面

- ❌ 微服务架构
- ❌ GraphQL Federation
- ❌ 多数据库（MongoDB、Neo4j、Redis）
- ❌ 复杂的认证系统（RBAC等）
- ❌ WebSocket实时功能
- ❌ 消息队列
- ❌ Docker/K8s
- ❌ CI/CD pipeline
- ❌ 100%测试覆盖

#### 功能层面

- ❌ 多用户协作
- ❌ 版本控制系统
- ❌ 5个完整Agent（只做3个）
- ❌ 实时协作编辑
- ❌ 复杂的权限管理
- ❌ 数据分析仪表板
- ❌ 多语言支持
- ❌ 移动端应用

---

## 💡 关键经验教训（必读）

### 🔴 血的教训

1. **过度工程化是最大敌人** - 我们花了80%时间在基础设施，0%在核心功能
2. **完美主义会杀死项目** - 追求80%测试覆盖率，却没有可用功能
3. **微服务是过早优化** - 6个服务的集成问题消耗了50%的时间
4. **用户不关心你的架构** - 他们只要AI能帮改剧本

### 🟢 正确做法

1. **功能优先于架构** - 先让它工作，再让它优雅
2. **用最简单的方案** - 能用单体就不要微服务
3. **快速获得用户反馈** - 每周都要有可见进展
4. **聚焦核心差异化** - AI多Agent协作是核心，其他都是次要的

---

## 🏗️ 技术架构（极简版）

### 技术栈选择

```javascript
const techStack = {
  // 前端
  frontend: {
    framework: 'Next.js 14', // 全栈框架，简化开发
    ui: 'Tailwind + shadcn/ui', // 快速美观
    state: 'Zustand', // 简单状态管理
  },

  // 后端
  backend: {
    runtime: 'Node.js', // 统一语言
    framework: 'Next.js API routes', // 不需要单独后端
    database: 'PostgreSQL + Prisma', // 简单ORM
    auth: 'NextAuth.js', // 开箱即用
  },

  // AI
  ai: {
    llm: 'DeepSeek API', // 便宜且中文友好
    framework: 'Langchain.js', // 简化AI开发
    agents: '3 custom agents', // 核心差异化
  },

  // 部署
  deployment: {
    platform: 'Vercel', // 一键部署
    database: 'Supabase', // 托管PostgreSQL
    monitoring: 'Vercel Analytics', // 内置监控
  },
};
```

### 项目结构（保持简单）

```
script-ai-mvp/
├── app/                      # Next.js 14 app目录
│   ├── page.tsx             # 首页
│   ├── analyze/page.tsx     # 分析页面
│   ├── api/                 # API路由
│   │   ├── analyze/route.ts
│   │   └── auth/[...nextauth]/route.ts
│   └── components/          # React组件
├── lib/                     # 核心逻辑
│   ├── ai/                 # AI相关
│   │   ├── agents/         # 3个Agent
│   │   ├── deepseek.ts     # API封装
│   │   └── pipeline.ts     # 协作逻辑
│   └── db/                 # 数据库
│       └── prisma/         # Prisma ORM
├── public/                  # 静态资源
└── package.json            # 依赖管理
```

---

## 📊 功能需求详述

### 1. 剧本上传与解析

```typescript
interface ScriptUpload {
  // 输入方式
  input: {
    paste: boolean; // 支持粘贴文本
    upload: boolean; // 支持上传.txt/.docx
    maxSize: '10MB'; // 限制大小
  };

  // 解析功能
  parsing: {
    detectScenes: true; // 识别场景
    detectDialogue: true; // 识别对话
    detectCharacters: true; // 识别角色
  };

  // 验证
  validation: {
    minLength: 1000; // 最少1000字
    maxLength: 100000; // 最多10万字
    format: 'plain|formatted'; // 支持格式
  };
}
```

### 2. AI分析核心功能

```typescript
interface AIAnalysis {
  // Agent配置
  agents: {
    consistency: {
      priority: 'highest';
      errors: ['timeline', 'character', 'continuity', 'causality', 'plot'];
      minSuggestions: 2;
    };
    style: {
      priority: 'medium';
      aspects: ['dialogue', 'description', 'pacing'];
      optional: false; // MVP也包含
    };
    coordinator: {
      priority: 'critical';
      resolveConflicts: true;
      finalDecision: true;
    };
  };

  // 性能要求
  performance: {
    maxResponseTime: 10000; // 10秒
    timeout: 15000; // 15秒超时
    parallel: true; // 并行处理
  };

  // 输出格式
  output: {
    errors: ErrorList;
    suggestions: SuggestionList;
    confidence: number;
    summary: string;
  };
}
```

### 3. 用户交互界面

```typescript
interface UserInterface {
  // 页面
  pages: {
    home: {
      uploadArea: true;
      recentProjects: true;
      quickStart: true;
    };
    analysis: {
      splitView: true; // 原文|建议对比
      errorHighlight: true; // 错误高亮
      suggestionCards: true; // 建议卡片
    };
    export: {
      formats: ['txt', 'docx', 'pdf'];
      trackChanges: true; // 标记修改
    };
  };

  // 交互
  interactions: {
    acceptSuggestion: 'click';
    rejectSuggestion: 'click';
    acceptAll: 'button';
    modifySuggestion: false; // MVP不支持
    addComment: false; // MVP不支持
  };
}
```

### 4. 数据模型（最简化）

```prisma
// schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  projects  Project[]
  createdAt DateTime @default(now())
}

model Project {
  id           String   @id @default(cuid())
  title        String
  content      String   @db.Text
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  analyses     Analysis[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Analysis {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id])
  errors       Json     // 存储错误列表
  suggestions  Json     // 存储建议列表
  accepted     Json?    // 用户接受的建议
  createdAt    DateTime @default(now())
}
```

---

## 🚀 开发计划（4周冲刺）

### Week 1: AI核心（必须完成）

- Day 1: 项目初始化 + DeepSeek集成
- Day 2-3: 一致性守护者Agent
- Day 4-5: 风格适配器 + 修改执行官
- Day 6-7: Agent协作框架 + 测试

### Week 2: 用户界面

- Day 8-9: 上传和解析页面
- Day 10-11: 分析结果展示
- Day 12-13: 用户交互功能
- Day 14: 前后端集成

### Week 3: 完善和优化

- Day 15-16: 错误处理和边界情况
- Day 17-18: 性能优化
- Day 19-20: 用户体验改进
- Day 21: 内部测试

### Week 4: 发布准备

- Day 22-23: 用户测试
- Day 24-25: Bug修复
- Day 26-27: 部署上线
- Day 28: 发布庆祝！

---

## ✅ 成功标准

### 技术指标

- ✅ 3个Agent能协作分析
- ✅ 检测5种逻辑错误
- ✅ 响应时间 <10秒
- ✅ 准确率 >70%
- ✅ 系统可用性 >95%

### 用户指标

- ✅ 10个用户完成测试
- ✅ 满意度 >3.5/5
- ✅ 60%建议被接受
- ✅ 平均分析时间 <2分钟

### 商业指标

- ✅ 获得第一个付费用户
- ✅ 日活用户 >10
- ✅ API成本 <100元/天
- ✅ 用户留存率 >30%

---

## 🎭 用户故事（核心场景）

### Story 1: 快速检查

```
作为一名编剧
我想要快速检查我的剧本是否有逻辑错误
以便在提交给制片人之前修复问题

验收标准：
- 上传10页剧本
- 10秒内得到分析结果
- 至少发现3个逻辑问题
- 每个问题有具体修改建议
```

### Story 2: 批量修复

```
作为一名编剧
我想要一键接受所有合理的修改建议
以便快速完成剧本修改

验收标准：
- 可以预览所有建议
- 可以批量接受/拒绝
- 可以导出修改后的版本
- 保留修改痕迹
```

### Story 3: 重点问题处理

```
作为一名编剧
我想要优先处理严重的逻辑错误
以便确保剧本的基本质量

验收标准：
- 错误按严重程度排序
- 严重错误有详细解释
- 提供多个修改方案
- 可以对比修改前后
```

---

## 🚫 明确不做的事（抵制诱惑）

### 技术诱惑

- 不要优化性能，除非真的很慢
- 不要重构代码，除非真的很乱
- 不要添加新技术，除非真的必要
- 不要追求100%测试覆盖
- 不要过度抽象

### 功能诱惑

- 不要添加用户要求的所有功能
- 不要实现完美的UI
- 不要支持所有文件格式
- 不要做复杂的权限系统
- 不要实现版本控制

### 记住

> "Perfect is the enemy of good" - 完美是优秀的敌人

---

## 🔧 快速启动指南

### 1. 创建新项目

```bash
# 使用Next.js 14创建项目
npx create-next-app@latest script-ai-mvp --typescript --tailwind --app

cd script-ai-mvp

# 安装核心依赖
npm install @prisma/client prisma
npm install next-auth @auth/prisma-adapter
npm install langchain @langchain/community
npm install axios retry-axios
npm install zod react-hook-form
npm install @radix-ui/react-dialog @radix-ui/react-toast
```

### 2. 环境配置

```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

DEEPSEEK_API_KEY="sk-..."
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"
```

### 3. 初始化数据库

```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

### 4. 启动开发

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 📈 MVP后的演进路径

### Phase 1: MVP (Week 1-4) ✅

- 3个Agent
- 基础功能
- 10个用户

### Phase 2: 增强 (Week 5-8)

- 5个Agent
- 更多错误类型
- 100个用户
- 基础付费功能

### Phase 3: 扩展 (Week 9-12)

- API开放
- 团队协作
- 1000个用户
- SaaS订阅

### Phase 4: 规模化 (Week 13-16)

- 企业版
- 自定义Agent
- 10000个用户
- B2B销售

---

## 💰 成本预算

### 开发成本（4周）

- 开发人员：2人 × 4周
- DeepSeek API测试：~500元
- 服务器和数据库：~200元/月
- 域名和其他：~200元

### 运营成本（月度）

- DeepSeek API：~0.001元/1K tokens
- 预计月使用：1000万tokens = 10元
- Vercel托管：免费层够用
- Supabase数据库：免费层够用

### 收入预测

- 免费用户：100人
- 付费用户：10人 × 99元/月 = 990元/月
- 盈亏平衡：第2个月

---

## 🎯 关键决策原则

1. **如果可以不做，就不做**
2. **如果可以简单，就不要复杂**
3. **如果可以买到，就不要自己造**
4. **如果可以后做，就不要现在做**
5. **如果用户没要求，就不要主动加**

---

## 📞 团队职责

### 产品负责人

- 守护MVP范围
- 拒绝范围蔓延
- 每日检查进度

### 开发人员

- 专注核心功能
- 不过度优化
- 快速迭代

### AI工程师

- DeepSeek集成
- Agent提示词优化
- 性能调优

---

## ⚡ 立即行动

### 今天就做

1. 创建新的Git仓库
2. 初始化Next.js项目
3. 配置DeepSeek API

### 明天目标

1. 完成第一个Agent
2. 实现基础API
3. 部署到Vercel

### 本周目标

1. 3个Agent完成
2. 基础UI完成
3. 内部演示

---

## 📌 最后的提醒

### ✅ 记住

- MVP的目标是验证核心价值
- 用户要的是AI改剧本，不是完美架构
- 每天都要有可见的进展
- 4周后必须上线

### ❌ 忘记

- 忘记微服务
- 忘记100%测试覆盖
- 忘记复杂的架构
- 忘记完美主义

### 🎯 核心信念

> "我们在做一个AI剧本助手，不是在建造下一个Netflix"

---

_文档版本: 2.0_
_创建日期: 2025-08-29_
_作者: 产品团队_
_状态: 待执行_

## 需要的支持

如果您同意这个方向，我可以立即帮您：

1. 创建项目脚手架代码
2. 编写第一个Agent实现
3. 设置GitHub仓库
4. 创建第一周的详细任务分解

**准备好开始新项目了吗？**

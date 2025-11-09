#!/bin/bash

# 🚀 ScriptAI MVP - 项目初始化脚本
# 一键创建全新的MVP项目，基于经验教训的最佳实践
# 
# 使用方法:
# cd到你想创建新项目的目录，然后运行:
# ./path/to/NEW-MVP-PROJECT/NEW-PROJECT-INIT.sh

set -e  # 遇到错误立即退出

echo "🎬 ScriptAI MVP - 项目初始化"
echo "================================"
echo ""
echo "📍 将在当前目录创建新项目: $(pwd)"
echo ""

# 1. 检查环境
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ 需要安装Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 需要安装npm"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 2. 创建项目目录
PROJECT_NAME="script-ai-mvp"
echo "📁 创建项目: $PROJECT_NAME"

if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  目录已存在，是否删除并重新创建？(y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        rm -rf "$PROJECT_NAME"
    else
        echo "退出安装"
        exit 1
    fi
fi

# 3. 使用Next.js创建项目
echo "🔨 创建Next.js项目..."
npx create-next-app@latest "$PROJECT_NAME" \
    --typescript \
    --tailwind \
    --app \
    --src-dir=false \
    --import-alias="@/*" \
    --use-npm

cd "$PROJECT_NAME"

# 4. 安装核心依赖
echo ""
echo "📦 安装核心依赖..."
npm install \
    @prisma/client prisma \
    next-auth@beta @auth/prisma-adapter \
    langchain @langchain/community \
    axios retry-axios \
    zod react-hook-form @hookform/resolvers \
    @radix-ui/react-dialog \
    @radix-ui/react-toast \
    @radix-ui/react-label \
    @radix-ui/react-select \
    @radix-ui/react-tabs \
    lucide-react \
    clsx tailwind-merge \
    date-fns \
    uuid

# 5. 安装开发依赖
echo "📦 安装开发依赖..."
npm install -D \
    @types/uuid \
    prettier \
    eslint-config-prettier

# 6. 创建项目结构
echo ""
echo "🏗️  创建项目结构..."

# 创建目录结构
mkdir -p app/api/analyze
mkdir -p app/api/auth
mkdir -p app/analyze
mkdir -p app/components
mkdir -p lib/ai/agents
mkdir -p lib/ai/providers
mkdir -p lib/db
mkdir -p lib/utils
mkdir -p public/samples
mkdir -p types

# 7. 创建环境变量文件
echo "🔐 创建环境配置..."
cat > .env.local << 'EOF'
# Database
DATABASE_URL="postgresql://localhost:5432/scriptai"

# NextAuth
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# DeepSeek API
DEEPSEEK_API_KEY="your-api-key-here"
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"
DEEPSEEK_MODEL="deepseek-chat"

# App Config
MAX_SCRIPT_LENGTH=100000
MIN_SCRIPT_LENGTH=1000
ANALYSIS_TIMEOUT=15000
MAX_TOKENS=4000
TEMPERATURE=0.7
EOF

# 8. 创建基础配置文件
echo "⚙️  创建配置文件..."

# Prettier配置
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
EOF

# TypeScript配置更新
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 9. 初始化Prisma
echo ""
echo "🗄️  初始化数据库..."
npx prisma init --datasource-provider postgresql

# 创建Prisma schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  image     String?
  projects  Project[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Project {
  id        String     @id @default(cuid())
  title     String
  content   String     @db.Text
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  analyses  Analysis[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  
  @@index([userId])
}

model Analysis {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  errors      Json
  suggestions Json
  accepted    Json?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
  
  @@index([projectId])
}
EOF

# 10. 创建核心文件模板
echo "📝 创建核心文件..."

# 创建首页
cat > app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI剧本助手
          </h1>
          <p className="text-xl text-gray-600">
            3个AI Agent协作，10秒内发现并修复剧本逻辑错误
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-4">开始分析</h2>
            <p className="text-gray-600 mb-6">
              上传或粘贴您的剧本，让AI帮您检查逻辑错误
            </p>
            <a
              href="/analyze"
              className="block w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg hover:bg-blue-700 transition"
            >
              立即开始
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
EOF

# 创建布局
cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScriptAI - AI剧本助手',
  description: '使用AI快速检查和修复剧本逻辑错误',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
EOF

# 创建DeepSeek Provider
cat > lib/ai/providers/deepseek.ts << 'EOF'
import axios from 'axios';

export class DeepSeekProvider {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || '';
  }
  
  async analyze(prompt: string, content: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content }
          ],
          max_tokens: parseInt(process.env.MAX_TOKENS || '4000'),
          temperature: parseFloat(process.env.TEMPERATURE || '0.7')
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('AI分析失败');
    }
  }
}
EOF

# 创建README
cat > README.md << 'EOF'
# 🎬 ScriptAI MVP

AI剧本助手 - 使用3个AI Agent协作分析和修复剧本逻辑错误

## 🚀 快速开始

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
编辑 `.env.local` 文件，添加你的DeepSeek API密钥

3. 初始化数据库
```bash
npx prisma migrate dev
npx prisma generate
```

4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 📋 核心功能

- ✅ 3个AI Agent协作分析
- ✅ 5种逻辑错误检测
- ✅ 10秒内完成分析
- ✅ 可执行的修改建议

## 🏗️ 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- DeepSeek API
- Vercel部署

## 📅 开发进度

- [ ] Week 1: AI核心功能
- [ ] Week 2: 用户界面
- [ ] Week 3: 完善优化
- [ ] Week 4: 发布上线

## 🎯 MVP原则

1. 简单优于复杂
2. 功能优于架构
3. 快速迭代
4. 用户反馈驱动

---

基于深刻教训的重新出发
EOF

# 11. 初始化Git
echo ""
echo "📚 初始化Git仓库..."
git init
git add .
git commit -m "feat: initialize ScriptAI MVP project

- Next.js 14 with TypeScript
- Prisma for database
- DeepSeek API integration ready
- Clean project structure
- Based on lessons learned"

# 12. 完成提示
echo ""
echo "✨ 项目创建成功！"
echo "================================"
echo ""
echo "📁 项目位置: $(pwd)"
echo ""
echo "🚀 下一步："
echo "1. 编辑 .env.local 添加你的DeepSeek API密钥"
echo "2. 运行 'npx prisma migrate dev' 创建数据库"
echo "3. 运行 'npm run dev' 启动开发服务器"
echo ""
echo "💡 提示："
echo "- 专注于AI核心功能，不要过度工程化"
echo "- 保持简单，快速迭代"
echo "- 每天都要有可见进展"
echo ""
echo "🎯 记住：4周内必须上线！"
echo ""
echo "祝开发顺利！🎉"
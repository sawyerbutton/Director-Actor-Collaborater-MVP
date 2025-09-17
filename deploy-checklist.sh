#!/bin/bash

# =====================================
# Vercel + Supabase 部署前检查脚本
# Deployment Pre-check Script
# =====================================

echo "======================================"
echo "🚀 部署前检查 / Pre-deployment Check"
echo "======================================"
echo ""

# 检查Node版本
echo "1. 检查Node.js版本..."
node_version=$(node -v)
echo "   ✓ Node版本: $node_version"
echo ""

# 检查npm版本
echo "2. 检查npm版本..."
npm_version=$(npm -v)
echo "   ✓ npm版本: $npm_version"
echo ""

# 检查是否安装了依赖
echo "3. 检查项目依赖..."
if [ -d "node_modules" ]; then
    echo "   ✓ 依赖已安装"
else
    echo "   ✗ 依赖未安装，运行: npm install"
    exit 1
fi
echo ""

# 检查TypeScript
echo "4. 运行TypeScript类型检查..."
npm run typecheck
if [ $? -eq 0 ]; then
    echo "   ✓ TypeScript检查通过"
else
    echo "   ✗ TypeScript检查失败"
    exit 1
fi
echo ""

# 检查构建
echo "5. 测试生产构建..."
npm run build
if [ $? -eq 0 ]; then
    echo "   ✓ 构建成功"
else
    echo "   ✗ 构建失败"
    exit 1
fi
echo ""

# 检查环境变量文件
echo "6. 检查环境变量配置..."
if [ -f ".env.production.example" ]; then
    echo "   ✓ 环境变量模板存在"
    echo ""
    echo "   请确保在Vercel中设置以下环境变量："
    echo "   - DATABASE_URL"
    echo "   - DIRECT_URL"
    echo "   - DEEPSEEK_API_KEY"
    echo "   - DEEPSEEK_API_ENDPOINT"
    echo "   - NODE_ENV"
    echo "   - NEXT_PUBLIC_APP_URL"
else
    echo "   ✗ 找不到.env.production.example"
fi
echo ""

# 检查Vercel配置
echo "7. 检查Vercel配置..."
if [ -f "vercel.json" ]; then
    echo "   ✓ vercel.json配置存在"
else
    echo "   ✗ vercel.json不存在"
fi
echo ""

# 检查Prisma schema
echo "8. 检查数据库Schema..."
if [ -f "prisma/schema.prisma" ]; then
    echo "   ✓ Prisma schema存在"
    echo "   运行 'npx prisma generate' 生成客户端..."
    npx prisma generate
    echo "   ✓ Prisma客户端已生成"
else
    echo "   ✗ Prisma schema不存在"
    exit 1
fi
echo ""

echo "======================================"
echo "✅ 所有检查通过！可以进行部署"
echo "======================================"
echo ""
echo "下一步："
echo "1. 在Supabase创建数据库项目"
echo "2. 在Vercel导入GitHub仓库"
echo "3. 配置环境变量"
echo "4. 点击Deploy部署"
echo ""
echo "详细步骤请查看: DEPLOYMENT-GUIDE.md"
echo ""
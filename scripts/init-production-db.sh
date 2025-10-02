#!/bin/bash

# 生产数据库初始化脚本
# 用途：初始化 Supabase 生产数据库并创建 demo-user

set -e  # 遇到错误立即退出

echo "🚀 生产数据库初始化脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤 1: 检查 Supabase 配置文件
echo "📋 步骤 1/5: 检查配置文件"
if [ ! -f ".env.supabase" ]; then
    echo -e "${RED}❌ 错误: .env.supabase 文件不存在${NC}"
    echo "请先创建 .env.supabase 文件并配置 Supabase 连接字符串"
    exit 1
fi

# 备份当前 .env
if [ -f ".env" ]; then
    echo "💾 备份当前 .env 到 .env.local.backup"
    cp .env .env.local.backup
fi

# 使用 Supabase 配置
echo "🔄 切换到 Supabase 配置"
cp .env.supabase .env
echo -e "${GREEN}✅ 配置文件准备完成${NC}"
echo ""

# 步骤 2: 测试数据库连接
echo "📋 步骤 2/5: 测试数据库连接"
echo "正在连接 Supabase..."

# 使用 Prisma 测试连接
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase 数据库连接成功${NC}"
else
    echo -e "${RED}❌ 无法连接到 Supabase 数据库${NC}"
    echo ""
    echo "可能的原因："
    echo "1. Supabase 数据库已暂停（免费版会自动暂停）"
    echo "2. DATABASE_URL 或 DIRECT_URL 配置错误"
    echo "3. 密码或凭证错误"
    echo ""
    echo "解决方案："
    echo "1. 访问 https://supabase.com/dashboard"
    echo "2. 选择项目并点击 'Resume'（如果是暂停状态）"
    echo "3. 等待 1-2 分钟后重新运行此脚本"
    echo ""

    # 恢复原 .env
    if [ -f ".env.local.backup" ]; then
        cp .env.local.backup .env
        echo "已恢复原配置文件"
    fi
    exit 1
fi
echo ""

# 步骤 3: 推送数据库 Schema
echo "📋 步骤 3/5: 推送数据库 Schema"
echo "正在同步数据库结构..."

if npx prisma db push --skip-generate; then
    echo -e "${GREEN}✅ 数据库 Schema 推送成功${NC}"
else
    echo -e "${RED}❌ 数据库 Schema 推送失败${NC}"

    # 恢复原 .env
    if [ -f ".env.local.backup" ]; then
        cp .env.local.backup .env
    fi
    exit 1
fi
echo ""

# 步骤 4: 生成 Prisma Client
echo "📋 步骤 4/5: 生成 Prisma Client"
if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client 生成成功${NC}"
else
    echo -e "${RED}❌ Prisma Client 生成失败${NC}"

    # 恢复原 .env
    if [ -f ".env.local.backup" ]; then
        cp .env.local.backup .env
    fi
    exit 1
fi
echo ""

# 步骤 5: 运行 Seed 脚本（创建 demo-user）
echo "📋 步骤 5/5: 创建 demo-user"
echo "正在运行数据库种子脚本..."

if npx prisma db seed; then
    echo -e "${GREEN}✅ demo-user 创建成功${NC}"
else
    echo -e "${YELLOW}⚠️  Seed 脚本执行有警告（可能 demo-user 已存在）${NC}"
fi
echo ""

# 验证 demo-user 是否存在
echo "🔍 验证 demo-user..."
USER_CHECK=$(npx prisma db execute --stdin <<< "SELECT id FROM \"User\" WHERE id = 'demo-user';" 2>&1 || echo "")

if echo "$USER_CHECK" | grep -q "demo-user"; then
    echo -e "${GREEN}✅ demo-user 已存在于生产数据库${NC}"
else
    echo -e "${YELLOW}⚠️  无法确认 demo-user 状态，请手动检查${NC}"
fi
echo ""

# 恢复本地配置
echo "🔄 恢复本地开发配置"
if [ -f ".env.local.backup" ]; then
    cp .env.local.backup .env
    rm .env.local.backup
    echo -e "${GREEN}✅ 本地配置已恢复${NC}"
fi
echo ""

# 完成
echo "======================================"
echo -e "${GREEN}🎉 生产数据库初始化完成！${NC}"
echo ""
echo "下一步："
echo "1. 确认 Vercel 环境变量配置正确"
echo "2. 推送诊断代码: git push origin feature/epic-1-rag-poc"
echo "3. 访问诊断端点验证配置"
echo "4. 测试生产环境 API"
echo ""
echo "如需重新测试，运行:"
echo "  bash scripts/init-production-db.sh"
echo ""

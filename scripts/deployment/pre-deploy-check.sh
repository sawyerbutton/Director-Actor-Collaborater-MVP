#!/bin/bash

# =====================================
# Vercel 部署前检查脚本
# Pre-deployment Check Script
# =====================================

echo "======================================"
echo "🚀 Vercel 部署前检查"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. 检查环境变量配置..."
if [ -f ".env" ]; then
    # 检查必需的环境变量
    if grep -q "DATABASE_URL=" .env; then
        # 检查 DATABASE_URL 格式
        if grep -q "pgbouncer=true" .env; then
            check_pass "DATABASE_URL 包含 pgbouncer=true"
        else
            check_fail "DATABASE_URL 缺少 pgbouncer=true 参数"
        fi

        # 检查端口号
        if grep "DATABASE_URL=" .env | grep -q ":6543"; then
            check_pass "DATABASE_URL 使用正确端口 6543"
        else
            check_fail "DATABASE_URL 端口错误（应该是 6543）"
        fi
    else
        check_fail "缺少 DATABASE_URL"
    fi

    if grep -q "DIRECT_URL=" .env; then
        # 检查端口号
        if grep "DIRECT_URL=" .env | grep -q ":5432"; then
            check_pass "DIRECT_URL 使用正确端口 5432"
        else
            check_fail "DIRECT_URL 端口错误（应该是 5432）"
        fi
    else
        check_fail "缺少 DIRECT_URL"
    fi

    # 检查密码格式
    if grep -E "DATABASE_URL=.*\[.*\]" .env > /dev/null; then
        check_fail "DATABASE_URL 密码包含方括号，请去掉 []"
    fi

    if grep -E "DIRECT_URL=.*\[.*\]" .env > /dev/null; then
        check_fail "DIRECT_URL 密码包含方括号，请去掉 []"
    fi

    if grep -q "DEEPSEEK_API_KEY=" .env; then
        check_pass "DEEPSEEK_API_KEY 已配置"
    else
        check_warn "DEEPSEEK_API_KEY 未配置"
    fi

    if grep -q "DEEPSEEK_API_URL=" .env; then
        check_pass "DEEPSEEK_API_URL 已配置"
    else
        # 检查是否错误使用了 DEEPSEEK_API_ENDPOINT
        if grep -q "DEEPSEEK_API_ENDPOINT=" .env; then
            check_fail "应该使用 DEEPSEEK_API_URL 而不是 DEEPSEEK_API_ENDPOINT"
        else
            check_warn "DEEPSEEK_API_URL 未配置"
        fi
    fi
else
    check_fail "找不到 .env 文件"
fi
echo ""

echo "2. 检查 Prisma 配置..."
if [ -f "prisma/schema.prisma" ]; then
    if grep -q "directUrl" prisma/schema.prisma; then
        check_pass "Prisma schema 包含 directUrl 配置"
    else
        check_fail "Prisma schema 缺少 directUrl 配置"
    fi
else
    check_fail "找不到 prisma/schema.prisma"
fi
echo ""

echo "3. 检查 Vercel 配置..."
if [ -f "vercel.json" ]; then
    if grep -q "prisma generate" vercel.json; then
        check_pass "vercel.json 包含 Prisma 生成命令"
    else
        check_warn "vercel.json 未包含 prisma generate 命令"
    fi
else
    check_warn "找不到 vercel.json"
fi
echo ""

echo "4. 测试数据库连接..."
npx prisma db push --accept-data-loss=false > /dev/null 2>&1
if [ $? -eq 0 ]; then
    check_pass "数据库连接成功"
else
    check_fail "数据库连接失败，请检查连接字符串"
fi
echo ""

echo "5. 测试生产构建..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    check_pass "生产构建成功"
else
    check_fail "生产构建失败"
fi
echo ""

echo "======================================"
echo "✅ 所有检查通过！可以部署到 Vercel"
echo "======================================"
echo ""
echo "下一步："
echo "1. git add . && git commit -m 'Ready for deployment'"
echo "2. git push origin main"
echo "3. 在 Vercel Dashboard 查看部署进度"
echo ""
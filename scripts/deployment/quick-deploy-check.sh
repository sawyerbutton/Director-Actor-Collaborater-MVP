#!/bin/bash

# =====================================
# 快速部署验证脚本
# Quick Deployment Verification
# =====================================

echo "======================================"
echo "🚀 Vercel 部署快速验证"
echo "======================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# 1. 检查关键文件
echo "✅ 检查关键配置文件："
[ -f "vercel.json" ] && echo -e "  ${GREEN}✓${NC} vercel.json" || { echo -e "  ${RED}✗${NC} vercel.json"; FAILED=1; }
[ -f "package.json" ] && echo -e "  ${GREEN}✓${NC} package.json" || { echo -e "  ${RED}✗${NC} package.json"; FAILED=1; }
[ -f "prisma/schema.prisma" ] && echo -e "  ${GREEN}✓${NC} prisma/schema.prisma" || { echo -e "  ${RED}✗${NC} prisma/schema.prisma"; FAILED=1; }
[ -f ".env" ] && echo -e "  ${GREEN}✓${NC} .env (本地)" || echo -e "  ${YELLOW}⚠${NC} .env (需要在Vercel配置)"
echo ""

# 2. 验证环境变量配置
echo "✅ 验证环境变量："
if [ -f ".env" ]; then
    grep -q "DATABASE_URL=.*pgbouncer=true" .env && echo -e "  ${GREEN}✓${NC} DATABASE_URL (连接池)" || echo -e "  ${RED}✗${NC} DATABASE_URL"
    grep -q "DIRECT_URL=.*:5432" .env && echo -e "  ${GREEN}✓${NC} DIRECT_URL (直连)" || echo -e "  ${RED}✗${NC} DIRECT_URL"
    grep -q "DEEPSEEK_API_KEY=" .env && echo -e "  ${GREEN}✓${NC} DEEPSEEK_API_KEY" || echo -e "  ${YELLOW}⚠${NC} DEEPSEEK_API_KEY"
fi
echo ""

# 3. 测试构建
echo "✅ 测试生产构建："
echo "  运行中..."
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} 构建成功"
else
    echo -e "  ${RED}✗${NC} 构建失败 (查看 /tmp/build.log)"
    FAILED=1
fi
echo ""

# 4. 测试数据库
echo "✅ 测试数据库连接："
npx prisma db push --accept-data-loss=false > /tmp/db.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} 数据库连接成功"
else
    echo -e "  ${RED}✗${NC} 数据库连接失败 (查看 /tmp/db.log)"
    FAILED=1
fi
echo ""

echo "======================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 部署验证通过！${NC}"
    echo ""
    echo "部署到 Vercel："
    echo "  1. git add . && git commit -m 'Deploy to production'"
    echo "  2. git push origin main"
    echo ""
    echo "Vercel 环境变量配置："
    echo "  DATABASE_URL, DIRECT_URL, DEEPSEEK_API_KEY, DEEPSEEK_API_URL"
else
    echo -e "${RED}❌ 验证失败，请检查上述问题${NC}"
    exit 1
fi
echo "======================================"
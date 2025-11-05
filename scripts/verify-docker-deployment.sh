#!/bin/bash

# ===================================
# Docker Deployment Verification Script
# Sprint 4 - T4.5
# ===================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Docker Deployment Verification"
echo "Project: Director-Actor-Collaborater-MVP"
echo "Sprint: Sprint 4 - T4.5"
echo "=================================================="
echo ""

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
  fi
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# ===================================
# Step 1: Check Docker Installation
# ===================================
echo "Step 1: Checking Docker installation..."

if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  print_status 0 "Docker installed: $DOCKER_VERSION"
else
  print_status 1 "Docker not installed"
  exit 1
fi

if command -v docker-compose &> /dev/null; then
  COMPOSE_VERSION=$(docker-compose --version)
  print_status 0 "Docker Compose installed: $COMPOSE_VERSION"
else
  print_status 1 "Docker Compose not installed"
  exit 1
fi

echo ""

# ===================================
# Step 2: Check Docker Daemon
# ===================================
echo "Step 2: Checking Docker daemon..."

if docker info &> /dev/null; then
  print_status 0 "Docker daemon is running"
else
  print_status 1 "Docker daemon is not running"
  echo "Please start Docker daemon and try again"
  exit 1
fi

echo ""

# ===================================
# Step 3: Verify Docker Compose Files
# ===================================
echo "Step 3: Verifying Docker Compose files..."

cd "$PROJECT_ROOT"

if [ -f "docker-compose.yml" ]; then
  print_status 0 "docker-compose.yml exists"
else
  print_status 1 "docker-compose.yml not found"
  exit 1
fi

if [ -f "docker-compose.dev.yml" ]; then
  print_status 0 "docker-compose.dev.yml exists"
else
  print_warning "docker-compose.dev.yml not found (optional)"
fi

# Validate docker-compose.yml syntax
if docker-compose config > /dev/null 2>&1; then
  print_status 0 "docker-compose.yml syntax is valid"
else
  print_status 1 "docker-compose.yml syntax error"
  docker-compose config
  exit 1
fi

echo ""

# ===================================
# Step 4: Check PostgreSQL Service
# ===================================
echo "Step 4: Checking PostgreSQL service..."

# Check if postgres container exists
if docker ps -a --format '{{.Names}}' | grep -q "^director-postgres$"; then
  print_status 0 "PostgreSQL container exists"

  # Check if running
  if docker ps --format '{{.Names}}' | grep -q "^director-postgres$"; then
    print_status 0 "PostgreSQL container is running"

    # Check health
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' director-postgres 2>/dev/null || echo "unknown")
    if [ "$HEALTH_STATUS" = "healthy" ]; then
      print_status 0 "PostgreSQL is healthy"
    elif [ "$HEALTH_STATUS" = "starting" ]; then
      print_warning "PostgreSQL is starting..."
    else
      print_warning "PostgreSQL health status: $HEALTH_STATUS"
    fi

    # Check port mapping
    if docker port director-postgres | grep -q "5432.*5433"; then
      print_status 0 "PostgreSQL port mapping: 5433:5432"
    else
      print_warning "PostgreSQL port mapping may be incorrect"
    fi
  else
    print_warning "PostgreSQL container exists but not running"
  fi
else
  print_warning "PostgreSQL container not found"
  echo "  Run: docker-compose up -d postgres"
fi

echo ""

# ===================================
# Step 5: Test Database Connection
# ===================================
echo "Step 5: Testing database connection..."

if docker ps --format '{{.Names}}' | grep -q "^director-postgres$"; then
  if docker exec director-postgres pg_isready -U director_user -d director_actor_db > /dev/null 2>&1; then
    print_status 0 "Database is accepting connections"

    # Test table existence
    TABLE_COUNT=$(docker exec director-postgres psql -U director_user -d director_actor_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')
    if [ ! -z "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
      print_status 0 "Database has $TABLE_COUNT tables"
    else
      print_warning "Database has no tables (run: npx prisma db push)"
    fi
  else
    print_status 1 "Cannot connect to database"
  fi
else
  print_warning "PostgreSQL container not running, skipping connection test"
fi

echo ""

# ===================================
# Step 6: Check Python Converter Service
# ===================================
echo "Step 6: Checking Python converter service..."

if docker ps -a --format '{{.Names}}' | grep -q "^python-converter$"; then
  print_status 0 "Python converter container exists"

  if docker ps --format '{{.Names}}' | grep -q "^python-converter$"; then
    print_status 0 "Python converter is running"

    # Check health
    if docker exec python-converter python -c "import httpx; httpx.get('http://localhost:8001/health', timeout=5)" > /dev/null 2>&1; then
      print_status 0 "Python converter is healthy"
    else
      print_warning "Python converter health check failed"
    fi

    # Check port mapping
    if docker port python-converter | grep -q "8001.*8001"; then
      print_status 0 "Python converter port mapping: 8001:8001"
    else
      print_warning "Python converter port mapping may be incorrect"
    fi
  else
    print_warning "Python converter exists but not running"
  fi
else
  print_warning "Python converter not found"
  echo "  Run: docker-compose up -d python-converter"
fi

echo ""

# ===================================
# Step 7: Check Docker Network
# ===================================
echo "Step 7: Checking Docker network..."

if docker network ls | grep -q "director_network"; then
  print_status 0 "Docker network 'director_network' exists"

  # Check connected containers
  CONNECTED_CONTAINERS=$(docker network inspect director_network --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null)
  if [ ! -z "$CONNECTED_CONTAINERS" ]; then
    print_status 0 "Connected containers: $CONNECTED_CONTAINERS"
  fi
else
  print_warning "Docker network 'director_network' not found"
fi

echo ""

# ===================================
# Step 8: Check Docker Volumes
# ===================================
echo "Step 8: Checking Docker volumes..."

if docker volume ls | grep -q "director_postgres_data"; then
  print_status 0 "PostgreSQL data volume exists"

  # Get volume size
  VOLUME_SIZE=$(docker system df -v | grep "director_postgres_data" | awk '{print $3}' || echo "unknown")
  echo "  Volume size: $VOLUME_SIZE"
else
  print_warning "PostgreSQL data volume not found"
fi

echo ""

# ===================================
# Step 9: Resource Usage
# ===================================
echo "Step 9: Checking resource usage..."

if docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(director-postgres|python-converter)" > /dev/null 2>&1; then
  echo "Container resource usage:"
  docker stats --no-stream --format "  {{.Container}}: CPU={{.CPUPerc}}, MEM={{.MemUsage}}" | grep -E "(director-postgres|python-converter)" || true
fi

echo ""

# ===================================
# Step 10: Summary
# ===================================
echo "=================================================="
echo "Verification Summary"
echo "=================================================="

TOTAL_CHECKS=0
PASSED_CHECKS=0

# Count running containers
RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E "(director-postgres|python-converter)" | wc -l)
TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
PASSED_CHECKS=$((PASSED_CHECKS + RUNNING_CONTAINERS))

echo ""
echo "Running containers: $RUNNING_CONTAINERS/2"
echo ""

if [ $RUNNING_CONTAINERS -eq 2 ]; then
  echo -e "${GREEN}✓ Docker deployment is operational${NC}"
  exit 0
elif [ $RUNNING_CONTAINERS -eq 1 ]; then
  echo -e "${YELLOW}⚠ Partial deployment (1/2 services running)${NC}"
  echo "Run: docker-compose up -d"
  exit 1
else
  echo -e "${YELLOW}⚠ No services running${NC}"
  echo "To start services, run: docker-compose up -d"
  exit 2
fi

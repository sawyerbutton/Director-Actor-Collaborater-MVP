#!/bin/bash

# Setup test environment for E2E and unit tests
echo "Setting up test environment..."

# Check if running in WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "WSL environment detected, configuring DISPLAY variable..."
  
  # Set DISPLAY for WSL
  export DISPLAY=:0
  echo "DISPLAY=$DISPLAY" >> .env.test
  
  # Also set NO_PROXY for localhost
  export NO_PROXY="localhost,127.0.0.1,::1"
  export no_proxy="localhost,127.0.0.1,::1"
  
  echo "WSL environment configured"
fi

# Database credentials from Docker setup
DB_USER="postgres"
DB_PASSWORD="postgres123"
DB_HOST="localhost"
DB_PORT="5432"
TEST_DB="scriptai_test"

# Check if psql is available, if not skip database setup
if command -v psql &> /dev/null; then
  # Create test database if it doesn't exist
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$TEST_DB'" 2>/dev/null | grep -q 1 || \
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $TEST_DB" 2>/dev/null
  
  echo "Test database '$TEST_DB' is ready"
else
  echo "psql not found, skipping database creation (database may need to be created manually)"
fi

# Update .env.test with correct database URL
if [ -f .env.test ]; then
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$TEST_DB|" .env.test
else
  # Create .env.test if it doesn't exist
  cat > .env.test << EOF
# Test Environment Configuration
NODE_ENV=test

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$TEST_DB

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key-for-testing-only-do-not-use-in-production

# DeepSeek API Configuration (Mock for testing)
DEEPSEEK_API_KEY=test_deepseek_api_key
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1

# Redis Configuration (optional - will fallback to in-memory if not set)
# REDIS_URL=redis://localhost:6379

# Test-specific settings
TEST_TIMEOUT=30000
BASE_URL=http://localhost:3000

# WSL-specific settings
NO_PROXY=localhost,127.0.0.1,::1
no_proxy=localhost,127.0.0.1,::1
DISPLAY=:0
EOF
fi

echo "Updated .env.test with correct configuration"
echo "Test environment setup complete!"
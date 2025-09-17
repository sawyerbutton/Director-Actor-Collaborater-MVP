#!/bin/bash

# E2E Test Runner for WSL Environment
# This script handles common WSL issues with Playwright

echo "🧪 ScriptAI MVP - E2E Test Runner"
echo "=================================="
echo ""

# Set environment variables for WSL
export DISPLAY=:0
export NODE_ENV=test
export PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright

# Check if dev server is needed
echo "📦 Checking development server..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  Dev server not responding on port 3000"
    echo ""
    echo "Please start the dev server in another terminal:"
    echo "  npm run dev"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Dev server is running"
echo ""

# Function to run tests with proper error handling
run_tests() {
    local test_pattern=$1
    local description=$2
    
    echo "🏃 Running: $description"
    echo "----------------------------------------"
    
    if npx playwright test $test_pattern --reporter=list --timeout=30000; then
        echo "✅ $description passed"
        return 0
    else
        echo "❌ $description failed"
        return 1
    fi
    echo ""
}

# Parse command line arguments
case "$1" in
    "smoke")
        echo "🔥 Running smoke tests only..."
        run_tests "smoke.spec.ts" "Smoke Tests"
        ;;
    "p0")
        echo "🎯 Running P0 (Critical) tests only..."
        run_tests "--grep P0" "P0 Critical Tests"
        ;;
    "auth")
        echo "🔐 Running authentication tests..."
        run_tests "auth.spec.ts" "Authentication Tests"
        ;;
    "all")
        echo "📊 Running all E2E tests..."
        run_tests "" "All E2E Tests"
        ;;
    "headed")
        echo "👁️  Running tests in headed mode (visible browser)..."
        npx playwright test --headed --reporter=list
        ;;
    "ui")
        echo "🎨 Opening Playwright UI..."
        npx playwright test --ui
        ;;
    "report")
        echo "📈 Showing test report..."
        npx playwright show-report
        ;;
    *)
        echo "Usage: ./run-e2e-tests.sh [command]"
        echo ""
        echo "Commands:"
        echo "  smoke   - Run basic smoke tests"
        echo "  p0      - Run P0 critical tests only"
        echo "  auth    - Run authentication tests"
        echo "  all     - Run all E2E tests"
        echo "  headed  - Run tests with visible browser"
        echo "  ui      - Open Playwright UI"
        echo "  report  - Show HTML test report"
        echo ""
        echo "Example:"
        echo "  ./run-e2e-tests.sh smoke"
        ;;
esac

# Summary
echo ""
echo "=================================="
echo "Test run completed at: $(date)"
#!/bin/bash

echo "🔧 WSL E2E Test Environment Fix"
echo "================================"
echo ""

# 1. Fix Proxy Issues
echo "📡 Step 1: Configuring proxy settings..."
export NO_PROXY="localhost,127.0.0.1,::1,0.0.0.0"
export no_proxy="localhost,127.0.0.1,::1,0.0.0.0"
echo "export NO_PROXY='localhost,127.0.0.1,::1,0.0.0.0'" >> ~/.bashrc
echo "export no_proxy='localhost,127.0.0.1,::1,0.0.0.0'" >> ~/.bashrc
echo "✅ Proxy bypass configured"
echo ""

# 2. Install Required Dependencies
echo "📦 Step 2: Installing system dependencies..."
echo "This may require your sudo password..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
    xvfb \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0
echo "✅ Dependencies installed"
echo ""

# 3. Configure Display
echo "🖥️ Step 3: Configuring display..."
export DISPLAY=:99
echo "export DISPLAY=:99" >> ~/.bashrc
echo "✅ Display configured"
echo ""

# 4. Start Xvfb
echo "🚀 Step 4: Starting virtual display..."
pkill Xvfb 2>/dev/null
Xvfb :99 -screen 0 1280x720x24 > /dev/null 2>&1 &
sleep 2
echo "✅ Virtual display started"
echo ""

# 5. Test Setup
echo "🧪 Step 5: Testing setup..."
echo ""

# Create a test file that doesn't need localhost
cat > /tmp/test-playwright.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log('Creating page...');
  const page = await browser.newPage();
  
  console.log('Navigating to example.com...');
  await page.goto('https://example.com');
  
  console.log('Getting title...');
  const title = await page.title();
  console.log('Page title:', title);
  
  await browser.close();
  console.log('✅ Playwright is working!');
})();
EOF

NO_PROXY="localhost,127.0.0.1,::1" node /tmp/test-playwright.js

echo ""
echo "================================"
echo "✅ WSL E2E environment is fixed!"
echo ""
echo "To run your E2E tests:"
echo "1. Make sure dev server is running: PORT=3001 npm run dev"
echo "2. In another terminal: NO_PROXY=localhost,127.0.0.1 npx playwright test"
echo ""
echo "Or use: ./run-e2e-no-proxy.sh"
echo ""
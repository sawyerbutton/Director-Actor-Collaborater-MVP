#!/bin/bash

# Playwright Dependencies Installation for WSL
echo "📦 Installing Playwright Dependencies for WSL"
echo "============================================"
echo ""
echo "This script will install all required system dependencies."
echo "You may need to enter your sudo password."
echo ""

# Core dependencies for Chromium
DEPS="
  libnss3
  libnspr4
  libdbus-1-3
  libatk1.0-0
  libatk-bridge2.0-0
  libcups2
  libdrm2
  libxkbcommon0
  libatspi2.0-0
  libxcomposite1
  libxdamage1
  libxfixes3
  libxrandr2
  libgbm1
  libasound2
  libxcb1
  libx11-xcb1
  libxcursor1
  libxi6
  libxtst6
  libxss1
  libpangocairo-1.0-0
  libgtk-3-0
  libgdk-pixbuf2.0-0
  libcairo-gobject2
  fonts-liberation
  libappindicator3-1
  libnss3
  lsb-release
  xdg-utils
  wget
"

echo "📋 Dependencies to install:"
echo "$DEPS" | tr '\n' ' '
echo ""
echo ""

# Update package list
echo "📥 Updating package list..."
sudo apt-get update

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt-get install -y $DEPS

# Additional WSL-specific packages
echo "🔧 Installing WSL-specific packages..."
sudo apt-get install -y \
  x11-utils \
  xvfb \
  libgbm-dev

echo ""
echo "✅ Dependencies installation complete!"
echo ""

# Verify Playwright installation
echo "🔍 Verifying Playwright installation..."
npx playwright --version

# Re-install browsers with new dependencies
echo ""
echo "🌐 Re-installing Playwright browsers..."
npx playwright install chromium

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set display variable: export DISPLAY=:0"
echo "2. Run tests: npm run test:e2e"
echo ""
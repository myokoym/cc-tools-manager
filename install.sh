#!/bin/bash

# Claude Code Package Manager Local Installation Script

set -e

echo "🚀 Installing Claude Code Package Manager..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Check if we're running from within the repository
if [ -f "package.json" ] && grep -q '"name": "claude-code-package-manager"' package.json 2>/dev/null; then
    echo "📂 Running from local repository..."
    INSTALL_DIR=$(pwd)
else
    # Running from curl or different location, need to clone
    CCPM_HOME="${CCPM_HOME:-$HOME/.ccpm}"
    INSTALL_DIR="$CCPM_HOME/src/claude-code-package-manager"
    if [ -d "$INSTALL_DIR" ]; then
        echo "📁 Directory $INSTALL_DIR already exists. Updating..."
        cd "$INSTALL_DIR"
        git pull
    else
        echo "📥 Cloning repository..."
        mkdir -p "$(dirname "$INSTALL_DIR")"
        git clone https://github.com/myokoym/claude-code-package-manager.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Create symlink
echo "🔗 Creating global command..."
npm link

echo "✅ Installation complete!"
echo ""
echo "You can now use ccpm globally:"
echo "  ccpm --help"
echo ""
echo "To uninstall, run:"
echo "  npm unlink -g claude-code-package-manager"
echo ""
echo "Installation directory:"
echo "  $INSTALL_DIR"
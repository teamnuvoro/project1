#!/bin/bash

# Quick Sync Script - Simple one-command sync
# Usage: bash replit-quick-sync.sh

cd /home/runner/workspace || exit 1

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}⚡ Quick Sync${NC}"

# Remove locks
rm -f .git/index.lock .git/config.lock 2>/dev/null

# Initialize if needed
if [ ! -d ".git" ]; then
    echo "Initializing git..."
    git init
    git remote add origin https://github.com/teamnuvoro/project1.git 2>/dev/null || true
fi

# Setup remote
git remote set-url origin https://github.com/teamnuvoro/project1.git 2>/dev/null || \
git remote add origin https://github.com/teamnuvoro/project1.git 2>/dev/null

# Pull latest
echo -e "${YELLOW}Pulling...${NC}"
git fetch origin main 2>/dev/null
git pull origin main --no-edit 2>/dev/null || {
    echo -e "${RED}⚠️  Pull had issues. Check manually.${NC}"
}

# Show status
echo -e "${GREEN}✅ Sync complete!${NC}"
echo ""
git status --short


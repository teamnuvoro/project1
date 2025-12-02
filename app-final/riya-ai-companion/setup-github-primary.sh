#!/bin/bash

echo "🚀 Setting up project1 as primary repository"
echo ""

# Wait for any git locks
sleep 2

# Set up git remote
echo "📝 Configuring git remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/teamnuvoro/project1.git

# Verify remote
echo "✅ Current remote:"
git remote -v

echo ""
echo "🔄 Fetching latest code from project1..."
git fetch origin main

echo ""
echo "✅ GitHub Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Any future code changes will push to: https://github.com/teamnuvoro/project1"
echo "2. To pull latest changes: git pull origin main"
echo "3. To push your changes: git push origin main"
echo ""
echo "Your repository is ready! 🎉"

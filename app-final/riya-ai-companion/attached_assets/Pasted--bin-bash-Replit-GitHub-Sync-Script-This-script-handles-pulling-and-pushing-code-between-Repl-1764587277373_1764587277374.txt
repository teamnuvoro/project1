#!/bin/bash

# Replit GitHub Sync Script
# This script handles pulling and pushing code between Replit and GitHub
# Handles common issues like git locks, merge conflicts, and authentication

set -e

REPO_URL="https://github.com/teamnuvoro/project1.git"
BRANCH="main"
PROJECT_DIR="/home/runner/workspace"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Replit GitHub Sync Tool${NC}"
echo "=================================="

cd "$PROJECT_DIR" || exit 1

# Function to check if git is initialized
check_git_init() {
    if [ ! -d ".git" ]; then
        echo -e "${YELLOW}⚠️  Git not initialized. Initializing...${NC}"
        git init
        git config user.name "Replit User" || true
        git config user.email "replit@noreply.com" || true
    fi
}

# Function to setup remote
setup_remote() {
    if ! git remote get-url origin &>/dev/null; then
        echo -e "${YELLOW}📡 Setting up GitHub remote...${NC}"
        git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
    else
        CURRENT_URL=$(git remote get-url origin)
        if [ "$CURRENT_URL" != "$REPO_URL" ]; then
            echo -e "${YELLOW}🔄 Updating remote URL...${NC}"
            git remote set-url origin "$REPO_URL"
        fi
    fi
}

# Function to handle git lock
handle_git_lock() {
    if [ -f ".git/index.lock" ]; then
        echo -e "${YELLOW}🔓 Removing git lock file...${NC}"
        rm -f .git/index.lock
    fi
    if [ -f ".git/config.lock" ]; then
        echo -e "${YELLOW}🔓 Removing git config lock...${NC}"
        rm -f .git/config.lock
    fi
}

# Function to stash changes
stash_changes() {
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${YELLOW}💾 Stashing local changes...${NC}"
        git stash push -m "Replit auto-stash $(date +%Y-%m-%d_%H:%M:%S)" || true
        return 0
    fi
    return 1
}

# Function to pull from GitHub
pull_from_github() {
    echo -e "${GREEN}⬇️  Pulling latest code from GitHub...${NC}"
    
    handle_git_lock
    check_git_init
    setup_remote
    
    # Fetch first
    git fetch origin "$BRANCH" || {
        echo -e "${RED}❌ Failed to fetch from GitHub${NC}"
        return 1
    }
    
    # Check if we have uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        read -p "Stash changes and pull? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            stash_changes
        else
            echo -e "${RED}❌ Pull cancelled${NC}"
            return 1
        fi
    fi
    
    # Try to pull
    if git pull origin "$BRANCH" --no-rebase; then
        echo -e "${GREEN}✅ Successfully pulled from GitHub${NC}"
        
        # Restore stashed changes if any
        if git stash list | grep -q "Replit auto-stash"; then
            echo -e "${YELLOW}📦 Restoring stashed changes...${NC}"
            git stash pop || true
        fi
        return 0
    else
        echo -e "${RED}❌ Pull failed. You may have merge conflicts.${NC}"
        echo -e "${YELLOW}💡 Try: git status to see conflicts${NC}"
        return 1
    fi
}

# Function to push to GitHub
push_to_github() {
    echo -e "${GREEN}⬆️  Pushing code to GitHub...${NC}"
    
    handle_git_lock
    check_git_init
    setup_remote
    
    # Check if there are changes to commit
    if git diff --quiet && git diff --cached --quiet; then
        echo -e "${YELLOW}ℹ️  No changes to commit${NC}"
        return 0
    fi
    
    # Check if we need to pull first
    git fetch origin "$BRANCH" 2>/dev/null || true
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
    
    if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${YELLOW}⚠️  Remote has changes. Pull first? (y/n): ${NC}"
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pull_from_github
        fi
    fi
    
    # Stage all changes
    git add -A
    
    # Check if there's anything to commit
    if git diff --cached --quiet; then
        echo -e "${YELLOW}ℹ️  No changes to commit${NC}"
        return 0
    fi
    
    # Commit
    COMMIT_MSG="Replit auto-commit $(date +%Y-%m-%d_%H:%M:%S)"
    git commit -m "$COMMIT_MSG" || {
        echo -e "${RED}❌ Commit failed${NC}"
        return 1
    }
    
    # Push
    if git push origin "$BRANCH"; then
        echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
        return 0
    else
        echo -e "${RED}❌ Push failed. Check your permissions.${NC}"
        return 1
    fi
}

# Function to sync (pull then push)
sync_with_github() {
    echo -e "${GREEN}🔄 Syncing with GitHub...${NC}"
    pull_from_github
    push_to_github
}

# Main menu
case "${1:-menu}" in
    pull)
        pull_from_github
        ;;
    push)
        push_to_github
        ;;
    sync)
        sync_with_github
        ;;
    setup)
        echo -e "${GREEN}⚙️  Setting up Git...${NC}"
        handle_git_lock
        check_git_init
        setup_remote
        echo -e "${GREEN}✅ Git setup complete!${NC}"
        ;;
    *)
        echo "Usage: $0 [pull|push|sync|setup]"
        echo ""
        echo "Commands:"
        echo "  pull   - Pull latest code from GitHub"
        echo "  push   - Push your changes to GitHub"
        echo "  sync   - Pull then push (full sync)"
        echo "  setup  - Initialize git and setup remote"
        echo ""
        echo "Examples:"
        echo "  bash replit-git-sync.sh pull"
        echo "  bash replit-git-sync.sh push"
        echo "  bash replit-git-sync.sh sync"
        ;;
esac


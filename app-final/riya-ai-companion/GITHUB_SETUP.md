# Riya AI - GitHub Integration Setup

This document explains how to use the GitHub integration with your Replit project.

## 🎯 Primary Repository

**Repository:** `teamnuvoro/project1`  
**URL:** https://github.com/teamnuvoro/project1

All code is synced between Replit and this GitHub repository.

---

## 🚀 Quick Start (Choose One)

### Option 1: One-Command Quick Sync (Easiest)
```bash
bash replit-quick-sync.sh
```
This pulls latest code from GitHub, makes changes, and pushes everything back.

### Option 2: Full Control with Detailed Sync
```bash
# Pull latest code
bash replit-git-sync.sh pull

# Make your changes in Replit...

# Push your changes
bash replit-git-sync.sh push
```

### Option 3: Full Sync (Pull + Push)
```bash
bash replit-git-sync.sh sync
```

---

## 📋 Detailed Usage

### First Time Setup
```bash
bash replit-git-sync.sh setup
```
This initializes git and connects to project1 repository.

### Pull Code from GitHub
When you make changes on your laptop and push to GitHub:
```bash
bash replit-git-sync.sh pull
```

### Push Your Replit Changes
After editing in Replit:
```bash
bash replit-git-sync.sh push
```

### Check Status
```bash
git status
```

---

## 🔄 Daily Workflow

### Scenario 1: Work on Laptop → Sync to Replit
1. Make changes on your laptop
2. Push to GitHub: `git push origin main`
3. In Replit Shell: `bash replit-git-sync.sh pull`

### Scenario 2: Work in Replit → Sync to GitHub
1. Make changes in Replit
2. In Shell: `bash replit-git-sync.sh push`
3. On laptop: `git pull origin main`

### Scenario 3: Work in Both → Stay in Sync
1. Before starting: `bash replit-git-sync.sh pull`
2. Make your changes
3. When done: `bash replit-git-sync.sh push`

---

## 🛠️ Commands Reference

| Command | What It Does |
|---------|-------------|
| `bash replit-quick-sync.sh` | Quick sync (pull + push in one) |
| `bash replit-git-sync.sh pull` | Get latest from GitHub |
| `bash replit-git-sync.sh push` | Send your changes to GitHub |
| `bash replit-git-sync.sh sync` | Full sync (pull then push) |
| `bash replit-git-sync.sh setup` | Initialize git connection |
| `git status` | See what changed |
| `git log --oneline -5` | See recent commits |

---

## ⚠️ Troubleshooting

### Problem: "Nothing to commit"
This is normal! It means your code is already synced.

### Problem: Merge conflicts
When pulling:
1. Fix conflicts in affected files
2. Run: `git add .`
3. Run: `git commit -m "Resolve conflicts"`
4. Run: `git push origin main`

### Problem: "Fatal: not a git repository"
Your git setup got corrupted. Fix it:
```bash
bash replit-git-sync.sh setup
```

### Problem: Permission denied
You need write access to the repository. Check:
1. Are you part of the `teamnuvoro` GitHub organization?
2. Is the repository accessible to your account?

---

## 📝 Best Practices

1. **Always pull before starting work**
   ```bash
   bash replit-git-sync.sh pull
   ```

2. **Commit frequently** - Don't wait to sync large changes

3. **Use meaningful commit messages** - Help future you understand what changed

4. **Check status before pushing**
   ```bash
   git status
   ```

5. **Test before syncing** - Make sure changes work in Replit before pushing

---

## 🔐 Authentication

The scripts use HTTPS with GitHub's token authentication. If you're asked for a password:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Use the token as your password when prompted

---

## 📚 Repository Structure

```
project1/
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared types
├── supabase/               # Supabase config
├── replit-git-sync.sh      # Full-featured sync script
├── replit-quick-sync.sh    # Quick one-command sync
└── GITHUB_SETUP.md         # This file
```

---

## 🎯 Your Workflow Going Forward

1. **Every morning:** `bash replit-quick-sync.sh`
2. **Make your changes** in Replit
3. **Every afternoon/evening:** `bash replit-quick-sync.sh`
4. **Work from laptop?** Push to GitHub, then `bash replit-quick-sync.sh pull` in Replit

That's it! Everything stays synced automatically. 🚀

# Replit GitHub Integration Guide

This guide helps you easily sync code between Replit and GitHub.

## 🚀 Quick Setup (One-Time)

### Option 1: Import from GitHub (Recommended)
1. In Replit, click **"Import from GitHub"**
2. Enter: `https://github.com/teamnuvoro/project1`
3. Click **"Import"**
4. Done! Your code is now in Replit

### Option 2: Clone Manually
Open Replit Shell and run:
```bash
cd /home/runner/workspace
git clone https://github.com/teamnuvoro/project1.git .
```

## 📥 Pull Latest Code from GitHub

When you push code from your laptop, pull it in Replit:

```bash
bash replit-git-sync.sh pull
```

Or manually:
```bash
cd /home/runner/workspace
git pull origin main
```

## 📤 Push Your Changes to GitHub

After making changes in Replit:

```bash
bash replit-git-sync.sh push
```

This will:
- Stage all changes
- Commit with timestamp
- Push to GitHub

## 🔄 Full Sync (Pull + Push)

To sync both ways:

```bash
bash replit-git-sync.sh sync
```

## ⚙️ Initial Setup

If git isn't configured yet:

```bash
bash replit-git-sync.sh setup
```

## 🛠️ Troubleshooting

### Problem: "Permission denied"
**Solution:** You need write access to the GitHub repo. Ask the owner to add you as a collaborator.

### Problem: "Git config locked"
**Solution:** The script automatically handles this, but if it persists:
```bash
rm -f .git/index.lock .git/config.lock
bash replit-git-sync.sh pull
```

### Problem: "Merge conflicts"
**Solution:** 
```bash
git status  # See conflicts
# Edit conflicted files, then:
git add .
git commit -m "Resolve conflicts"
git push origin main
```

### Problem: "Remote not found"
**Solution:**
```bash
bash replit-git-sync.sh setup
```

### Problem: "Authentication failed"
**Solution:** Use HTTPS with a Personal Access Token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a token with `repo` permissions
3. Use it as password when prompted

## 📋 Daily Workflow

### From Your Laptop:
```bash
cd /Users/joshuavaz/Documents/project1/riya-project-full
git add .
git commit -m "Your message"
git push origin main
```

### In Replit:
```bash
bash replit-git-sync.sh pull
```

### After Editing in Replit:
```bash
bash replit-git-sync.sh push
```

## 🎯 Pro Tips

1. **Always pull before editing** to avoid conflicts
2. **Commit frequently** with clear messages
3. **Use `sync`** when unsure - it pulls first, then pushes
4. **Check status** with `git status` if something goes wrong

## 🔐 GitHub Authentication

If you need to authenticate:

1. **Personal Access Token (Recommended)**
   - GitHub → Settings → Developer settings → Personal access tokens
   - Generate token with `repo` scope
   - Use token as password when pushing

2. **SSH Keys (Advanced)**
   - Generate SSH key in Replit
   - Add to GitHub account
   - Change remote to SSH: `git remote set-url origin git@github.com:teamnuvoro/project1.git`

## 📝 Script Features

The `replit-git-sync.sh` script handles:
- ✅ Automatic git initialization
- ✅ Remote setup
- ✅ Lock file cleanup
- ✅ Stash management
- ✅ Merge conflict detection
- ✅ Error handling
- ✅ User-friendly messages

## 🆘 Need Help?

Run the script without arguments to see usage:
```bash
bash replit-git-sync.sh
```


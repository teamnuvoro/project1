# Vercel Deployment Guide

Deploy the Riya AI Companion frontend to Vercel with Supabase Edge Functions backend.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────┐         ┌─────────────────────────┐  │
│   │     Vercel      │         │       Supabase          │  │
│   │   (Frontend)    │ ──────> │    Edge Functions       │  │
│   │   React/Vite    │         │   (chat-v2, user-       │  │
│   │                 │         │    summary)             │  │
│   └─────────────────┘         └───────────┬─────────────┘  │
│                                           │                 │
│                                           v                 │
│                               ┌─────────────────────────┐  │
│                               │   Supabase PostgreSQL   │  │
│                               │      (Database)         │  │
│                               └─────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Edge Functions deployed** (see `docs/PHASE2_MIGRATION_SUMMARY.md`)
2. **GitHub account** (https://github.com)
3. **Vercel account** (https://vercel.com)
4. **All required API keys**:
   - Supabase URL and Anon Key
   - Groq API Key (if using Express fallback)

---

## Phase 1: Prepare for Deployment

### 1.1 Test the Build Locally

```bash
# Build the production bundle
npm run build
```

**Expected Output:**
```
vite v5.x.x building for production...
✓ 1234 modules transformed.
dist/index.html                  0.50 kB │ gzip:  0.32 kB
dist/assets/index-abc123.css    45.67 kB │ gzip: 10.23 kB
dist/assets/index-xyz789.js    456.78 kB │ gzip: 123.45 kB
✓ built in 12.34s
```

### 1.2 What Gets Generated

```
dist/
├── index.html           # Main HTML file
├── assets/
│   ├── index-*.css      # Bundled CSS
│   ├── index-*.js       # Bundled JavaScript
│   └── *.svg, *.png     # Static assets
└── favicon.ico
```

### 1.3 Test Build Locally (Optional)

```bash
# Preview the production build
npm run preview

# Opens at http://localhost:4173
```

---

## Phase 2: Create GitHub Repository

### 2.1 Initialize Git (if not already)

```bash
git init
```

### 2.2 Create/Update .gitignore

Ensure your `.gitignore` includes:

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment files (NEVER commit these)
.env
.env.local
.env.production
.env.*.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Replit-specific (not needed for external deploy)
.replit
replit.nix
.cache/
```

### 2.3 First Commit

```bash
# Stage all files
git add .

# Commit
git commit -m "Initial commit: Riya AI Companion"
```

### 2.4 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `riya-ai-companion`
3. Make it **Private** (recommended for proprietary code)
4. Do NOT initialize with README (you already have files)
5. Click "Create repository"

### 2.5 Push to GitHub

```bash
# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/riya-ai-companion.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## Phase 3: Deploy to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com
2. Click "Sign Up"
3. Sign up with GitHub (recommended for easy repo access)

### 3.2 Import GitHub Repository

1. From Vercel dashboard, click **"Add New Project"**
2. Click **"Import Git Repository"**
3. Select your GitHub account
4. Find and select `riya-ai-companion`
5. Click **"Import"**

### 3.3 Configure Build Settings

Vercel auto-detects Vite projects, but verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 20.x |

### 3.4 Set Environment Variables

In Vercel project settings, add these environment variables:

**Required Variables:**

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase anonymous key |
| `VITE_USE_EDGE_FUNCTIONS` | `true` | Enable Edge Functions |
| `VITE_API_URL` | `https://your-vercel-domain.vercel.app` | Your Vercel URL |

**Optional Variables (if using Express fallback):**

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_CASHFREE_MODE` | `production` | Payment gateway mode |

### 3.5 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Vercel provides a preview URL like: `https://riya-ai-companion-abc123.vercel.app`

### 3.6 Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Click "Add Domain"
3. Enter your domain: `chat.yourdomain.com`
4. Follow DNS configuration instructions:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or use Vercel's nameservers

---

## Phase 4: Verify Deployment

### 4.1 Basic Checks

| Check | How to Verify |
|-------|---------------|
| Site loads | Visit your Vercel URL |
| No console errors | Open DevTools > Console |
| Styling correct | Check pink/purple gradient header |
| Navigation works | Click through sidebar items |

### 4.2 Test Chat Functionality

1. Navigate to Chat page
2. Open DevTools > Network tab
3. Send a test message: "Hi Riya"
4. Verify:
   - Request goes to Supabase Edge Function URL
   - Response status: 200
   - AI response streams correctly

### 4.3 Test All Features

| Feature | Test |
|---------|------|
| Chat | Send message, receive AI response |
| Streaming | Watch message appear word-by-word |
| Paywall | After 20 messages, paywall should appear |
| Summary | Navigate to Summary page, check insights |
| Profile | Check My Profile page loads |

### 4.4 Monitor for Errors

**Vercel Logs:**
1. Go to Vercel Dashboard > Your Project
2. Click "Logs" or "Functions"
3. Check for errors

**Supabase Logs:**
1. Go to Supabase Dashboard
2. Navigate to Edge Functions > Logs
3. Check for function errors

---

## Phase 5: After Deployment

### 5.1 Making Changes

1. Edit code locally
2. Test locally with `npm run dev`
3. Build and test: `npm run build && npm run preview`

### 5.2 Push Updates

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature X"

# Push to GitHub
git push origin main
```

**Vercel automatically deploys on every push to main!**

### 5.3 Preview Deployments

- Every push to a branch creates a preview deployment
- Use for testing before merging to main
- Preview URLs look like: `https://riya-ai-companion-git-feature-branch-xyz.vercel.app`

### 5.4 Rollback if Needed

1. Go to Vercel Dashboard > Deployments
2. Find the previous working deployment
3. Click "..." menu > "Promote to Production"

---

## Environment Configuration Summary

### Frontend (Vercel) Environment Variables

```env
# Required for production
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_USE_EDGE_FUNCTIONS=true
VITE_API_URL=https://your-app.vercel.app
```

### Backend (Supabase Edge Functions) Secrets

Set in Supabase Dashboard > Edge Functions > Secrets:

```
GROQ_API_KEY=gsk_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Troubleshooting

### Build Fails

**Error:** `Cannot find module 'xyz'`
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

**Error:** `TypeScript errors`
```bash
# Check for type errors
npx tsc --noEmit
```

### Site Loads but API Fails

1. Check environment variables are set in Vercel
2. Verify `VITE_USE_EDGE_FUNCTIONS=true`
3. Check Supabase Edge Functions are deployed
4. Check Supabase Dashboard > Edge Functions > Logs

### CORS Errors

Edge Functions should have CORS headers. If not:
1. Check Edge Function includes proper CORS headers
2. Verify `Access-Control-Allow-Origin` includes your Vercel domain

### Chat Not Working

1. Open DevTools > Network
2. Look for failed requests
3. Check if requests go to correct Supabase URL
4. Verify Supabase anon key is correct

---

## Quick Reference Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `git push origin main` | Deploy to production |

---

## No Replit Needed

After deploying to Vercel:

1. **Code lives in GitHub** - Edit anywhere, push to deploy
2. **Frontend on Vercel** - Automatic deployments, CDN, custom domains
3. **Backend on Supabase** - Edge Functions + PostgreSQL database
4. **Complete independence** - No Replit required for production

Your application is now fully standalone and production-ready!

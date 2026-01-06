# 🚀 Complete Deployment Guide

This guide will help you deploy your Riya AI Companion application to production.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Supabase Account** - For database (already configured)
3. **API Keys** - All required API keys (Groq, Sarvam, etc.)

## 🎯 Quick Deploy Options

### Option 1: Render (Recommended for Full-Stack Apps) ⭐

**Best for:** Full-stack Node.js apps with backend API

1. **Sign up at [Render.com](https://render.com)**

2. **Create a New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

3. **Configure Build Settings:**
   ```
   Build Command: npm install && npm run build:all
   Start Command: npm run start:server
   ```

4. **Set Environment Variables:**
   Go to Environment tab and add:
   ```
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GROQ_API_KEY=your-groq-key
   SARVAM_API_KEY=your-sarvam-key
   VITE_API_URL=https://your-app-name.onrender.com
   # Add all other required env vars
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for build to complete (~5-10 minutes)
   - Your app will be live at `https://your-app-name.onrender.com`

**Note:** Free tier spins down after 15 minutes of inactivity. Upgrade to paid for always-on.

---

### Option 2: Railway ⭐

**Best for:** Easy deployment with automatic HTTPS

1. **Sign up at [Railway.app](https://railway.app)**

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure:**
   - Railway auto-detects the `railway.json` config
   - Or manually set:
     - **Build Command:** `npm install && npm run build:all`
     - **Start Command:** `npm run start:server`

4. **Set Environment Variables:**
   - Go to Variables tab
   - Add all required environment variables (same as Render)

5. **Deploy:**
   - Railway automatically deploys on push
   - Get your live URL from the service dashboard

**Pricing:** $5/month for hobby plan (always-on)

---

### Option 3: Fly.io

**Best for:** Global edge deployment

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Create App:**
   ```bash
   fly launch
   ```
   - Follow prompts
   - Select region
   - Don't deploy yet

4. **Set Secrets:**
   ```bash
   fly secrets set NODE_ENV=production
   fly secrets set SUPABASE_URL=your-url
   # ... add all other secrets
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

---

### Option 4: Vercel (Frontend + Serverless Functions)

**Best for:** Frontend-heavy apps with API routes

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all required variables

**Note:** Vercel has limitations for long-running processes. Use Render/Railway for WebSocket/streaming features.

---

## 🔧 Required Environment Variables

Copy this list and fill in your values:

```bash
# Core
NODE_ENV=production
PORT=10000

# Supabase (REQUIRED)
SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Base URL (set to your deployment URL)
VITE_API_URL=https://your-app-name.onrender.com

# AI Services
GROQ_API_KEY=your-groq-key
SARVAM_API_KEY=your-sarvam-key
GEMINI_API_KEY=your-gemini-key

# Voice Services
VAPI_PRIVATE_KEY=your-vapi-key
VAPI_PUBLIC_KEY=your-vapi-public-key

# Payment (if using)
CASHFREE_APP_ID=your-cashfree-id
CASHFREE_SECRET_KEY=your-cashfree-secret
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Twilio (if using)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Analytics
VITE_AMPLITUDE_API_KEY=your-amplitude-key

# Email (if using)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📝 Step-by-Step: Render Deployment

### 1. Prepare Your Code

```bash
# Make sure everything is committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repos

### 3. Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Select your repository
3. Fill in:
   - **Name:** `riya-ai-companion` (or your choice)
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your main branch)
   - **Root Directory:** Leave empty (root)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build:all`
   - **Start Command:** `npm run start:server`

### 4. Add Environment Variables

Click **"Environment"** tab and add all variables from the list above.

**Important:** 
- Set `VITE_API_URL` to your Render URL (you'll get it after first deploy)
- All `VITE_*` variables are needed for frontend build

### 5. Deploy

1. Click **"Create Web Service"**
2. Watch the build logs
3. Wait for "Your service is live" message
4. Copy your URL (e.g., `https://riya-ai-companion.onrender.com`)

### 6. Update VITE_API_URL

1. Go back to Environment Variables
2. Update `VITE_API_URL` to your actual Render URL
3. Click **"Save Changes"** (this will trigger a redeploy)

### 7. Verify Deployment

Visit your URL and check:
- ✅ Homepage loads
- ✅ `/api/health` returns `{"status":"ok"}`
- ✅ Chat page works
- ✅ Can send messages

## 🐳 Docker Deployment (Advanced)

If you prefer Docker:

```bash
# Build image
docker build -t riya-ai-companion .

# Run container
docker run -d \
  -p 10000:10000 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=your-url \
  # ... add all env vars
  --name riya-app \
  riya-ai-companion
```

Deploy to:
- **DigitalOcean App Platform**
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**

## 🔍 Troubleshooting

### Build Fails

**Error:** `Cannot find module`
- **Fix:** Make sure `package.json` has all dependencies
- **Fix:** Check that `npm install` runs before build

**Error:** `Build command failed`
- **Fix:** Check build logs for specific error
- **Fix:** Test build locally: `npm run build:all`

### App Crashes on Start

**Error:** `Port already in use`
- **Fix:** Make sure `PORT` env var is set correctly
- **Fix:** Render uses `PORT` automatically, don't hardcode

**Error:** `SUPABASE_SERVICE_ROLE_KEY is required`
- **Fix:** Add all Supabase env vars to deployment platform

### Frontend Can't Connect to Backend

**Error:** `Failed to fetch`
- **Fix:** Set `VITE_API_URL` to your deployment URL
- **Fix:** Check CORS settings in `server/index.ts`
- **Fix:** Make sure backend is actually running

### Messages Don't Persist

**Error:** Messages disappear on refresh
- **Fix:** Check Supabase connection
- **Fix:** Verify database tables exist
- **Fix:** Check browser console for errors

## ✅ Post-Deployment Checklist

- [ ] App is accessible at deployment URL
- [ ] `/api/health` endpoint works
- [ ] Can sign up/login
- [ ] Can send messages
- [ ] Messages persist after refresh
- [ ] Persona selection works
- [ ] Voice calls work (if enabled)
- [ ] Payments work (if enabled)
- [ ] All environment variables set
- [ ] HTTPS is enabled (automatic on most platforms)
- [ ] Custom domain configured (optional)

## 🌐 Custom Domain Setup

### Render

1. Go to your service → **Settings** → **Custom Domains**
2. Add your domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### Railway

1. Go to your service → **Settings** → **Networking**
2. Add custom domain
3. Follow DNS setup instructions

## 📊 Monitoring

After deployment, monitor:
- **Logs:** Check platform logs for errors
- **Uptime:** Use UptimeRobot or similar
- **Performance:** Check response times
- **Errors:** Set up error tracking (Sentry, etc.)

## 🔄 Continuous Deployment

Most platforms auto-deploy on `git push`:
- **Render:** Auto-deploys from main branch
- **Railway:** Auto-deploys on push
- **Vercel:** Auto-deploys on push

To disable auto-deploy:
- Go to service settings
- Toggle "Auto-Deploy" off

## 🆘 Need Help?

1. Check deployment platform logs
2. Test build locally: `npm run build:all`
3. Verify all env vars are set
4. Check Supabase connection
5. Review error messages in browser console

## 🎉 Success!

Once deployed, your app will be live and accessible worldwide!

**Next Steps:**
- Set up monitoring
- Configure custom domain
- Enable analytics
- Set up backups
- Scale as needed


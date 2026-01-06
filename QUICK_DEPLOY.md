# ⚡ Quick Deployment Guide

## 🚀 Fastest Way: Render (Recommended)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy on Render

1. Go to https://render.com and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `riya-ai-companion`
   - **Build Command:** `npm install && npm run build:all`
   - **Start Command:** `npm run start:server`
   - **Environment:** `Node`

### Step 3: Add Environment Variables

Click **"Environment"** tab and add:

```bash
NODE_ENV=production
PORT=10000
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-key
GROQ_API_KEY=your-key
SARVAM_API_KEY=your-key
VITE_API_URL=https://your-app-name.onrender.com
```

**Important:** After first deploy, update `VITE_API_URL` with your actual Render URL.

### Step 4: Deploy!

Click **"Create Web Service"** and wait ~5-10 minutes.

Your app will be live at: `https://your-app-name.onrender.com`

---

## 🎯 Alternative: Railway (Even Easier)

1. Go to https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your repo
4. Add environment variables (same as above)
5. Done! Auto-deploys on every push.

---

## 📋 Required Environment Variables

Get these from your `.env` file or create them:

**Supabase (Required):**
- `SUPABASE_URL` - From Supabase dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard → Settings → API
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY` - From Supabase dashboard → Settings → API

**API Keys:**
- `GROQ_API_KEY` - From https://console.groq.com
- `SARVAM_API_KEY` - From your Sarvam account
- `GEMINI_API_KEY` - From Google AI Studio (if using)

**App URL:**
- `VITE_API_URL` - Set to your deployment URL (e.g., `https://your-app.onrender.com`)

**Optional (if using features):**
- `VAPI_PRIVATE_KEY` - For voice calls
- `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` - For payments
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - For SMS
- `VITE_AMPLITUDE_API_KEY` - For analytics

---

## ✅ Verify Deployment

1. Visit your deployment URL
2. Check `/api/health` - should return `{"status":"ok"}`
3. Try signing up/logging in
4. Send a test message
5. Refresh page - messages should persist

---

## 🐛 Troubleshooting

**Build fails?**
- Check build logs for errors
- Test locally: `npm run build:all`

**App crashes?**
- Check all environment variables are set
- Verify Supabase keys are correct
- Check logs for specific errors

**Frontend can't connect?**
- Set `VITE_API_URL` to your deployment URL
- Make sure backend is running
- Check CORS settings

---

## 📚 Full Guide

See `DEPLOYMENT_GUIDE.md` for detailed instructions for all platforms.


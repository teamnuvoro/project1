# Render Deployment - Quick Start Guide

## ✅ Code Pushed to GitHub

Your code is now on GitHub and ready for deployment!

---

## Step 1: Create Render Web Service

1. Go to: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository: `lovable-builders`

---

## Step 2: Configure Service

### Basic Settings:
- **Name:** `riya-ai-companion` (or your preferred name)
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** Leave empty (root)

### Build & Deploy:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Environment:** `Node`

---

## Step 3: Add Environment Variables

**CRITICAL:** Add these in Render Dashboard → Environment:

### Dodo Payments (Required):
```env
DODO_PAYMENTS_API_KEY=mZkpUls52vn8MgzT.SuRBQ2lv4-95CiSAZzLfe8-cFnaj9ZXeosytCzYVCTZ0bleg
DODO_ENV=live_mode
DODO_WEBHOOK_SECRET=whsec_bBYSPrL9eB3UhzNBa/S4Ya2LMUE5T8tW
DODO_PRODUCT_ID_MONTHLY=pdt_0NWqJe1actbDDuGrTMWMb
```

### URLs (Update with your Render URL):
```env
BASE_URL=https://your-app-name.onrender.com
PAYMENT_RETURN_URL=https://your-app-name.onrender.com/payment/return
DODO_WEBHOOK_URL=https://your-app-name.onrender.com/api/payment/webhook
```

**⚠️ IMPORTANT:** Replace `your-app-name.onrender.com` with your actual Render URL after deployment!

### Other Required:
```env
NODE_ENV=production
PORT=10000
```

### Supabase (if using):
```env
SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes)
3. Note your Render URL (e.g., `riya-ai-companion.onrender.com`)

---

## Step 5: Update Webhook URL

After deployment:

1. **Update Render Environment Variables:**
   - Go to Render Dashboard → Your Service → Environment
   - Update `BASE_URL` with your Render URL
   - Update `PAYMENT_RETURN_URL` with your Render URL
   - Update `DODO_WEBHOOK_URL` with your Render URL
   - Save changes (will trigger redeploy)

2. **Update Dodo Dashboard:**
   - Go to Dodo Dashboard → Webhooks
   - Edit your webhook endpoint
   - Update URL to: `https://your-app-name.onrender.com/api/payment/webhook`
   - Save

---

## Step 6: Run Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Run the migration from: `supabase/migrations/20250122_add_dodo_order_id.sql`

This adds:
- `dodo_order_id` column to subscriptions table
- Makes `cashfree_order_id` nullable

---

## Step 7: Verify Deployment

### Check Logs:
1. Go to Render Dashboard → Your Service → Logs
2. Look for:
   ```
   🚀 Server running on port 10000
   [Dodo] Environment variables check: ...
   ```

### Test Payment:
1. Visit your deployed app
2. Try creating a payment
3. Check logs for any errors
4. Verify webhook receives events

---

## Troubleshooting

### Build Fails:
- Check Node version (should be 20.x or latest LTS)
- Check `package.json` has all dependencies
- Check build logs for specific errors

### Webhook Not Working:
- Verify `DODO_WEBHOOK_URL` is correct in Render
- Verify webhook URL is correct in Dodo Dashboard
- Check Render logs for webhook events
- Ensure Render service is publicly accessible

### Payment Creation Fails:
- Check all Dodo environment variables are set
- Verify `DODO_PRODUCT_ID_MONTHLY` is correct
- Check Render logs for specific errors

---

## Environment Variables Checklist

Before deploying, ensure ALL these are set:

- [ ] `DODO_PAYMENTS_API_KEY`
- [ ] `DODO_ENV=live_mode`
- [ ] `DODO_WEBHOOK_SECRET`
- [ ] `DODO_PRODUCT_ID_MONTHLY`
- [ ] `DODO_WEBHOOK_URL` (with your Render URL)
- [ ] `BASE_URL` (with your Render URL)
- [ ] `PAYMENT_RETURN_URL` (with your Render URL)
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `SUPABASE_URL` (if using)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (if using)

---

## Post-Deployment Checklist

- [ ] Service is running (check Render dashboard)
- [ ] Webhook URL updated in Dodo Dashboard
- [ ] Database migration run in Supabase
- [ ] Test payment flow end-to-end
- [ ] Verify premium unlock works
- [ ] Monitor first few payments

---

**Ready to deploy!** Follow the steps above and your app will be live on Render. 🚀

# Fix: 500 Error - "Server configuration error. Please contact support."

## ❌ Error Message
```
Payment error: Error: Server configuration error. Please contact support.
Status: 500
```

## 🔍 Root Cause

The error occurs because **`BASE_URL` is missing or invalid** in Render environment variables.

The payment system requires:
1. `BASE_URL` must be set
2. `BASE_URL` must start with `https://`
3. `BASE_URL` cannot contain `ngrok` (in production)

---

## ✅ Solution: Add BASE_URL to Render

### Step 1: Find Your Render URL

1. Go to Render Dashboard: https://dashboard.render.com
2. Click on your service
3. Look at the top - you'll see your URL like:
   - `riya-ai-companion.onrender.com`
   - Or `your-app-name.onrender.com`

### Step 2: Add BASE_URL Environment Variable

1. In Render Dashboard → Your Service → **"Environment"** tab
2. Scroll to **"Environment Variables"**
3. Click **"Add Environment Variable"**
4. Add:

```
Key: BASE_URL
Value: https://your-app-name.onrender.com
```

**⚠️ IMPORTANT:** 
- Replace `your-app-name.onrender.com` with YOUR actual Render URL
- Must start with `https://`
- No trailing slash

### Step 3: Also Add These Related URLs

While you're there, also add:

```
Key: PAYMENT_RETURN_URL
Value: https://your-app-name.onrender.com/payment/return
```

```
Key: DODO_WEBHOOK_URL
Value: https://your-app-name.onrender.com/api/payment/webhook
```

### Step 4: Save and Redeploy

1. Click **"Save Changes"**
2. Render will automatically redeploy
3. Wait 5-10 minutes

---

## 📋 Complete Environment Variables Checklist

Make sure ALL these are set in Render:

### Required for Payments:
- [ ] `DODO_PAYMENTS_API_KEY` = `mZkpUls52vn8MgzT.SuRBQ2lv4-95CiSAZzLfe8-cFnaj9ZXeosytCzYVCTZ0bleg`
- [ ] `DODO_ENV` = `live_mode`
- [ ] `DODO_WEBHOOK_SECRET` = `whsec_bBYSPrL9eB3UhzNBa/S4Ya2LMUE5T8tW`
- [ ] `DODO_PRODUCT_ID_MONTHLY` = `pdt_0NWqJe1actbDDuGrTMWMb`
- [ ] `BASE_URL` = `https://your-app-name.onrender.com` ⚠️ **THIS IS THE ONE MISSING!**
- [ ] `PAYMENT_RETURN_URL` = `https://your-app-name.onrender.com/payment/return`
- [ ] `DODO_WEBHOOK_URL` = `https://your-app-name.onrender.com/api/payment/webhook`

### System:
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`

### Supabase (if using):
- [ ] `SUPABASE_URL` = `https://xgraxcgavqeyqfwimbwt.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (your key)

---

## 🎯 Quick Fix

**The fastest fix:**
1. Go to Render → Your Service → Environment
2. Add: `BASE_URL` = `https://your-actual-render-url.onrender.com`
3. Save
4. Wait for redeploy

---

## ✅ After Adding BASE_URL

The 500 error will be fixed and payments will work!

---

**See `RENDER_ENV_SETUP.md` for complete environment variables guide.**

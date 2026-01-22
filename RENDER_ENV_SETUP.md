# Render Environment Variables Setup - URGENT

## ❌ Current Error
```
Payment error: Dodo Payments API key not found in environment variables
```

This means the environment variables are **NOT set in Render Dashboard**.

---

## ✅ Solution: Add Environment Variables to Render

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com
2. Click on your service: `riya-ai-companion` (or your service name)

### Step 2: Navigate to Environment
1. Click **"Environment"** tab (left sidebar)
2. Scroll down to **"Environment Variables"** section

### Step 3: Add These Variables

Click **"Add Environment Variable"** for each one:

#### **Dodo Payments (REQUIRED):**
```
Key: DODO_PAYMENTS_API_KEY
Value: mZkpUls52vn8MgzT.SuRBQ2lv4-95CiSAZzLfe8-cFnaj9ZXeosytCzYVCTZ0bleg
```

```
Key: DODO_ENV
Value: live_mode
```

```
Key: DODO_WEBHOOK_SECRET
Value: whsec_bBYSPrL9eB3UhzNBa/S4Ya2LMUE5T8tW
```

```
Key: DODO_PRODUCT_ID_MONTHLY
Value: pdt_0NWqJe1actbDDuGrTMWMb
```

#### **URLs (Replace with YOUR Render URL):**
First, find your Render URL (e.g., `riya-ai-companion.onrender.com`)

```
Key: BASE_URL
Value: https://your-app-name.onrender.com
```

```
Key: PAYMENT_RETURN_URL
Value: https://your-app-name.onrender.com/payment/return
```

```
Key: DODO_WEBHOOK_URL
Value: https://your-app-name.onrender.com/api/payment/webhook
```

#### **System:**
```
Key: NODE_ENV
Value: production
```

```
Key: PORT
Value: 10000
```

#### **Supabase (if using):**
```
Key: SUPABASE_URL
Value: https://xgraxcgavqeyqfwimbwt.supabase.co
```

```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: (your service role key)
```

---

## Step 4: Save and Redeploy

1. After adding all variables, click **"Save Changes"**
2. Render will automatically trigger a new deployment
3. Wait 5-10 minutes for deployment to complete

---

## Step 5: Verify

After deployment, check logs:
1. Go to **"Logs"** tab
2. Look for: `🚀 Server running on port 10000`
3. No errors about missing API keys

---

## ⚠️ Important Notes

1. **Replace `your-app-name.onrender.com`** with your actual Render URL
2. **No spaces** around the `=` sign in environment variables
3. **Case-sensitive** - variable names must match exactly
4. **Save after each variable** or add all then save

---

## Quick Checklist

- [ ] `DODO_PAYMENTS_API_KEY` added
- [ ] `DODO_ENV=live_mode` added
- [ ] `DODO_WEBHOOK_SECRET` added
- [ ] `DODO_PRODUCT_ID_MONTHLY` added
- [ ] `BASE_URL` added (with your Render URL)
- [ ] `PAYMENT_RETURN_URL` added (with your Render URL)
- [ ] `DODO_WEBHOOK_URL` added (with your Render URL)
- [ ] `NODE_ENV=production` added
- [ ] `PORT=10000` added
- [ ] `SUPABASE_URL` added (if using)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added (if using)
- [ ] Saved changes
- [ ] Deployment triggered

---

**After adding these, the payment error will be fixed!** 🚀

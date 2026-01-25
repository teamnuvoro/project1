# Fix: Supabase Test Phone "otp_expired" Error

## ❌ Error from Supabase Logs

```
"error": "token has expired or is invalid"
"error_code": "otp_expired"
"status": 403
"path": "/verify"
```

## 🔍 Root Cause

**Supabase test phone numbers require EXACT format matching.**

If you configure in Supabase Dashboard:
```
1234567890=123456
```

You MUST send/verify with:
- ✅ `1234567890` (10 digits, no country code)
- ❌ `+911234567890` (with country code - WON'T WORK)
- ❌ `911234567890` (with 91 prefix - WON'T WORK)

---

## ✅ Fix Applied

### Changes:

1. **Raw Format First for Test Phones**
   - Test phones now use raw 10-digit format: `1234567890`
   - No country code prefix for test phones
   - Matches exactly what's in Supabase Dashboard

2. **Better Format Matching**
   - Tries raw format FIRST (most likely to match)
   - Then tries other formats as fallback
   - Stores multiple formats for verification

3. **No Expiration for Test Phones**
   - Test phone OTPs don't expire
   - Can use `123456` anytime

---

## 📋 Supabase Dashboard Setup (CRITICAL)

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard
2. Project: `xgraxcgavqeyqfwimbwt`
3. Go to: **Authentication** → **Providers** → **Phone**

### Step 2: Add Test Phone (EXACT FORMAT)
In **"Test Phone Numbers and OTPs"** field, add:
```
1234567890=123456
```

**⚠️ IMPORTANT:**
- Use **10 digits** (no `+`, no `91` prefix)
- Format: `phone=otp`
- No spaces

### Step 3: Save
Click **"Save"** button

---

## 🚀 How It Works Now

### When Sending OTP:
1. User enters: `1234567890`
2. Code detects it's a test phone
3. Sends to Supabase as: `1234567890` (raw 10 digits)
4. Supabase matches with test config: `1234567890=123456`
5. ✅ OTP request created

### When Verifying OTP:
1. User enters OTP: `123456`
2. Code tries phone formats in order:
   - `1234567890` (raw - matches Supabase config) ✅
   - Other formats as fallback
3. Supabase verifies: `1234567890` + `123456`
4. ✅ Verification succeeds

---

## 🔧 Code Changes

### Before (WRONG):
```typescript
// Normalized to +911234567890
const phoneToSend = normalizePhoneNumber('1234567890');
// Supabase doesn't match this with test config!
```

### After (CORRECT):
```typescript
// For test phones, use raw 10-digit format
const phoneToSend = '1234567890';
// Supabase matches this with test config! ✅
```

---

## ✅ Testing

1. **Add test phone in Supabase Dashboard:**
   ```
   1234567890=123456
   ```

2. **Login with:**
   - Phone: `1234567890`
   - OTP: `123456`

3. **Should work immediately!** ✅

---

## 🐛 If Still Not Working

### Check These:

1. **Supabase Dashboard Configuration**
   - Is `1234567890=123456` saved?
   - Check: Authentication → Providers → Phone → Test Phone Numbers

2. **Phone Format**
   - Are you entering exactly `1234567890`?
   - No spaces, no `+`, no `91` prefix

3. **OTP Format**
   - Are you entering exactly `123456`?
   - 6 digits, no spaces

4. **Browser Console**
   - Check for: `[Supabase Auth] 🧪 Test phone detected`
   - Check for: `[Supabase Auth] Using phone format for send: 1234567890`

4. **Supabase Logs**
   - Check: Dashboard → Logs → Auth Logs
   - Look for the phone format being sent

---

## 📝 Summary

**The fix ensures test phones use the EXACT format that Supabase expects:**
- ✅ `1234567890` (10 digits, no prefix)
- ❌ `+911234567890` (won't match test config)

**Code is deployed! Redeploy on Render to apply fix.** 🚀

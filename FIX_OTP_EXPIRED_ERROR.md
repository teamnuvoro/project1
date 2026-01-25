# Fix: "Token has expired or is invalid" OTP Error

## ❌ Error Message
```
[Supabase Auth] Verify OTP error: AuthApiError: Token has expired or is invalid
Status: 403
```

## 🔍 Why This Happens

### Root Causes:

1. **OTP Expired** (Most Common)
   - Supabase OTPs expire after **5 minutes** (300 seconds) by default
   - If user takes too long to enter the code, it expires
   - Default expiry is set in Supabase Dashboard → Auth → Phone → SMS OTP Expiry

2. **Phone Number Format Mismatch**
   - Phone number used to **send** OTP doesn't match the one used to **verify**
   - Example: Sent to `+919876543210` but verifying with `9876543210`
   - Normalization differences between send and verify

3. **OTP Already Used**
   - OTP codes can only be used **once**
   - If user tries to verify the same code twice, it fails

4. **Time Delay**
   - User requests OTP, waits too long, then tries to verify
   - OTP expires before verification attempt

---

## ✅ Fix Applied

### Changes Made:

1. **Phone Number Matching**
   - Stores the exact phone number used when sending OTP
   - Uses that stored phone number for verification
   - Tries multiple phone format variants if first attempt fails

2. **Expiration Check**
   - Checks if OTP has expired before attempting verification
   - Shows clear error: "OTP has expired. Please request a new one."

3. **Better Error Messages**
   - Specific messages for expired vs invalid vs not found
   - Helps user understand what went wrong

4. **Multiple Format Attempts**
   - Tries: `+919876543210`, `919876543210`, `9876543210`
   - Handles normalization mismatches automatically

---

## 🛠️ How It Works Now

### When Sending OTP:
1. Phone number is normalized: `9876543210` → `+919876543210`
2. Stored in localStorage: `last_otp_phone` and `last_otp_time`
3. OTP sent via Supabase

### When Verifying OTP:
1. Checks if OTP expired (5 minutes)
2. Uses stored phone number from send step
3. Tries multiple phone format variants
4. Clears stored data on success

---

## 📋 Supabase Settings to Check

### 1. SMS OTP Expiry
- Go to: Supabase Dashboard → Authentication → Providers → Phone
- **SMS OTP Expiry**: Should be `300` seconds (5 minutes)
- You can increase this if needed (e.g., `600` for 10 minutes)

### 2. SMS OTP Length
- **SMS OTP Length**: Should be `6` digits
- Must match what users are entering

### 3. Test Phone Numbers
- Add test numbers in: Supabase Dashboard → Auth → Phone → Test Phone Numbers
- Format: `9876543210=123456` (phone=otp)
- Useful for testing without sending real SMS

---

## 🚀 User Experience Improvements

### Before:
- Generic error: "Token has expired or is invalid"
- User doesn't know why it failed
- No retry guidance

### After:
- Clear error: "OTP code has expired. Please request a new one."
- Automatic phone format matching
- Better guidance on what to do next

---

## 🔧 If Error Still Occurs

### Check These:

1. **Supabase Dashboard → Logs → Auth Logs**
   - See if OTP was actually sent
   - Check for any errors in sending

2. **Phone Number Format**
   - Ensure phone is normalized consistently
   - Check browser console for phone variants being tried

3. **Time Between Send and Verify**
   - Should be less than 5 minutes
   - Check `last_otp_time` in localStorage

4. **Supabase SMS Provider**
   - Verify Vonage/Twilio is configured
   - Check credentials are valid

---

## ✅ Testing

1. Request OTP
2. Wait 6 minutes (past expiry)
3. Try to verify → Should get "expired" error
4. Request new OTP
5. Verify immediately → Should work

---

**The fix is deployed! Redeploy on Render to get the updated code.** 🚀

# Test Phone Number Setup Guide

## ✅ Test Phone Number: `1234567890` with OTP `123456`

This guide explains how to use the test phone number for free access to the app.

---

## 📋 Supabase Dashboard Setup

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard
2. Select your project: `xgraxcgavqeyqfwimbwt`
3. Go to: **Authentication** → **Providers** → **Phone**

### Step 2: Add Test Phone Number
1. Scroll to **"Test Phone Numbers and OTPs"** section
2. In the input field, add:
   ```
   1234567890=123456
   ```
3. Click **"Save"**

### Step 3: Verify Settings
- **SMS OTP Expiry**: `300` seconds (5 minutes) - OK for test
- **SMS OTP Length**: `6` digits - Must match OTP
- **Test OTPs Valid Until**: Set to a future date (e.g., 2026-12-31)

---

## 🚀 How to Use

### For Login:
1. Enter phone number: `1234567890`
2. Click "Get Verification Code"
3. Enter OTP: `123456`
4. Click "Verify"
5. ✅ You're logged in!

### For Signup:
1. Enter name, email, and phone: `1234567890`
2. Click "Get Verification Code"
3. Enter OTP: `123456`
4. Click "Verify & Create Account"
5. ✅ Account created and logged in!

---

## 🔧 Supported Phone Formats

The test phone number works with these formats:
- `1234567890` (10 digits)
- `+911234567890` (with country code)
- `911234567890` (with 91 prefix)

All formats use the same OTP: `123456`

---

## ⚠️ Important Notes

1. **Supabase Dashboard Configuration Required**
   - You MUST add `1234567890=123456` in Supabase Dashboard
   - Without this, the test phone won't work

2. **OTP Never Expires for Test Numbers**
   - Test phone OTPs don't expire (unlike real OTPs)
   - You can use `123456` anytime

3. **Multiple Formats Tried Automatically**
   - The code tries all phone formats automatically
   - No need to worry about format matching

4. **Works in Production**
   - Test phones work in both dev and production
   - No SMS is sent for test numbers

---

## 🐛 Troubleshooting

### "Token has expired or is invalid"
- **Check**: Is `1234567890=123456` set in Supabase Dashboard?
- **Check**: Are you using OTP `123456` (exactly 6 digits)?
- **Check**: Try phone format `1234567890` (no spaces, no +)

### "No OTP request found"
- **Fix**: Click "Get Verification Code" first
- **Fix**: Make sure Supabase test phone is configured

### Still not working?
1. Check Supabase Dashboard → Logs → Auth Logs
2. Check browser console for phone variants being tried
3. Verify test phone is saved in Supabase Dashboard

---

## ✅ Code Changes Applied

The code now:
- ✅ Detects test phone numbers automatically
- ✅ Tries multiple phone formats
- ✅ Handles test phone OTPs without expiration
- ✅ Works with Supabase test phone feature

**Deploy to Render to activate!** 🚀

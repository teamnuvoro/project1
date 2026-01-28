# Fix: Supabase `/auth/v1/otp` 500 Error

When "Send verification code" fails with a **500** from `*.supabase.co/auth/v1/otp`, Supabase Auth is misconfigured. Fix it in the dashboard (no code change).

---

## Step 1: Open your project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open project **xgraxcgavqeyqfwimbwt** (or the one matching your `VITE_SUPABASE_URL`)

---

## Step 2: Enable Email provider

1. In the left sidebar: **Authentication** → **Providers**
2. Find **Email**
3. Turn **Enable Email provider** **ON**
4. Click **Save**

---

## Step 3: Fix “Confirm email” / SMTP (this usually causes 500)

Supabase must be able to **send** the OTP email. Two options:

### Option A (recommended for dev): Use built-in emails

1. **Authentication** → **Providers** → **Email**
2. Find **“Confirm email”** (or “Enable email confirmations”)
3. Turn it **OFF**
4. **Save**

Supabase will send OTP emails with its own sender (may land in spam). No SMTP needed.

### Option B: Use your own SMTP

1. **Authentication** → **Email Templates**
2. Open **SMTP Settings** (or **Settings** → **Auth** → **SMTP**)
3. Enable **Custom SMTP** and fill in:
   - Host (e.g. `smtp.resend.com`, `smtp.sendgrid.net`)
   - Port (e.g. `587`)
   - Username / Password (from Resend, SendGrid, etc.)
4. **Save**

Keep **Confirm email** ON if you use this.

---

## Step 4: Check Auth logs (if it still 500s)

1. **Authentication** → **Logs**
2. Trigger “Send verification code” again in your app
3. Find the failed request and read the error message

Use that message to fix the exact issue (e.g. missing SMTP, wrong template, rate limit).

---

## Step 5: Rate limits (optional)

If you see “too many requests” or rate-limit errors:

- **Authentication** → **Rate Limits** (or **Settings** → **Auth**)
- Adjust **Email OTP** limits if needed for development

---

## Summary checklist

- [ ] **Authentication** → **Providers** → **Email** → **Enable Email provider** = ON
- [ ] Either **Confirm email** = OFF, or **SMTP** configured (you did this)
- [ ] **Email Templates** → Magic Link body includes **`{{ .Token }}`** so users see the 6-digit code
- [ ] **Save** after any change
- [ ] Try “Send verification code” again

After this, `/auth/v1/otp` should return **200** and the OTP email should be sent.

---

## `net::ERR_BLOCKED_BY_CLIENT` (browser)

This is **not** from Supabase. It means a **browser extension** (ad blocker, privacy, etc.) blocked a request.

- Try in **Incognito/Private** with extensions disabled, or
- **Whitelist** your site and `*.supabase.co` in the blocker so auth and OTP work.

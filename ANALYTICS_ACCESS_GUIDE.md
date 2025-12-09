# 📊 Admin Analytics Dashboard - Access Guide

## How to Access the Analytics Page

### Option 1: Direct URL (Easiest)
Simply navigate to:
```
https://riya-ai.site/admin/analytics
```
or in development:
```
http://localhost:5173/admin/analytics
```

### Option 2: Through Navigation Menu
1. Click the **three-dot menu (⋮)** in the top-right corner of the navbar
2. Scroll down to find **"Admin Analytics"** (only visible if you're an admin)
3. Click it to open the dashboard

## Setup Required (One-Time)

### Step 1: Add `is_admin` Column to Database
Run this SQL in your Supabase SQL Editor:

```sql
-- Add is_admin column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
```

Or use the migration file:
- File: `supabase/migrations/20250110_add_is_admin_column.sql`
- Run it in Supabase SQL Editor

### Step 2: Set Yourself as Admin
Replace `YOUR_USER_ID_HERE` with your actual user ID from the `users` table:

```sql
-- Find your user ID first (check your email or phone)
SELECT id, name, email FROM users WHERE email = 'your-email@example.com';

-- Then set yourself as admin
UPDATE users SET is_admin = TRUE WHERE id = 'YOUR_USER_ID_HERE';
```

**To find your user ID:**
1. Go to Supabase Dashboard → Table Editor → `users` table
2. Find your user row
3. Copy the `id` (UUID)
4. Use it in the UPDATE query above

### Step 3: Refresh Your Session
After setting `is_admin = TRUE`:
1. Log out of the app
2. Log back in
3. The Admin Analytics link should now appear in the dropdown menu

## What You'll See

The analytics dashboard shows:

### 📈 Key Metrics
- **Total Active Users** (Last 7/30 days)
- **Conversion Rate** (Free to Paid percentage)
- **Highest Traffic Page** (most visited route)
- **Paywall Hits** (total times paywall was shown)

### 📊 Charts
- **Top 5 Event Names** - Most common user actions
- **Top 5 Event Places** - Most visited pages/routes

### 📋 Recent Events Table
- Last 50 user events with:
  - Timestamp
  - User ID (anonymized)
  - Event name
  - Event place (page/route)
  - Plain-language explanation

### 📦 Raw Data Summary
- Total events count
- Sessions count
- Subscriptions count
- Payments count

## Troubleshooting

### "Access denied. Admin privileges required."
- Make sure you've set `is_admin = TRUE` in the database
- Log out and log back in to refresh your session
- Check that your user ID is correct in the database

### "User not authenticated"
- Make sure you're logged in
- Check that your session is valid

### Analytics link not showing in menu
- Verify `is_admin = TRUE` in the database
- Refresh the page or log out/in
- Check browser console for errors

## Event Explanations

All technical event names are automatically translated to plain language:
- `chat_sent` → "The user successfully sent a message to Riya"
- `paywall_triggered` → "The user hit their free message limit and saw the upgrade popup"
- `pay_daily_selected` → "The user clicked the ₹19 'Daily Pass' button"
- And many more...

## Date Range

You can switch between:
- **7 days** - Last week's data
- **30 days** - Last month's data

Use the buttons at the top-right of the dashboard.

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Verify your admin status in the database
3. Make sure the backend is running and accessible
4. Check that the `/api/admin/analytics` endpoint is working


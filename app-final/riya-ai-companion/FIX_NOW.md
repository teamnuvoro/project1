# IMMEDIATE FIX FOR PORT & PREVIEW

## Problem Summary
1. **Port 3000 is still occupied** by an old process
2. Old service files causing TypeScript errors (but won't affect runtime)
3. Preview can't connect because of port conflict

## Step 1: Kill Port 3000 Process

Run this command:
```bash
killall -9 node
```

This will force-kill ALL node processes.

## Step 2: Set Environment Variable

Create or update `.env` file in project root:
```
PORT=5000
DISABLE_AUTH=true
USE_IN_MEMORY_STORAGE=true
SESSION_SECRET=dev_secret_123
```

## Step 3: Restart Server

```bash
npm run dev
```

## What Should Happen

✅ Server starts on port 5000  
✅ Preview loads at http://localhost:5000  
✅ TypeScript errors won't affect runtime (those services aren't used)

## About the Cashfree Error

The Cashfree error is **NOT blocking the preview**. It's a separate payment gateway issue that only affects payments, not the basic chat functionality. You can ignore it for now and just test the chat.

To fix Cashfree later, you need to:
1. Sign up at Cashfree (https://www.cashfree.com/)
2. Get test credentials (App ID + Secret Key)
3. Add to `.env`:
   ```
   CASHFREE_APP_ID=your_test_app_id
   CASHFREE_SECRET_KEY=your_test_secret_key
   CASHFREE_ENV=TEST
   ```

But again - **this is NOT required to see the preview working**.

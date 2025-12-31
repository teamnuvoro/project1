# Phind Context - Premium User Getting 402 Payment Required Error

## Project Overview

**Application**: AI Girlfriend Chatbot (Riya) - Full-stack web application
**Tech Stack**: 
- Frontend: React 18, TypeScript, Vite, TanStack Query
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL (Supabase)
- Authentication: Email OTP

**Architecture**:
- Frontend runs on port 3001 (Vite dev server)
- Backend runs on port 3000 (Express API)
- Frontend makes API calls to `http://localhost:3000/api/*`

## Current Problem

**Error**: Premium users are getting `402 Payment Required` errors when trying to send chat messages, even though the frontend correctly identifies them as premium users.

**Symptoms**:
1. Frontend shows `Is Premium: true` in console logs
2. Backend returns `402 Payment Required` when sending messages
3. Messages are not being saved to database
4. Message count stays at 0 on backend, but increments locally

## Error Logs

```
ChatPage.tsx:343 DEBUG: ChatPage Mount
ChatPage.tsx:344 DEBUG: Local Count (Storage): 0
ChatPage.tsx:345 DEBUG: Backend Count (Api): 0
ChatPage.tsx:346 DEBUG: Current Count (Daily): 0 (NOT total conversation length)
ChatPage.tsx:347 DEBUG: Total Messages in Session: 0 (for reference only, NOT used for limits)
ChatPage.tsx:348 DEBUG: Is Premium: true
ChatPage.tsx:78 [ChatPage] Session fetched: d1067768-78c3-416e-ad83-6d3c9bcfc2b1
ChatPage.tsx:235 🔄 User usage fetched: Object
ChatPage.tsx:114 [ChatPage] ✅ Fetched 0 messages for session: d1067768-78c3-416e-ad83-6d3c9bcfc2b1 (cache had 0)

// After trying to send message:
ChatPage.tsx:343 DEBUG: Local Count (Storage): 1
ChatPage.tsx:345 DEBUG: Backend Count (Api): 0
ChatPage.tsx:348 DEBUG: Is Premium: true
:3000/api/chat:1 Failed to load resource: the server responded with a status of 402 (Payment Required)
```

## Frontend Code - Premium Check

**File**: `client/src/pages/ChatPage.tsx`

```typescript
// Line ~320: Premium status check
const isPremium = user?.premium_user === true ? true : (userUsage?.premiumUser === true);

// Line ~172: User usage query
const { data: userUsage, refetch: refetchUsage } = useQuery<UserUsage>({
  queryKey: ["/api/user/usage", user?.id],
  queryFn: async () => {
    try {
      const res = await apiRequest("POST", "/api/user/usage", { userId: user?.id });
      const data = await res.json();
      console.log('🔄 User usage fetched:', data);
      return data;
    } catch (error) {
      console.error('Error fetching user usage:', error);
      return { messageCount: 0, callDuration: 0, premiumUser: false, messageLimitReached: false, callLimitReached: false };
    }
  },
  enabled: !!user?.id,
  staleTime: 30000,
  refetchOnMount: true,
  refetchInterval: (query) => {
    const data = query.state.data;
    const isPremium = data?.premiumUser || user?.premium_user || false;
    return isPremium ? false : 10000;
  },
});
```

## Backend Code - Chat Endpoint with Premium Check

**File**: `server/routes/chat.ts`

```typescript
router.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { content, sessionId, userId, persona_id } = req.body;

    // ... validation code ...

    // --- PAYWALL CHECK START (Flow 1: Check Message Quota) ---
    // First, check if user is premium to bypass quota check entirely
    let isUserPremium = false;
    if (isSupabaseConfigured) {
      const { data: userData } = await supabase
        .from('users')
        .select('premium_user, subscription_tier, subscription_end_time')
        .eq('id', userId)
        .single();
      
      isUserPremium = userData?.premium_user === true || 
                     userData?.subscription_tier === 'daily' || 
                     userData?.subscription_tier === 'weekly';
      
      // Check if subscription expired
      if (isUserPremium && userData?.subscription_end_time) {
        const expiry = new Date(userData.subscription_end_time);
        const now = new Date();
        if (expiry <= now) {
          console.log(`[Paywall] Premium subscription expired for user ${userId}`);
          isUserPremium = false;
        }
      }
      
      console.log(`[Paywall] User ${userId} premium status: ${isUserPremium} (premium_user: ${userData?.premium_user}, tier: ${userData?.subscription_tier})`);
    }

    let quotaCheck: any = null;
    if (isSupabaseConfigured && !isUserPremium) {
      // Only check quota for non-premium users
      quotaCheck = await checkMessageQuota(supabase, userId);
      
      console.log(`[Message Quota] User: ${userId}, Allowed: ${quotaCheck.allowed}, Tier: ${quotaCheck.subscriptionTier}, Count: ${quotaCheck.messageCount}/${quotaCheck.limit}`);

      if (!quotaCheck.allowed) {
        console.log(`[Paywall] BLOCKED User ${userId}. Reason: ${quotaCheck.reason}`);
        return res.status(402).json({ error: 'PAYWALL' });
      }
    }

    // ... rest of chat logic ...
  } catch (error) {
    // error handling
  }
});
```

## Backend Code - User Usage Endpoint

**File**: `server/routes/supabase-api.ts`

```typescript
router.post('/api/user/usage', async (req: Request, res: Response) => {
  try {
    const { userId, incrementMessages, incrementCallSeconds } = req.body;

    if (!userId) {
      return res.json({ messageCount: 0, callDuration: 0 });
    }

    if (!isSupabaseConfigured) {
      return res.json({ messageCount: 0, callDuration: 0, premiumUser: false });
    }

    // Get user premium status
    const { data: userData } = await supabase
      .from('users')
      .select('premium_user, subscription_tier, subscription_end_time')
      .eq('id', userId)
      .single();

    const isPremium = userData?.premium_user === true || 
                     userData?.subscription_tier === 'daily' || 
                     userData?.subscription_tier === 'weekly';

    // Check if subscription expired
    let finalIsPremium = isPremium;
    if (isPremium && userData?.subscription_end_time) {
      const expiry = new Date(userData.subscription_end_time);
      if (expiry <= new Date()) {
        finalIsPremium = false;
      }
    }

    // Get message count from usage_stats
    let currentMessages = 0;
    try {
      const { data: usageData } = await supabase
        .from('usage_stats')
        .select('total_messages')
        .eq('user_id', userId)
        .single();
      
      currentMessages = usageData?.total_messages || 0;
    } catch (e) {
      console.log('[POST /api/user/usage] Using local counters:', e);
    }

    const messageLimit = isPremium ? 999999 : 1000;
    const finalMessageCount = currentMessages + (incrementMessages || 0);
    const messageLimitReached = !isPremium && finalMessageCount >= messageLimit;

    res.json({
      messageCount: finalMessageCount,
      callDuration: currentSeconds + (incrementCallSeconds || 0),
      premiumUser: finalIsPremium,
      subscriptionPlan: subscriptionPlan,
      messageLimitReached: messageLimitReached,
      callLimitReached: !isPremium && (currentSeconds + (incrementCallSeconds || 0)) >= 135,
    });
  } catch (error: any) {
    console.error('[POST /api/user/usage] Error:', error);
    res.json({ messageCount: 0, callDuration: 0 });
  }
});
```

## Database Schema

**Users Table**:
- `id` (UUID, primary key)
- `email` (string)
- `premium_user` (boolean)
- `subscription_tier` (string: 'daily' | 'weekly' | null)
- `subscription_end_time` (timestamp, nullable)

**Usage Stats Table**:
- `user_id` (UUID, foreign key to users)
- `total_messages` (integer)
- `daily_messages_count` (integer)

## What We Know

1. **Frontend correctly identifies user as premium**: `Is Premium: true` in logs
2. **Backend is returning 402**: This means either:
   - `isUserPremium` is evaluating to `false` in backend
   - The quota check is running even for premium users
   - There's a logic error in the premium check

3. **User Usage endpoint might be working**: Frontend gets user usage data, but we need to verify `premiumUser` field

4. **Messages aren't saving**: Because 402 blocks the request before it reaches the save logic

## CRITICAL FINDING - Premium Check Mismatch

**The issue**: There are TWO different premium check methods:

1. **Chat Endpoint** (`server/routes/chat.ts` lines 540-563):
   - Checks `users.premium_user` OR `users.subscription_tier`
   - Does NOT check `payments` or `subscriptions` tables

2. **User Usage Endpoint** (`server/routes/supabase-api.ts` lines 340-382):
   - Checks `payments` table via `checkUserHasPayment()`
   - Checks `subscriptions` table via `checkUserHasActiveSubscription()`
   - Falls back to `users.premium_user` only if payment check fails

**This mismatch could cause**:
- User Usage endpoint returns `premiumUser: true` (because they have a payment)
- Chat endpoint returns `isUserPremium: false` (because `users.premium_user` is false)
- Result: Frontend thinks user is premium, but backend blocks them with 402

## What We Need Help With

1. **Fix the premium check mismatch**:
   - Should chat endpoint also check payments/subscriptions tables?
   - Or should user usage endpoint match chat endpoint logic?
   - Which is the source of truth for premium status?

2. **Why is backend returning 402 for premium users?**
   - Is it because chat endpoint doesn't check payments table?
   - Should we unify the premium check logic?

3. **Why is message count not syncing?**
   - Backend count stays at 0
   - Local count increments
   - Messages aren't being saved (blocked by 402)

4. **How to debug this?**
   - What backend logs should we check?
   - What database queries should we run?
   - How to verify premium status is correct in database?

## Expected Behavior

1. Premium user sends message
2. Frontend checks: `isPremium = true` ✅
3. Request goes to backend: `POST /api/chat`
4. Backend checks: `isUserPremium = true` ✅
5. Backend skips quota check (because premium)
6. Backend processes message and saves to database ✅
7. Response returns successfully ✅

## Actual Behavior

1. Premium user sends message
2. Frontend checks: `isPremium = true` ✅
3. Request goes to backend: `POST /api/chat`
4. Backend checks: `isUserPremium = ???` (need to verify)
5. Backend returns: `402 Payment Required` ❌
6. Message never saved ❌

## Questions for Phind

1. **CRITICAL**: The chat endpoint and user usage endpoint use DIFFERENT premium check logic. Should we unify them?
   - Chat endpoint: Only checks `users.premium_user` and `users.subscription_tier`
   - User usage endpoint: Checks `payments` and `subscriptions` tables first, then falls back to `users.premium_user`
   - **This mismatch is likely causing the 402 error!**

2. What could cause `isUserPremium` to be `false` even when user has `premium_user = true` in database?
3. Is there a bug in the premium check logic (lines 540-563 in chat.ts)?
4. Should we add more logging to debug this?
5. Could there be a race condition or timing issue?
6. How can we verify the database query is returning the correct data?

## Recommended Fix

**Option 1**: Make chat endpoint use the same premium check as user usage endpoint:
- Import `checkUserHasPayment` and `checkUserHasActiveSubscription` in chat.ts
- Use the same logic as user usage endpoint

**Option 2**: Make user usage endpoint match chat endpoint:
- Only check `users.premium_user` and `users.subscription_tier`
- Don't check payments/subscriptions tables

**Option 3**: Create a shared utility function:
- Create `utils/checkPremiumStatus.ts` with unified logic
- Use it in both chat.ts and supabase-api.ts

## Additional Context

- Using Supabase as database
- Premium status can come from either `premium_user` boolean OR `subscription_tier` field
- Subscription expiry is checked and can downgrade premium status
- The code has been working before, this is a regression

## Utility Functions - Premium Check

**File**: `server/utils/checkUserHasPayment.ts`

```typescript
export async function checkUserHasPayment(
  supabase: SupabaseClient,
  userId: string
): Promise<{ hasPayment: boolean; planType?: string; latestPaymentDate?: Date }> {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('plan_type, created_at, status')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !payments || payments.length === 0) {
      return { hasPayment: false };
    }

    const latestPayment = payments[0];
    return {
      hasPayment: true,
      planType: latestPayment.plan_type || 'daily',
      latestPaymentDate: new Date(latestPayment.created_at)
    };
  } catch (error) {
    return { hasPayment: false };
  }
}

export async function checkUserHasActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('id, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (error || !subscriptions || subscriptions.length === 0) {
      return false;
    }

    const subscription = subscriptions[0];
    if (subscription.expires_at) {
      return new Date(subscription.expires_at) > new Date();
    }
    return true;
  } catch (error) {
    return false;
  }
}
```

## Files to Check

1. `server/routes/chat.ts` - Lines 538-580 (premium check and quota logic)
2. `server/routes/supabase-api.ts` - Lines 299-404 (user usage endpoint)
3. `server/utils/checkUserHasPayment.ts` - Premium check utilities
4. `client/src/pages/ChatPage.tsx` - Lines 172-253 (user usage query), Line 320 (premium check)

---

**Please help identify why premium users are getting 402 errors and how to fix it.**


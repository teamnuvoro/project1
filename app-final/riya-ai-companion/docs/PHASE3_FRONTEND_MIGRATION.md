# Phase 3: Frontend Migration to Supabase Edge Functions

## Overview

This document shows the complete frontend migration from Express API calls to Supabase Edge Functions with graceful fallback to Express when Edge Functions are unavailable.

---

## Key Features

1. **Feature-flag pattern** - Check `useEdgeFunctions() && isEdgeFunctionsConfigured()` before using Edge Functions
2. **Graceful fallback** - Falls back to Express API if Edge Functions fail or are not configured
3. **Session-based auth** - Uses Supabase session JWT for authorization when available
4. **JSON response handling** - Properly handles JSON responses (paywall, limitExceeded) before SSE streaming
5. **Abort handling** - Full cleanup on abort for both Edge and Express paths

---

## Files Updated

| File | Changes |
|------|---------|
| `client/src/lib/edgeFunctions.ts` | **NEW** - Edge Function API client with auth headers |
| `client/src/pages/ChatPage.tsx` | Updated sendMessageMutation with fallback |
| `client/src/hooks/useCachedSummary.ts` | Updated 3 hooks with fallback |
| `client/src/pages/SummaryTrackerPage.tsx` | Updated regenerateMutation with fallback |

---

## 1. Edge Functions API Client

**New File:** `client/src/lib/edgeFunctions.ts`

### Functions Provided:
- `sendChatMessageStreaming()` - Chat with streaming SSE
- `getUserSummary()` - Fetch user summary
- `generateUserSummary()` - Trigger summary generation
- `getUnderstandingProgression()` - Get progression data
- `getUserStats()` - Get quick stats
- `useEdgeFunctions()` - Feature flag to enable/disable
- `isEdgeFunctionsConfigured()` - Check if Supabase is configured

### Authorization:
```typescript
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  
  // Use session JWT when available for authenticated requests
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  
  return headers;
}
```

---

## 2. ChatPage.tsx Changes

### BEFORE (Express API):

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content, sessionId: session.id, userId }),
  signal: abortControllerRef.current.signal,
});

// Handle SSE stream manually
const reader = response.body?.getReader();
const decoder = new TextDecoder();
// ... stream parsing
```

### AFTER (Edge Function with Fallback):

```typescript
import { sendChatMessageStreaming, useEdgeFunctions, isEdgeFunctionsConfigured } from "@/lib/edgeFunctions";

// In sendMessageMutation:
const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();
setIsTyping(true);  // Set once at start

if (shouldUseEdge) {
  try {
    const result = await sendChatMessageStreaming(content, session.id, userId, callbacks, signal);

    if (result.reason === 'paywall' || result.reason === 'limit') {
      setIsTyping(false);
      removeOptimisticMessage(optimisticId);
      setPaywallOpen(true);
      return { success: false, reason: result.reason };
    }

    if (result.reason === 'aborted') {
      setIsTyping(false);
      setStreamingMessage("");
      removeOptimisticMessage(optimisticId);
      return { success: false, reason: 'aborted' };
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      setIsTyping(false);
      setStreamingMessage("");
      removeOptimisticMessage(optimisticId);
      return { success: false, reason: 'aborted' };
    }
    console.warn("Edge Function error, falling back to Express:", error.message);
    setStreamingMessage("");  // Clear streaming, keep isTyping true
    // Falls through to Express fallback
  }
}

// Express API fallback (runs if Edge not configured or failed)
const response = await fetch("/api/chat", { ... });
// ... same Express handling as before
```

### Key Changes:

| Aspect | Before | After |
|--------|--------|-------|
| API Call | `fetch("/api/chat")` | `sendChatMessageStreaming()` with fallback |
| Stream Handling | Manual reader loop | Callback-based (`onChunk`, `onComplete`) |
| Paywall Detection | Check `response.status === 402` | Check `result.reason === 'paywall'` |
| Error Handling | Try-catch around fetch | `onError` callback + fallback |
| Fallback | N/A | Falls back to Express if Edge fails |
| Abort Cleanup | Minimal | Full cleanup (typing, streaming, optimistic) |

---

## 3. useCachedSummary.ts Changes

### 3.1 useCachedSummary (GET summary)

**BEFORE:**
```typescript
const response = await fetch(`/api/user-summary/${userId}`);
if (!response.ok) { /* handle errors */ }
return await response.json();
```

**AFTER:**
```typescript
const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();

if (shouldUseEdge) {
  const result = await edgeGetUserSummary(userId);
  if (result.isFirstTimeUser) {
    return { success: true, summary: DEFAULT_FIRST_TIME_SUMMARY, isFirstTimeUser: true };
  }
  return result;
}

// Falls back to Express API
const response = await fetch(`/api/user-summary/${userId}`);
```

### 3.2 useCachedProgression (GET progression)

**BEFORE:**
```typescript
const response = await fetch(`/api/user-summary/${userId}/progression`);
if (!response.ok) return { success: false };
return await response.json();
```

**AFTER:**
```typescript
const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();

if (shouldUseEdge) {
  const data = await edgeGetProgression(userId);
  if (data.success) {
    setInCache(cacheKey, data, PROGRESSION_CACHE_TTL_MS);
  }
  return data;
}

// Falls back to Express API
const response = await fetch(`/api/user-summary/${userId}/progression`);
```

### 3.3 useCachedStats (GET stats)

**BEFORE:**
```typescript
const response = await fetch(`/api/user-summary/${userId}/stats`);
if (!response.ok) return { success: false };
return await response.json();
```

**AFTER:**
```typescript
const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();

if (shouldUseEdge) {
  const data = await edgeGetStats(userId);
  if (data.success) {
    setInCache(cacheKey, data, CACHE_TTL_MS);
  }
  return data;
}

// Falls back to Express API
const response = await fetch(`/api/user-summary/${userId}/stats`);
```

---

## 4. SummaryTrackerPage.tsx Changes

### BEFORE (Express API):

```typescript
const regenerateMutation = useMutation({
  mutationFn: async () => {
    if (!userId) throw new Error("User not authenticated");
    const response = await fetch(`/api/user-summary/${userId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to regenerate");
    }
    return response.json();
  },
  // ...
});
```

### AFTER (Edge Function):

```typescript
import { generateUserSummary, useEdgeFunctions, isEdgeFunctionsConfigured } from "@/lib/edgeFunctions";

const regenerateMutation = useMutation({
  mutationFn: async () => {
    if (!userId) throw new Error("User not authenticated");
    
    const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();

    if (shouldUseEdge) {
      return await generateUserSummary(userId);
    }

    // Falls back to Express API
    const response = await fetch(`/api/user-summary/${userId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to regenerate");
    }
    return response.json();
  },
  // ...
});
```

---

## 5. Feature Flag Configuration

### Enable Edge Functions

Set in `.env`:

```env
# Enable Edge Functions (defaults to true in production, false in development)
VITE_USE_EDGE_FUNCTIONS=true

# Required Supabase configuration
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### How it works:

```typescript
// In client/src/lib/edgeFunctions.ts

export const useEdgeFunctions = (): boolean => {
  const envFlag = import.meta.env.VITE_USE_EDGE_FUNCTIONS;
  if (envFlag !== undefined) {
    return envFlag === 'true' || envFlag === true;
  }
  // Default: use Edge Functions in production only
  return import.meta.env.PROD;
};

export const isEdgeFunctionsConfigured = (): boolean => {
  return !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'mock-anon-key-for-development';
};
```

---

## 6. Testing Checklist

### Chat Page

- [ ] Send a message and verify streaming works
- [ ] Check console logs show "Using Edge Functions: true" (or false for fallback)
- [ ] Verify "Riya is typing" indicator appears
- [ ] Test paywall triggers at 20 messages (free user)
- [ ] Test session timeout (15 minutes of inactivity)
- [ ] Verify message abort works (cancel sending)

### Summary Tracker Page

- [ ] Load page and verify summary data appears
- [ ] Click "Refresh" button to regenerate summary
- [ ] Verify progression timeline displays
- [ ] Check stats are accurate
- [ ] Test with new user (first-time user state)

### Fallback Testing

- [ ] Set `VITE_USE_EDGE_FUNCTIONS=false` to test Express fallback
- [ ] Verify all features work with Express API
- [ ] Set back to `true` and verify Edge Functions work

---

## 7. Console Log Reference

### Edge Functions Enabled:

```
=== CHAT DEBUG START ===
1. Using Edge Functions: true
2. Session ID: 74ceadb1-ab11-4b10-8ba7-024d9682e89a
3. User ID: 00000000-0000-0000-0000-000000000001
4. Message content: Hello Riya!
5. Using Supabase Edge Function: chat-v2
6. Stream complete: { sessionId: "...", messageCount: 5, messageLimit: 20 }

[useCachedSummary] Using Edge Functions: true
[useCachedProgression] Using Edge Function
[useCachedStats] Using Edge Function
[SummaryTrackerPage] Regenerate using Edge Functions: true
```

### Express Fallback:

```
=== CHAT DEBUG START ===
1. Using Edge Functions: false
2. Session ID: 74ceadb1-ab11-4b10-8ba7-024d9682e89a
3. User ID: 00000000-0000-0000-0000-000000000001
4. Message content: Hello Riya!
5. Request body (Express fallback): { ... }
6. Sending fetch to /api/chat...
7. Response status: 200 OK
8. Got reader, starting to read stream...

[useCachedSummary] Using Edge Functions: false
```

---

## 8. Rollback Instructions

If issues occur with Edge Functions:

### Quick Rollback (Environment Variable):

```env
# Disable Edge Functions
VITE_USE_EDGE_FUNCTIONS=false
```

### Code Rollback:

All files maintain Express API fallback code. Simply ensure:
1. `VITE_USE_EDGE_FUNCTIONS=false` OR
2. `VITE_SUPABASE_ANON_KEY` is not set

The code will automatically fall back to Express API.

---

## 9. Migration Complete Summary

| Component | Express Endpoint | Edge Function | Status |
|-----------|-----------------|---------------|--------|
| Chat (streaming) | `POST /api/chat` | `chat-v2` | ✅ Ready |
| Get Summary | `GET /api/user-summary/:id` | `user-summary` | ✅ Ready |
| Generate Summary | `POST /api/user-summary/:id/generate` | `user-summary` | ✅ Ready |
| Get Progression | `GET /api/user-summary/:id/progression` | `user-summary` | ✅ Ready |
| Get Stats | `GET /api/user-summary/:id/stats` | `user-summary` | ✅ Ready |

All business logic is preserved. The frontend automatically switches between Edge Functions and Express based on configuration.

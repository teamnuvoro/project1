# Deep Analysis: Messages Disappearing After Refresh

## Root Cause Identified

### The Problem Chain:

1. **Session Query Configuration** (Line 73-85):
   - `staleTime: 0` - Always considered stale
   - `refetchOnMount: true` - Refetches on every mount
   - `refetchOnWindowFocus: true` - Refetches when window gains focus
   - **Result**: Session is refetched on every page refresh

2. **Messages Query Dependency** (Line 87-89):
   - Query key: `["messages", session?.id, user?.id]`
   - `enabled: !!(session?.id && user?.id)` - Only runs when session exists
   - **Problem**: If session changes or is undefined, query key changes

3. **Race Condition**:
   - On page refresh:
     a. Session query starts fetching
     b. Messages query is disabled (session?.id is undefined)
     c. Session query completes, returns session ID
     d. Messages query enables and fetches
     e. **BUT**: If session query refetches again (due to staleTime: 0), session might become undefined temporarily
     f. Messages query disables, cache is lost

4. **Session Endpoint Behavior**:
   - Tries to reuse existing sessions with messages
   - But if there's any delay or error, might return different session
   - Each new session ID = new query key = lost cache

## The Structural Issue

**The messages query key is TOO DEPENDENT on the session query state.**

When:
- Session refetches → session?.id might be undefined temporarily
- Query key changes → `["messages", undefined, user?.id]` vs `["messages", "session-id", user?.id]`
- React Query treats these as DIFFERENT queries
- Old cache is not used
- Messages appear to "disappear"

## Solution

### Option 1: Stabilize Session Query (Recommended)
- Increase `staleTime` for session query
- Don't refetch on window focus
- Only refetch when explicitly needed

### Option 2: Make Messages Query More Resilient
- Don't disable query when session is undefined
- Use previous session ID from cache
- Handle session changes gracefully

### Option 3: Use User ID Only for Messages Query
- Query key: `["messages", user?.id]` (not session ID)
- Backend should return messages for user's most recent session
- More stable, less dependent on session state

## Recommended Fix: Option 3 + Option 1

1. Change messages query key to use user ID only
2. Backend should always return messages from user's most recent session
3. Stabilize session query to prevent unnecessary refetches
4. Add better error handling and loading states


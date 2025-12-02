# Phase 2: Backend Migration to Supabase Edge Functions

## Complete Summary

This document summarizes the migration of Express routes to Supabase Edge Functions.

---

## Edge Functions Created

| Function | File | Purpose | Status |
|----------|------|---------|--------|
| `chat-v2` | `supabase/functions/chat-v2/index.ts` | Chat with streaming SSE | Ready |
| `user-summary` | `supabase/functions/user-summary/index.ts` | All summary endpoints | Ready |
| `generate-user-summary` | `supabase/functions/generate-user-summary/index.ts` | AI analysis | Exists |
| `vapi-webhook` | `supabase/functions/vapi-webhook/index.ts` | Voice call events | Exists |

---

## Endpoints Migrated

### Chat (chat-v2)

| Express | Edge Function |
|---------|---------------|
| `POST /api/chat` | `POST /functions/v1/chat-v2` |

**Features preserved:**
- ✅ Session management (15-minute timeout)
- ✅ Full context building (summary + history)
- ✅ Streaming SSE responses
- ✅ Paywall at 20 messages
- ✅ Retry logic (3 attempts)
- ✅ Fallback responses on error
- ✅ All 4 persona configs

### User Summary (user-summary)

| Express | Edge Function |
|---------|---------------|
| `GET /api/user-summary/:userId` | `GET /functions/v1/user-summary/{userId}` |
| `POST /api/user-summary/:userId/generate` | `POST /functions/v1/user-summary/{userId}/generate` |
| `GET /api/user-summary/:userId/progression` | `GET /functions/v1/user-summary/{userId}/progression` |
| `GET /api/user-summary/:userId/stats` | `GET /functions/v1/user-summary/{userId}/stats` |

**Features preserved:**
- ✅ Understanding level calculator (25-75%)
- ✅ Progression tracking
- ✅ Stats calculation
- ✅ UUID validation

---

## Deployment Commands

```bash
# Deploy all new functions
supabase functions deploy chat-v2
supabase functions deploy user-summary

# Set required secrets
supabase secrets set GROQ_API_KEY=<your-groq-key>

# Verify deployment
supabase functions list
```

---

## Frontend API Client

Create these files in your frontend:

### 1. Chat API (`client/src/lib/chatApi.ts`)

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function sendChatMessageStreaming(
  content: string,
  sessionId: string | null,
  userId: string,
  onChunk: (text: string) => void,
  onComplete: (data: { sessionId: string; messageCount: number }) => void
) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ content, sessionId, userId })
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 402) throw new Error('PAYWALL_HIT');
    throw new Error(errorData.error || 'Chat failed');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.done) {
          onComplete({ sessionId: data.sessionId, messageCount: data.messageCount });
        } else if (data.content) {
          onChunk(data.content);
        }
      } catch {}
    }
  }
}
```

### 2. User Summary API (`client/src/lib/userSummaryApi.ts`)

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

export async function getUserSummary(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.summary;
}

export async function generateUserSummary(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}/generate`, { 
    method: 'POST', headers 
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return { summary: data.summary, stats: data.stats };
}

export async function getUnderstandingProgression(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}/progression`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

export async function getUserStats(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}/stats`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.stats;
}
```

---

## Environment Variables

### Edge Functions (Supabase Dashboard)

| Variable | Auto-injected | Manual |
|----------|---------------|--------|
| `SUPABASE_URL` | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - |
| `GROQ_API_KEY` | - | Yes |

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Testing Commands

```bash
# Test chat endpoint
curl -X POST 'https://PROJECT.supabase.co/functions/v1/chat-v2' \
  -H 'Authorization: Bearer ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"content": "Hello!", "userId": "UUID"}'

# Test summary endpoint
curl 'https://PROJECT.supabase.co/functions/v1/user-summary/UUID' \
  -H 'Authorization: Bearer ANON_KEY'

# Test progression
curl 'https://PROJECT.supabase.co/functions/v1/user-summary/UUID/progression' \
  -H 'Authorization: Bearer ANON_KEY'
```

---

## Migration Checklist

### Deployment
- [ ] Run `supabase functions deploy chat-v2`
- [ ] Run `supabase functions deploy user-summary`
- [ ] Set `GROQ_API_KEY` secret in Supabase

### Frontend Updates
- [ ] Create `chatApi.ts` client
- [ ] Create `userSummaryApi.ts` client
- [ ] Update ChatPage to use new chat API
- [ ] Update SummaryPage to use new summary API
- [ ] Update any TanStack Query hooks

### Testing
- [ ] Test chat streaming works
- [ ] Test paywall triggers at 20 messages
- [ ] Test session timeout (15 min)
- [ ] Test summary generation
- [ ] Test progression display
- [ ] Test stats display

### Cleanup (After Validation)
- [ ] Remove Express chat route
- [ ] Remove Express user-summary routes
- [ ] Remove unused session manager (if moved)
- [ ] Remove unused context builder (if moved)

---

## Rollback Plan

If issues occur, revert frontend to call Express routes:

```typescript
// Rollback chat
const response = await fetch('/api/chat', { ... });

// Rollback summary
const response = await fetch(`/api/user-summary/${userId}`);
```

Both Express and Edge Functions can coexist during migration.

---

## Files Reference

### New Edge Functions
- `supabase/functions/chat-v2/index.ts` (540 lines)
- `supabase/functions/user-summary/index.ts` (350 lines)

### Documentation
- `docs/MIGRATION_CHAT_ENDPOINT.md`
- `docs/MIGRATION_USER_SUMMARY_ENDPOINTS.md`
- `docs/PHASE2_MIGRATION_SUMMARY.md` (this file)

### Original Express Code (for reference)
- `server/routes/chat.ts`
- `server/routes/user-summary.ts`
- `server/lib/sessionManager.ts`
- `server/lib/contextBuilder.ts`
- `server/lib/understandingLevelCalculator.ts`

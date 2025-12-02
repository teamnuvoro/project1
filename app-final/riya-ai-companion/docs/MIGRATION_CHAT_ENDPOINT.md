# Migration Guide: /api/chat → Supabase Edge Function

## Overview

This document shows how to migrate the chat endpoint from Express to Supabase Edge Functions.

---

## 1. CURRENT EXPRESS CODE

### Route: `server/routes/chat.ts` - POST /api/chat

```typescript
// Key features in current implementation:
// - Session management with 15-minute timeout
// - Full context building (summary + history + messages)
// - Streaming SSE responses
// - Paywall at 20 messages
// - Retry logic for Groq API
// - Fallback responses on error
```

### Business Logic Dependencies:

| File | Purpose |
|------|---------|
| `server/lib/sessionManager.ts` | 15-minute session timeout |
| `server/lib/contextBuilder.ts` | Build AI memory context |
| `server/supabase.ts` | Persona configs, DB client |

---

## 2. NEW EDGE FUNCTION

### Location: `supabase/functions/chat-v2/index.ts`

**ALL business logic is preserved:**
- ✅ Session timeout (15 minutes)
- ✅ Context building (user summary + messages + history)
- ✅ Paywall enforcement (20 messages)
- ✅ Streaming responses (SSE)
- ✅ Retry logic (3 attempts)
- ✅ Fallback responses on error
- ✅ All 4 persona configs

### Deploy to Supabase:

```bash
# Deploy the function
supabase functions deploy chat-v2

# Set the required secrets
supabase secrets set GROQ_API_KEY=<your-groq-key>
```

---

## 3. FRONTEND CHANGES

### BEFORE (Express API):

```typescript
// client/src/pages/ChatPage.tsx or wherever you call chat API

async function sendMessage(content: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      sessionId,
      userId
    })
  });

  // Handle SSE stream
  const reader = response.body?.getReader();
  // ... stream handling
}
```

### AFTER (Supabase Edge Function):

```typescript
// client/src/pages/ChatPage.tsx

import { supabase } from '@/lib/supabase';

async function sendMessage(content: string) {
  // Option 1: Direct fetch to Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/chat-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      content,
      sessionId,
      userId
    })
  });

  // Handle SSE stream (same as before)
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = JSON.parse(line.slice(6));
      
      if (data.done) {
        // Message complete
        setSessionId(data.sessionId);
        setMessageCount(data.messageCount);
      } else if (data.content) {
        // Stream content
        setStreamingText(prev => prev + data.content);
      }
    }
  }
}
```

### Option 2: Using Supabase Functions SDK

```typescript
// client/src/lib/chat.ts

import { supabase } from './supabase';

export async function sendChatMessage(content: string, sessionId?: string, userId?: string) {
  // For non-streaming (simpler):
  const { data, error } = await supabase.functions.invoke('chat-v2', {
    body: { content, sessionId, userId }
  });

  if (error) throw error;
  return data;
}

// For streaming, use fetch directly (SDK doesn't support streams well)
export async function sendChatMessageStreaming(
  content: string, 
  sessionId: string | null,
  userId: string,
  onChunk: (text: string) => void,
  onComplete: (data: { sessionId: string; messageCount: number }) => void
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/chat-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ content, sessionId, userId })
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    // Handle paywall
    if (response.status === 402) {
      throw new Error('PAYWALL_HIT');
    }
    
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
          onComplete({
            sessionId: data.sessionId,
            messageCount: data.messageCount
          });
        } else if (data.content) {
          onChunk(data.content);
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }
}
```

---

## 4. RESPONSE FORMAT

Both Express and Edge Function return the same format:

### SSE Stream Events:

```json
// Content chunk
data: {"content": "Hey! ", "done": false}

// Final event
data: {
  "content": "",
  "done": true,
  "sessionId": "uuid-here",
  "messageCount": 5,
  "messageLimit": 20
}
```

### Error Responses:

```json
// Validation error (400)
{"error": "Message content is required"}

// Paywall (402)
{
  "error": "PAYWALL_HIT",
  "message": "You've reached your free message limit!",
  "messageCount": 20,
  "messageLimit": 20
}

// Server error (500)
{"error": "Failed to process message"}
```

---

## 5. ENVIRONMENT VARIABLES

### Edge Function (set in Supabase Dashboard or CLI):

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Auto-injected | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Service role key |
| `GROQ_API_KEY` | Yes | Groq API key for AI |

### Frontend (.env):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 6. TESTING

### Test with curl:

```bash
# Test the Edge Function
curl -X POST 'https://your-project.supabase.co/functions/v1/chat-v2' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"content": "Hello Riya!", "userId": "00000000-0000-0000-0000-000000000001"}'
```

### Test streaming:

```bash
# Stream response
curl -X POST 'https://your-project.supabase.co/functions/v1/chat-v2' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"content": "How are you?", "userId": "00000000-0000-0000-0000-000000000001"}' \
  --no-buffer
```

---

## 7. MIGRATION CHECKLIST

- [ ] Deploy Edge Function: `supabase functions deploy chat-v2`
- [ ] Set secrets: `supabase secrets set GROQ_API_KEY=xxx`
- [ ] Update frontend to call Edge Function URL
- [ ] Test streaming works
- [ ] Test paywall triggers at 20 messages
- [ ] Test session timeout (15 min)
- [ ] Test fallback responses when Groq fails
- [ ] Remove Express route when ready

---

## 8. ROLLBACK

If issues occur, simply point frontend back to Express:

```typescript
// Rollback: change URL back to Express
const response = await fetch('/api/chat', { ... });
```

The Edge Function and Express route can coexist during migration.

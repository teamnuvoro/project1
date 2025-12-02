# Supabase Edge Functions for Riya AI

This directory contains Supabase Edge Functions that can be deployed to Supabase's infrastructure for a truly Supabase-first architecture.

## Why Edge Functions?

- **Database-level execution**: Logic runs close to your data
- **Faster response**: No network hop to a separate backend
- **Edit at will**: Change logic without redeploying your app
- **Secrets management**: API keys stored securely in Supabase
- **Auto-scaling**: Scales with Supabase infrastructure

## Available Functions

### `/functions/v1/chat`
Main chat endpoint that:
- Receives user message + sessionId
- Validates session in Supabase
- Calls Groq API with conversation history
- Saves user and AI messages to database
- Enforces paywall limits
- Returns AI response

**Input:**
```json
{
  "message": "Hello Riya!",
  "sessionId": "uuid-session-id",
  "userId": "uuid-user-id"
}
```

**Output:**
```json
{
  "response": "Namaste! So nice to meet you...",
  "messageId": "uuid-message-id",
  "sessionId": "uuid-session-id",
  "messageCount": 1,
  "messageLimit": 20
}
```

## Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref xgraxcgavqeyqfwimbwt
```

### Set Secrets

Add your API keys as Supabase secrets:

```bash
supabase secrets set GROQ_API_KEY=your-groq-api-key
```

### Deploy

Deploy all functions:
```bash
supabase functions deploy chat
```

Or deploy individually:
```bash
supabase functions deploy chat --project-ref xgraxcgavqeyqfwimbwt
```

### Test Locally

Run functions locally for testing:
```bash
supabase functions serve
```

Then test with curl:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/chat' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello Riya!","userId":"00000000-0000-0000-0000-000000000001"}'
```

## Using Edge Functions in Your App

### Option 1: Direct Call (Recommended for Production)

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/chat`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sessionId, userId }),
  }
);
```

### Option 2: Backend Proxy (Current Setup)

The Express backend at `/api/chat` handles chat functionality using the same logic. This is useful for:
- Streaming responses (SSE)
- Additional middleware
- Custom logging

## Architecture

```
Frontend (React)
    │
    ├── Option A: Direct to Edge Functions
    │   └── Supabase Edge Functions
    │       └── Groq API
    │       └── Supabase Database
    │
    └── Option B: Via Backend (Current)
        └── Express Backend
            └── Groq API
            └── Supabase Database
```

Both options work with the same Supabase database and Groq API.

## Files

```
supabase/
├── config.toml         # Supabase project configuration
├── functions/
│   ├── _shared/
│   │   ├── cors.ts     # CORS headers
│   │   └── supabase.ts # Supabase client + types
│   └── chat/
│       └── index.ts    # Main chat function
└── README.md           # This file
```

## Troubleshooting

### "GROQ_API_KEY not found"
Run: `supabase secrets set GROQ_API_KEY=your-key`

### CORS errors
The Edge Functions include CORS headers. Make sure your frontend domain is allowed.

### Database connection issues
Check that your Supabase project is active and RLS policies allow the operation.

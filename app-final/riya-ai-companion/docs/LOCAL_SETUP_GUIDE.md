# Local Setup Guide

Complete instructions to run the Riya AI Companion locally.

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime environment |
| npm | 10+ | Package manager |
| Git | Any | Clone repository |

**Check versions:**
```bash
node --version   # Should show v20.x.x or higher
npm --version    # Should show 10.x.x or higher
```

### Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Supabase | Database & Edge Functions | https://supabase.com |
| Groq | AI chat responses (Hinglish) | https://console.groq.com |

---

## 2. Setup Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd riya-ai-companion
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all 100+ packages including React, Express, Supabase client, Groq SDK, etc.

### Step 3: Create Environment File

Create a `.env` file in the project root:

```bash
touch .env
```

### Step 4: Add Environment Variables

Copy this template into your `.env` file:

```env
# =============================================================================
# DATABASE - Supabase PostgreSQL
# =============================================================================
# Get from: Supabase Dashboard > Project Settings > Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Individual connection params (auto-populated from DATABASE_URL)
PGHOST=db.[PROJECT-REF].supabase.co
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-database-password
PGDATABASE=postgres

# =============================================================================
# SUPABASE - Authentication & Edge Functions
# =============================================================================
# Get from: Supabase Dashboard > Project Settings > API
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (server-side only, never expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =============================================================================
# AI SERVICES - Groq for Hinglish chat
# =============================================================================
# Get from: https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# =============================================================================
# OPTIONAL - Voice Calling (Vapi AI)
# =============================================================================
# Get from: https://dashboard.vapi.ai
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_PRIVATE_KEY=your-vapi-private-key

# =============================================================================
# OPTIONAL - Feature Flags
# =============================================================================
# Set to 'true' to use Edge Functions instead of Express
VITE_USE_EDGE_FUNCTIONS=false
```

### Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string for Supabase |
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public API key for client-side auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side key for admin operations |
| `GROQ_API_KEY` | Yes | API key for Hinglish AI responses |
| `VAPI_PUBLIC_KEY` | No | For voice calling feature |
| `VAPI_PRIVATE_KEY` | No | For voice calling feature |
| `VITE_USE_EDGE_FUNCTIONS` | No | Enable Edge Functions (default: false) |

---

## 3. Database Setup

### Option A: Use Existing Supabase Database

If you have an existing Supabase project with the schema already set up, your `.env` should work immediately.

### Option B: Create New Database Schema

Push the Drizzle schema to your database:

```bash
npm run db:push
```

This creates all 25+ tables including:
- `users` - User accounts
- `sessions` - Chat sessions
- `messages` - Chat messages
- `user_cumulative_summaries` - AI-generated insights
- And more...

---

## 4. Running Locally

### Start the Development Server

```bash
npm run dev
```

### What Happens

1. Express server starts on port 5000
2. Vite dev server starts (frontend hot-reload)
3. Both are served on the same port

### Access Points

| URL | Description |
|-----|-------------|
| http://localhost:5000 | Main application |
| http://localhost:5000/api/health | API health check |

### Expected Console Output

```
> rest-express@1.0.0 dev
> NODE_ENV=development tsx server/index.ts

[Server] Starting server with Supabase integration...
[Server] SUPABASE_SERVICE_ROLE_KEY set: true
[Server] GROQ_API_KEY set: true
11:32:08 AM [express] Server running on port 5000
[Server] Frontend server listening on port 5000
[Server] Supabase API routes integrated
[Server] Chat API routes integrated
[Server] User Summary routes integrated
```

---

## 5. Testing Checklist

### Test 1: Application Loads

1. Open http://localhost:5000 in browser
2. You should see the Riya AI Companion interface
3. Sidebar shows: Chat, Voice Call, Summary, My Profile

### Test 2: Authentication

1. Click "Chat" in sidebar
2. In development mode, auto-login happens
3. Check browser console for: `[Auth] Development mode - using dev user`

### Test 3: Send a Chat Message

1. Navigate to Chat page
2. Type a message like "Hi Riya, how are you?"
3. Press Enter or click Send
4. Watch for streaming response

### Test 4: Check DevTools Network Tab

1. Open DevTools (F12) > Network tab
2. Filter by "Fetch/XHR"
3. Send a message
4. Look for:
   - `POST /api/chat` request
   - Status: 200
   - Response: SSE stream with `data:` lines

### Test 5: Verify Supabase Connection

1. Open DevTools > Console
2. Look for any Supabase errors
3. Check Network for Supabase API calls

### Test 6: Check AI Response Quality

1. Send: "Mujhe kuch batao apne baare mein"
2. Response should be in Hinglish (30-40% Hindi)
3. Persona should be warm and friendly

---

## 6. Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY not set"

**Cause:** Missing environment variable

**Fix:**
1. Get the service role key from Supabase Dashboard > Project Settings > API
2. Add to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Restart: `npm run dev`

---

### Error: "GROQ_API_KEY not set"

**Cause:** Missing Groq API key

**Fix:**
1. Get key from https://console.groq.com/keys
2. Add to `.env`:
   ```
   GROQ_API_KEY=gsk_...
   ```
3. Restart: `npm run dev`

---

### Error: "Failed to connect to database"

**Cause:** Invalid DATABASE_URL or database not accessible

**Fix:**
1. Check DATABASE_URL format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
2. Verify password doesn't have special characters that need URL encoding
3. Check Supabase Dashboard > Database > Connection Info

---

### Error: "relation does not exist"

**Cause:** Database tables not created

**Fix:**
```bash
npm run db:push
```

---

### Error: "Port 5000 already in use"

**Cause:** Another process using port 5000

**Fix:**
```bash
# Find process using port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3000 npm run dev
```

---

### Chat Messages Not Streaming

**Cause:** SSE connection issue

**Fix:**
1. Check Network tab for `/api/chat` request
2. Verify response headers include `Content-Type: text/event-stream`
3. Check server console for errors

---

### AI Responses in Wrong Language

**Cause:** Persona or prompt configuration issue

**Fix:**
1. Check GROQ_API_KEY is valid
2. Verify Groq model is `llama-3.3-70b-versatile`
3. Check server/groqService.ts for system prompt

---

## 7. Log Locations

| Log Type | Location |
|----------|----------|
| Server logs | Terminal running `npm run dev` |
| Client logs | Browser DevTools > Console |
| Network requests | Browser DevTools > Network |
| Supabase logs | Supabase Dashboard > Logs |

### Enable Verbose Logging

Add to `.env`:
```env
DEBUG=*
```

---

## 8. Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

---

## 9. Next Steps After Setup

1. **Test all features:** Chat, Summary, Profile
2. **Check Edge Functions:** Set `VITE_USE_EDGE_FUNCTIONS=true` to test
3. **Deploy Edge Functions:** See `docs/PHASE2_MIGRATION_SUMMARY.md`
4. **Production setup:** Configure production environment variables

---

## Need Help?

1. Check existing documentation in `/docs` folder
2. Review `MIGRATION_DOCUMENTATION.md` for complete architecture
3. Check Supabase Edge Function logs if using Edge Functions

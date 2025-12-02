# Riya AI Companion - Complete Migration Documentation

## PHASE 1: COMPLETE DOCUMENTATION

---

## 1. FILE STRUCTURE

```
riya-ai-companion/
├── client/                          # Frontend React Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── analysis/           # Analysis/insights components
│   │   │   ├── avatar/             # Avatar display components
│   │   │   ├── chat/               # Chat UI components
│   │   │   │   ├── ChatHeader.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatMessages.tsx
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   └── VoiceCallButton.tsx
│   │   │   ├── figma/              # Design imports
│   │   │   ├── onboarding/         # Onboarding flow
│   │   │   ├── paywall/            # Premium paywall
│   │   │   ├── ui/                 # shadcn/ui components (52 files)
│   │   │   ├── app-sidebar.tsx     # Main sidebar
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── TrackerComponents.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Auth state management
│   │   ├── hooks/
│   │   │   ├── use-mobile.ts
│   │   │   ├── use-toast.ts
│   │   │   ├── useCachedSummary.ts
│   │   │   └── useVoiceCall.ts
│   │   ├── lib/
│   │   │   ├── analytics.ts        # Amplitude tracking
│   │   │   ├── errorTypes.ts
│   │   │   ├── queryClient.ts      # TanStack Query config
│   │   │   ├── supabase.ts         # Supabase client
│   │   │   ├── understandingLevelCalculator.ts
│   │   │   └── utils.ts            # cn() utility
│   │   ├── pages/
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── CallPage.tsx
│   │   │   ├── ChatPage.tsx        # Main chat interface
│   │   │   ├── GalleryPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── HistoryDetailPage.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MemoriesPage.tsx
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── PaymentCallback.tsx
│   │   │   ├── PersonalityCarouselPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── SummaryPage.tsx
│   │   │   ├── SummaryTrackerPage.tsx
│   │   │   └── not-found.tsx
│   │   ├── App.tsx                 # Main app with routing
│   │   ├── index.css               # Tailwind + custom CSS
│   │   └── main.tsx                # Entry point
│   └── index.html
│
├── server/                          # Express Backend
│   ├── lib/
│   │   ├── contextBuilder.ts       # AI memory context
│   │   ├── sessionManager.ts       # Session timeout logic
│   │   ├── summaryDebounce.ts
│   │   └── understandingLevelCalculator.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── requestTracer.ts
│   ├── routes/
│   │   ├── call.ts                 # Voice calling API
│   │   ├── chat.ts                 # Main chat API (Groq)
│   │   ├── summary.ts
│   │   ├── supabase-api.ts         # User/session CRUD
│   │   └── user-summary.ts         # Cumulative insights
│   ├── services/
│   │   ├── elevenlabs.ts
│   │   ├── paymentLogger.ts
│   │   ├── sarvam.ts
│   │   └── twilio.ts
│   ├── utils/
│   │   └── logger.ts
│   ├── cashfree.ts
│   ├── config.ts
│   ├── db.ts
│   ├── email.ts
│   ├── gemini.ts
│   ├── groq.ts                     # Groq API wrapper
│   ├── index.ts                    # Express server entry
│   ├── openai.ts
│   ├── prompts.ts
│   ├── supabase.ts                 # Supabase client + configs
│   └── vite.ts                     # Vite dev server setup
│
├── shared/
│   └── schema.ts                   # Drizzle ORM schema
│
├── supabase/                        # Supabase Edge Functions
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── cors.ts
│   │   │   └── supabase.ts
│   │   ├── chat/
│   │   │   └── index.ts            # Chat Edge Function
│   │   ├── generate-user-summary/
│   │   │   └── index.ts            # Summary generation
│   │   └── vapi-webhook/
│   │       └── index.ts            # Vapi call webhooks
│   ├── config.toml
│   └── README.md
│
├── docs/
│   ├── persona-evolution-algorithms.md
│   └── SETUP_CHECKLIST.md
│
├── scripts/                         # Utility scripts
│   ├── batch-push.ts
│   ├── create-github-repo.ts
│   ├── init-and-push.ts
│   ├── push-to-github.ts
│   └── verify-db.ts
│
├── migrations/                      # Drizzle migrations
│   ├── meta/
│   └── 0000_foamy_la_nuit.sql
│
├── testing/
│   └── cumulative-summary-testing-plan.md
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── drizzle.config.ts
├── components.json                  # shadcn/ui config
├── vercel.json
├── netlify.toml
└── replit.md
```

---

## 2. ENVIRONMENT VARIABLES

### All Environment Variables Used

```env
# ==========================================
# SUPABASE (Required)
# ==========================================
SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Frontend versions (with VITE_ prefix for client access)
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==========================================
# AI SERVICES (Required)
# ==========================================
GROQ_API_KEY=<your-groq-api-key>

# ==========================================
# VOICE CALLING - VAPI (Optional)
# ==========================================
VAPI_PUBLIC_KEY=dddc9544-777b-43d8-98dc-97ecb344e57f
VAPI_PRIVATE_KEY=<your-vapi-private-key>
VITE_VAPI_PUBLIC_KEY=dddc9544-777b-43d8-98dc-97ecb344e57f

# ==========================================
# POSTGRESQL DATABASE (Replit-specific, not needed after migration)
# ==========================================
DATABASE_URL=<replit-postgres-url>
PGDATABASE=<db-name>
PGHOST=<host>
PGPORT=<port>
PGUSER=<user>
PGPASSWORD=<password>

# ==========================================
# SESSION (Server-side)
# ==========================================
SESSION_SECRET=<random-secret>

# ==========================================
# PAYMENT - CASHFREE (Optional)
# ==========================================
CASHFREE_APP_ID=<your-cashfree-app-id>
CASHFREE_SECRET_KEY=<your-cashfree-secret>
CASHFREE_MODE=sandbox
```

### Where Each Variable Is Used

| Variable | File(s) | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | `server/supabase.ts`, Edge Functions | Supabase API endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | `server/supabase.ts`, Edge Functions | Admin access |
| `VITE_SUPABASE_URL` | `client/src/lib/supabase.ts` | Frontend API |
| `VITE_SUPABASE_ANON_KEY` | `client/src/lib/supabase.ts` | Frontend auth |
| `GROQ_API_KEY` | `server/routes/chat.ts`, Edge Functions | AI responses |
| `VAPI_PUBLIC_KEY` | `server/routes/call.ts` | Voice calling |
| `VITE_VAPI_PUBLIC_KEY` | `client/src/hooks/useVoiceCall.ts` | Voice calling |

---

## 3. DEPENDENCIES

### Full package.json

```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "build:dev": "vite build --mode development"
  }
}
```

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI library |
| `react-dom` | ^18.3.1 | React DOM |
| `wouter` | ^3.3.5 | Routing |
| `@tanstack/react-query` | ^5.60.5 | Server state |
| `@supabase/supabase-js` | ^2.86.0 | Supabase client |
| `@vapi-ai/web` | ^2.5.2 | Voice calling |
| `framer-motion` | ^11.13.1 | Animations |
| `lucide-react` | ^0.453.0 | Icons |
| `react-hook-form` | ^7.55.0 | Forms |
| `@hookform/resolvers` | ^3.10.0 | Form validation |
| `recharts` | ^2.15.2 | Charts |
| `date-fns` | ^3.6.0 | Date utilities |
| `tailwind-merge` | ^2.6.0 | CSS utilities |
| `class-variance-authority` | ^0.7.1 | Variant utilities |
| `clsx` | ^2.1.1 | Class names |

### Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.21.2 | HTTP server |
| `groq-sdk` | ^0.36.0 | Groq AI API |
| `openai` | ^6.3.0 | OpenAI API |
| `@supabase/supabase-js` | ^2.86.0 | Database client |
| `drizzle-orm` | ^0.39.1 | ORM |
| `drizzle-zod` | ^0.7.0 | Schema validation |
| `express-session` | ^1.18.1 | Sessions |
| `compression` | ^1.8.1 | Response compression |
| `nodemailer` | ^7.0.10 | Email |
| `twilio` | ^5.10.6 | SMS/Voice |
| `ws` | ^8.18.0 | WebSocket |
| `zod` | ^3.24.2 | Validation |
| `pino` | ^10.1.0 | Logging |

### Radix UI Components (Frontend)

All `@radix-ui/react-*` packages: accordion, alert-dialog, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.6.3 | Type checking |
| `vite` | ^5.4.20 | Build tool |
| `@vitejs/plugin-react` | ^4.7.0 | React plugin |
| `tailwindcss` | ^3.4.17 | CSS framework |
| `drizzle-kit` | ^0.31.4 | DB migrations |
| `tsx` | ^4.20.5 | TS execution |
| `esbuild` | ^0.25.0 | Bundler |

---

## 4. API ENDPOINTS

### Authentication

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/auth/session` | Get current user session | - | `{ user: User }` |

### User Management

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/user` | Get current user | - | `User` |
| PATCH | `/api/user` | Update user profile | `{ ...fields }` | `User` |
| PATCH | `/api/user/persona` | Update AI persona | `{ persona: string }` | `{ success, persona }` |
| GET | `/api/user/usage` | Get usage stats | - | `{ messageCount, callDuration, premiumUser, ...limits }` |
| POST | `/api/user/usage` | Increment usage | `{ incrementMessages?, incrementCallSeconds? }` | `{ messageCount, callDuration }` |
| GET | `/api/user/summary` | Get user summary | - | `UserSummaryLatest` |

### Sessions

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/api/session` | Create/get session | `{ type?: 'chat' \| 'call' }` | `Session` |
| POST | `/api/session/end` | End session | `{ sessionId }` | `{ success }` |
| GET | `/api/sessions` | Get all sessions | - | `Session[]` (with previews) |
| GET | `/api/sessions/:sessionId` | Get session detail | - | `{ session, messages }` |
| GET | `/api/sessions/:sessionId/messages` | Get session messages | - | `Message[]` |
| GET | `/api/sessions/history` | Get session history | - | `Session[]` |

### Chat

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/api/chat` | Send message (streaming SSE) | `{ content, sessionId?, userId? }` | SSE stream: `{ content, done, sessionId, messageCount }` |
| GET | `/api/messages` | Get messages for session | `?sessionId=uuid` | `Message[]` |
| POST | `/api/messages` | Save message | `{ session_id, role, text, tag? }` | `Message` |

### Voice Calling

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/call/config` | Get Vapi config | - | `{ ready, publicKey }` |
| POST | `/api/call/start` | Start call session | `{ vapiCallId?, metadata? }` | `CallSession` |
| POST | `/api/call/end` | End call session | `{ sessionId?, vapiCallId?, durationSeconds?, transcript? }` | `{ success, durationSeconds }` |
| GET | `/api/call/history` | Get call history | - | `CallSession[]` |
| POST | `/api/call/webhook` | Vapi webhook | Vapi payload | `{ received: true }` |

### User Summary (Cumulative Insights)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/user-summary/:userId` | Get cumulative summary | - | `{ success, summary }` |
| POST | `/api/user-summary/:userId/generate` | Trigger summary generation | - | `{ success, summary, stats }` |
| GET | `/api/user-summary/:userId/progression` | Get understanding progression | - | `{ success, progression, currentLevel, ... }` |
| GET | `/api/user-summary/:userId/stats` | Get quick stats | - | `{ success, stats }` |

### Personas

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/personas` | Get all persona configs | - | `PersonaConfigs` |

### Payments

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/payment/config` | Get payment config | - | `{ cashfreeMode, currency, plans }` |
| POST | `/api/payment/create-order` | Create payment order | `{ planType }` | Order details |

### Health

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/health` | Health check | - | `{ status: 'ok', timestamp }` |

---

## 5. DATABASE SCHEMA

### Tables Overview

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `users` | User accounts | `id` (uuid) |
| `sessions` | Chat/call sessions | `id` (uuid) |
| `messages` | Chat messages | `id` (uuid) |
| `calls` | Call records | `id` (uuid) |
| `usage_stats` | Usage limits | `user_id` (uuid) |
| `user_summary_latest` | Cached summary | `user_id` (uuid) |
| `subscriptions` | Premium plans | `id` (uuid) |
| `payments` | Payment records | `id` (uuid) |
| `otp_logins` | OTP verification | `id` (uuid) |
| `notification_tokens` | Push tokens | `id` (uuid) |
| `user_memories` | Memory system | `id` (uuid) |
| `engagement_triggers` | Proactive messages | `id` (uuid) |
| `user_emotional_states` | Mood tracking | `id` (uuid) |
| `conversation_tags` | Conversation tags | `id` (uuid) |
| `relationship_depth` | Relationship stage | `id` (uuid) |
| `advanced_memories` | 4-layer memory | `id` (uuid) |
| `avatar_configurations` | Avatar settings | `id` (uuid) |
| `avatar_interactions` | Avatar events | `id` (uuid) |
| `visual_content` | Media content | `id` (uuid) |
| `unlocked_content` | Unlocked media | `id` (uuid) |

### Core Tables - Detailed Schema

#### users
```sql
id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
phone_number          text
name                  text
email                 text UNIQUE
gender                gender_enum
premium_user          boolean DEFAULT false
proactivity_level     text DEFAULT 'medium'
check_in_enabled      boolean DEFAULT true
voice_provider        text DEFAULT 'sarvam'
voice_id              text DEFAULT 'meera'
elevenlabs_api_key    text
age                   integer
city                  text
occupation            text
relationship_status   text
registration_date     timestamptz DEFAULT now()
locale                text DEFAULT 'hi-IN'
persona               persona_enum DEFAULT 'sweet_supportive'
persona_prompt        jsonb
onboarding_complete   boolean DEFAULT false
created_at            timestamptz DEFAULT now()
updated_at            timestamptz DEFAULT now()
```

#### sessions
```sql
id                      uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
type                    session_type_enum DEFAULT 'chat'
started_at              timestamptz DEFAULT now()
ended_at                timestamptz
confidence_score        numeric(4,2)
persona_snapshot        jsonb DEFAULT '{}'
love_language_guess     text
communication_fit       text
partner_type_one_liner  text
top_3_traits_you_value  text[]
what_you_might_work_on  text[]
next_time_focus         text[]
created_at              timestamptz DEFAULT now()
updated_at              timestamptz DEFAULT now()
```

#### messages
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
role        message_role_enum NOT NULL   -- 'user' | 'ai'
tag         message_tag_enum DEFAULT 'general'
text        text NOT NULL
created_at  timestamptz DEFAULT now()
```

#### usage_stats
```sql
user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
total_messages      integer DEFAULT 0
total_call_seconds  integer DEFAULT 0
updated_at          timestamptz DEFAULT now()
```

#### user_summary_latest
```sql
user_id               uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
partner_type_one_liner text
top_3_traits_you_value text[]
what_you_might_work_on text[]
next_time_focus        text[]
love_language_guess    text
communication_fit      text
confidence_score       numeric(4,2)
updated_at             timestamptz DEFAULT now()
```

### Enums

```sql
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE session_type_enum AS ENUM ('chat', 'call');
CREATE TYPE message_role_enum AS ENUM ('user', 'ai');
CREATE TYPE message_tag_enum AS ENUM ('general', 'evaluation');
CREATE TYPE plan_type_enum AS ENUM ('daily', 'weekly');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'success', 'failed');
CREATE TYPE call_status_enum AS ENUM ('started', 'in_progress', 'completed', 'failed', 'aborted');
CREATE TYPE persona_enum AS ENUM ('sweet_supportive', 'playful_teasing', 'mature_mentor', 'casual_chill');
```

---

## 6. SUPABASE SETUP

### Edge Functions Deployed

| Function | Path | Purpose | Trigger |
|----------|------|---------|---------|
| `chat` | `/functions/chat` | Chat with AI (alternative to Express) | HTTP POST |
| `generate-user-summary` | `/functions/generate-user-summary` | Generate cumulative insights | HTTP POST / Internal |
| `vapi-webhook` | `/functions/vapi-webhook` | Handle Vapi call events | Vapi Webhook |

### Edge Function Environment Variables (Set in Supabase Dashboard)

```
SUPABASE_URL=<auto-injected>
SUPABASE_SERVICE_ROLE_KEY=<auto-injected>
GROQ_API_KEY=<your-groq-key>
```

### Database Policies (Row Level Security)

Currently uses service role key for all operations. For production, add RLS policies:

```sql
-- Example: Users can only read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Auth Configuration

- Currently: No Supabase Auth (Express session-based)
- Migration: Can enable Supabase Auth with email/phone

---

## 7. LOCAL SETUP INSTRUCTIONS

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (free tier)
- Groq API key (free at console.groq.com)

### Step-by-Step Setup

```bash
# 1. Clone/Download project
git clone <your-repo>
cd riya-ai-companion

# 2. Install dependencies
npm install

# 3. Create .env.local file
cat > .env.local << 'EOF'
SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
GROQ_API_KEY=<your-groq-key>
VAPI_PUBLIC_KEY=<optional>
VITE_VAPI_PUBLIC_KEY=<optional>
EOF

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:5000
```

### What Each Command Does

| Command | Purpose |
|---------|---------|
| `npm run dev` | Starts Express + Vite dev server on port 5000 |
| `npm run build` | Builds production frontend + backend |
| `npm run start` | Runs production server |
| `npm run db:push` | Syncs Drizzle schema to database |

---

## 8. PERSONA CONFIGURATIONS

The app supports 4 AI persona types:

```typescript
const PERSONA_CONFIGS = {
  sweet_supportive: {
    name: "Riya",
    description: "Warm, caring, emotionally intelligent girlfriend",
    style: "Affectionate and nurturing",
    traits: ["empathetic", "caring", "warm", "supportive"],
    hindiMix: 0.35  // 35% Hindi words
  },
  playful_teasing: {
    name: "Riya",
    description: "Playful, flirty, teasing girlfriend",
    style: "Fun and mischievous",
    traits: ["playful", "witty", "flirty", "energetic"],
    hindiMix: 0.30
  },
  mature_mentor: {
    name: "Riya",
    description: "Wise, thoughtful, guiding companion",
    style: "Thoughtful and insightful",
    traits: ["wise", "calm", "thoughtful", "guiding"],
    hindiMix: 0.25
  },
  casual_chill: {
    name: "Riya",
    description: "Relaxed, easygoing friend",
    style: "Casual and laid-back",
    traits: ["relaxed", "friendly", "chill", "honest"],
    hindiMix: 0.40
  }
};
```

---

## 9. BUSINESS LOGIC

### Free User Limits

- **Messages**: 20 messages total
- **Voice Calls**: 2 min 15 sec (135 seconds) total
- **Warning**: Shown at 1:50 before call limit

### Session Timeout

- Sessions expire after **15 minutes** of inactivity
- New session created automatically after timeout
- AI receives context from ALL previous sessions

### Understanding Level Calculation

```javascript
// Starts at 25%, max 75%
// Diminishing returns: early sessions contribute more
function calculateUnderstandingLevel(sessionCount) {
  if (sessionCount <= 0) return 0;
  
  let level = 25; // Base level
  
  for (let session = 2; session <= sessionCount; session++) {
    let increment;
    if (session === 2) increment = 10;
    else if (session <= 4) increment = 5;
    else if (session <= 6) increment = 2.5;
    else if (session <= 8) increment = 1.5;
    else if (session <= 10) increment = 1;
    else if (session <= 14) increment = 0.5;
    else if (session <= 20) increment = 0.25;
    else increment = 0.1;
    
    level += increment;
    if (level >= 75) return 75;
  }
  
  return level;
}
```

### Summary Generation Trigger

- Triggered every 5 messages
- Also triggered on first message
- Runs asynchronously (doesn't block chat)

---

## 10. MIGRATION ROADMAP

### Phase 1: Keep Backend, Deploy Frontend Only (Simplest)

1. Build frontend: `npm run build`
2. Deploy `client/dist/` to Vercel/Netlify
3. Keep Replit running as backend API
4. Point frontend to Replit backend URL

### Phase 2: Move to Supabase Edge Functions (Full Independence)

**Order of Migration:**

1. ✅ Database already on Supabase
2. Move `POST /api/chat` → Edge Function `chat`
3. Move `GET/POST /api/user-summary` → Edge Functions
4. Move `GET/POST /api/session` → Edge Functions
5. Move `GET /api/messages` → Edge Functions
6. Move `/api/call/*` → Edge Functions
7. Delete Express server

**For each endpoint:**

```typescript
// Express route
app.post('/api/chat', async (req, res) => {
  // logic here
});

// Becomes Supabase Edge Function
serve(async (req) => {
  // Same logic, using Deno.env instead of process.env
});
```

### Phase 3: Frontend Updates

Change API calls from:
```typescript
await fetch('/api/chat', { ... });
```

To:
```typescript
await supabase.functions.invoke('chat', { body: { ... } });
```

---

## 11. KEY FILES FOR MIGRATION

### Essential Files to Export

```
client/                 # Complete frontend
shared/schema.ts        # Data types
supabase/functions/     # Edge Functions (already exist)
package.json
package-lock.json
vite.config.ts
tailwind.config.ts
tsconfig.json
postcss.config.js
components.json
```

### Server Logic to Convert

```
server/routes/chat.ts           # Main chat logic
server/routes/supabase-api.ts   # User/session CRUD
server/routes/call.ts           # Voice calls
server/routes/user-summary.ts   # Insights API
server/lib/contextBuilder.ts    # AI memory
server/lib/sessionManager.ts    # Session timeout
server/supabase.ts              # Persona configs
```

---

## 12. TESTING CHECKLIST

Before going live:

- [ ] Chat works (send message, receive response)
- [ ] Messages persist in database
- [ ] Session timeout works (15 min)
- [ ] Paywall triggers at 20 messages
- [ ] Voice calls work (if enabled)
- [ ] Summary page shows insights
- [ ] History page shows past sessions
- [ ] All pages render correctly
- [ ] Mobile responsive
- [ ] Dark mode works

---

## 13. COST BREAKDOWN

| Service | Free Tier | Paid |
|---------|-----------|------|
| Supabase | 500MB DB, 50K Edge calls | $25/mo |
| Groq | Free tier available | Usage-based |
| Vercel | 100GB bandwidth | $20/mo |
| Vapi | Limited calls | Usage-based |

**Minimum viable: $0/month** (free tiers)

---

## Questions?

This documentation covers everything needed to migrate independently. For specific implementation help, refer to the individual file contents in the codebase.

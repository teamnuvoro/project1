# Persona System Database Storage Analysis

## Overview
This document analyzes how the database stores sessions and messages with the new persona system compared to the previous single "Riya" persona system.

---

## 🔴 BEFORE: Single Persona System (Old)

### Users Table
```sql
users (
  id UUID,
  persona persona_enum DEFAULT 'sweet_supportive',  -- Only one persona type
  persona_prompt JSONB,  -- Optional custom prompt override
  ...
)
```

**Persona Enum (Old):**
- `sweet_supportive` (Riya - default)
- `playful_flirty` (Meera)
- `bold_confident` (Aisha)
- `calm_mature` (Kavya)

**Storage Pattern:**
- Each user had ONE persona stored in `users.persona`
- All messages from that user used the same persona
- No per-message persona tracking
- Sessions had a `persona_snapshot` JSONB field (captured at session end)

### Sessions Table
```sql
sessions (
  id UUID,
  user_id UUID,
  persona_snapshot JSONB,  -- Captured at END of session
  ...
)
```

**What was stored:**
- `persona_snapshot`: A JSONB snapshot of the persona configuration at the END of the session
- This was used for session summaries and analysis
- Not used during message generation

### Messages Table
```sql
messages (
  id UUID,
  session_id UUID,
  user_id UUID,
  role message_role_enum,  -- 'user' or 'ai'
  text TEXT,
  tag message_tag_enum,
  image_url TEXT,  -- Added later for image sharing
  created_at TIMESTAMPTZ,
  -- NO persona_id column
)
```

**What was stored:**
- No persona information per message
- Persona was inferred from `users.persona` at query time
- All messages in a session used the same persona (user's default)

---

## 🟢 NOW: Multi-Persona System (New)

### Users Table
```sql
users (
  id UUID,
  persona persona_enum DEFAULT 'sweet_supportive',  -- User's DEFAULT persona
  persona_prompt JSONB,  -- Still exists but not used by new system
  ...
)
```

**Persona Enum (New - Backward Compatible):**
- Still uses old enum values: `sweet_supportive`, `playful_flirty`, `bold_confident`, `calm_mature`
- New system maps these to new persona IDs:
  - `playful_flirty` → `flirtatious` (new system)
  - `bold_confident` → `dominant` (new system)
  - `sweet_supportive` → `sweet_supportive` (same)
  - `calm_mature` → `calm_mature` (same)

**Storage Pattern:**
- `users.persona` stores the user's DEFAULT/LAST SELECTED persona
- This is used as a fallback if no persona_id is provided in the request
- The new persona system loads persona definitions from CODE (not database)

### Sessions Table
```sql
sessions (
  id UUID,
  user_id UUID,
  persona_snapshot JSONB,  -- Still exists, captured at session end
  ...
)
```

**What's stored:**
- `persona_snapshot`: Still captured at session end (for backward compatibility)
- However, sessions can now contain messages from MULTIPLE personas
- The snapshot represents the "primary" persona used in that session

### Messages Table
```sql
messages (
  id UUID,
  session_id UUID,
  user_id UUID,
  role message_role_enum,
  text TEXT,
  tag message_tag_enum,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  persona_id TEXT,  -- ⚠️ ATTEMPTED BUT COLUMN MAY NOT EXIST
)
```

**Current Implementation:**
- Code ATTEMPTS to save `persona_id` to messages (see `server/routes/chat.ts:712`)
- However, the column may not exist in the database yet
- Code gracefully degrades if column doesn't exist (wrapped in try-catch)
- **This is a MISSING MIGRATION** - the column should be added

**What SHOULD be stored:**
- `persona_id`: The persona ID used to generate THIS specific message
- This allows:
  - Tracking which persona generated each response
  - Filtering messages by persona
  - Analytics on persona usage
  - Replaying conversations with the correct persona context

---

## 🔄 Key Differences

### 1. **Persona Storage Location**

| Aspect | Before | Now |
|--------|--------|-----|
| **Persona Definition** | Hardcoded in prompts | Data-driven in code (`server/personas/`) |
| **User's Persona** | `users.persona` (single value) | `users.persona` (default, can change per message) |
| **Message Persona** | Inferred from `users.persona` | Should be stored in `messages.persona_id` (missing) |
| **Session Persona** | `sessions.persona_snapshot` (end of session) | `sessions.persona_snapshot` (still exists, but less relevant) |

### 2. **Message Generation**

| Aspect | Before | Now |
|--------|--------|-----|
| **Persona Selection** | Always used `users.persona` | Can use `persona_id` from request OR `users.persona` as fallback |
| **Per-Message Persona** | Not possible | Possible (user can switch personas mid-conversation) |
| **Persona Context** | Static prompt | Dynamic prompt composed from persona data |
| **Memory Filtering** | No filtering | Persona-aware memory filtering (based on persona's memory policy) |

### 3. **Database Schema Changes**

| Table | Column | Status | Notes |
|-------|--------|--------|-------|
| `users` | `persona` | ✅ Exists | Stores user's default persona (backward compatible) |
| `sessions` | `persona_snapshot` | ✅ Exists | Still captured, but less critical |
| `messages` | `persona_id` | ⚠️ **MISSING** | Code tries to save it, but column doesn't exist |

---

## 🚨 Missing Migration

The code attempts to save `persona_id` to messages, but the column doesn't exist:

```typescript
// server/routes/chat.ts:712
try {
  messageData.persona_id = persona.id;
} catch (e) {
  // Column might not exist, that's okay
}
```

**Required Migration:**
```sql
-- Add persona_id column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS persona_id VARCHAR(50);

-- Create index for persona queries
CREATE INDEX IF NOT EXISTS idx_messages_persona_id 
ON messages(persona_id) 
WHERE persona_id IS NOT NULL;
```

---

## 📊 Current Storage Flow

### When a User Sends a Message:

1. **Request arrives** with optional `persona_id`
2. **Persona resolution:**
   ```
   persona_id = request.persona_id || user.persona || 'sweet_supportive'
   ```
3. **Persona loaded from code:**
   - Persona definitions live in `server/personas/*.ts`
   - NOT stored in database
   - Loaded dynamically at runtime
4. **Message saved:**
   ```typescript
   {
     session_id: sessionId,
     user_id: userId,
     role: 'ai',
     text: processedResponse,
     persona_id: persona.id  // ⚠️ Attempted but may fail silently
   }
   ```
5. **User message saved:**
   ```typescript
   {
     session_id: sessionId,
     user_id: userId,
     role: 'user',
     text: content,
     // No persona_id (user messages don't have persona)
   }
   ```

### When Retrieving Messages:

1. **Messages fetched** by `session_id`
2. **Persona context:**
   - If `persona_id` column exists: Use it to determine which persona generated each AI message
   - If missing: Infer from `users.persona` (assumes all messages used same persona)
3. **Memory adaptation:**
   - Uses persona's `memory_policy` to filter/prioritize messages
   - Different personas have different memory windows and retention rules

---

## 🎯 Recommendations

### 1. **Add Missing Migration**
Create a migration to add `persona_id` column to `messages` table.

### 2. **Update Sessions Table**
Consider adding `default_persona_id` to sessions to track the primary persona used.

### 3. **Backfill Existing Data**
If `persona_id` column is added, backfill existing messages:
```sql
UPDATE messages
SET persona_id = (
  SELECT persona FROM users WHERE users.id = messages.user_id
)
WHERE persona_id IS NULL AND role = 'ai';
```

### 4. **Analytics Enhancement**
With `persona_id` on messages, you can:
- Track persona usage per user
- Analyze which personas generate better engagement
- Filter conversation history by persona
- Generate persona-specific summaries

---

## 📝 Summary

**Before:**
- Single persona per user (stored in `users.persona`)
- All messages used the same persona
- Persona was hardcoded in prompts

**Now:**
- Multiple personas available (defined in code)
- Users can switch personas per message
- Persona definitions are data-driven (not in database)
- Persona context is applied dynamically
- **Missing:** `persona_id` column in `messages` table to track which persona generated each message

**Key Insight:**
The new system is **code-driven** (personas live in TypeScript files) but **database-tracked** (which persona was used per message). The database tracks usage, but the persona definitions themselves are in the codebase, making them easier to version control and update.



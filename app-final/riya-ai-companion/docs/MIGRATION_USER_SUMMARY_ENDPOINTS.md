# Migration Guide: /api/user-summary → Supabase Edge Functions

## Overview

This document shows how to migrate all user-summary endpoints from Express to Supabase Edge Functions.

---

## 1. ENDPOINTS MIGRATED

| Express Route | Edge Function URL |
|---------------|-------------------|
| `GET /api/user-summary/:userId` | `GET /functions/v1/user-summary/{userId}` |
| `POST /api/user-summary/:userId/generate` | `POST /functions/v1/user-summary/{userId}/generate` |
| `GET /api/user-summary/:userId/progression` | `GET /functions/v1/user-summary/{userId}/progression` |
| `GET /api/user-summary/:userId/stats` | `GET /functions/v1/user-summary/{userId}/stats` |

---

## 2. DEPLOY TO SUPABASE

```bash
# Deploy the function
supabase functions deploy user-summary

# No additional secrets needed (uses auto-injected Supabase credentials)
```

---

## 3. FRONTEND CHANGES

### Create a User Summary API Client

```typescript
// client/src/lib/userSummaryApi.ts

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Fetch user's cumulative summary
 */
export async function getUserSummary(userId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/user-summary/${userId}`,
    { headers }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch summary');
  }
  
  return data.summary;
}

/**
 * Trigger summary generation
 */
export async function generateUserSummary(userId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/user-summary/${userId}/generate`,
    { 
      method: 'POST',
      headers 
    }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate summary');
  }
  
  return {
    summary: data.summary,
    stats: data.stats
  };
}

/**
 * Get understanding level progression
 */
export async function getUnderstandingProgression(userId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/user-summary/${userId}/progression`,
    { headers }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch progression');
  }
  
  return {
    progression: data.progression,
    currentLevel: data.currentLevel,
    nextIncrement: data.nextIncrement,
    maxLevel: data.maxLevel,
    sessionsToMax: data.sessionsToMax
  };
}

/**
 * Get quick stats
 */
export async function getUserStats(userId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/user-summary/${userId}/stats`,
    { headers }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch stats');
  }
  
  return data.stats;
}
```

### Update Components

#### BEFORE (Express API):

```typescript
// SummaryPage.tsx
const { data: summary } = useQuery({
  queryKey: ['/api/user-summary', userId],
});
```

#### AFTER (Edge Function):

```typescript
// SummaryPage.tsx
import { getUserSummary } from '@/lib/userSummaryApi';

const { data: summary } = useQuery({
  queryKey: ['user-summary', userId],
  queryFn: () => getUserSummary(userId),
  enabled: !!userId,
});
```

### Using with TanStack Query

```typescript
// client/src/hooks/useUserSummary.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserSummary, 
  generateUserSummary, 
  getUnderstandingProgression,
  getUserStats 
} from '@/lib/userSummaryApi';

export function useUserSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-summary', userId],
    queryFn: () => getUserSummary(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useGenerateSummary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => generateUserSummary(userId),
    onSuccess: (data, userId) => {
      // Invalidate and refetch summary
      queryClient.invalidateQueries({ queryKey: ['user-summary', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats', userId] });
    },
  });
}

export function useUnderstandingProgression(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-progression', userId],
    queryFn: () => getUnderstandingProgression(userId!),
    enabled: !!userId,
  });
}

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => getUserStats(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}
```

---

## 4. RESPONSE FORMATS

### GET /{userId} - Summary Response

```json
{
  "success": true,
  "summary": {
    "id": "uuid",
    "user_id": "uuid",
    "cumulative_summary": "A warm, caring person who values...",
    "ideal_partner_type": "Someone understanding...",
    "user_personality_traits": ["caring", "thoughtful", "humorous"],
    "communication_style": "warm and expressive",
    "emotional_needs": ["support", "understanding"],
    "values": ["honesty", "loyalty"],
    "interests": ["music", "travel"],
    "relationship_expectations": "Looking for genuine connection",
    "what_to_explore": ["goals", "dreams"],
    "suggested_conversation_starters": ["What made you smile today?"],
    "growth_areas": ["self-expression"],
    "understanding_level": 45,
    "total_sessions_count": 5,
    "total_messages_count": 52,
    "engagement_level": "high",
    "primary_conversation_theme": "relationships",
    "mood_pattern": "positive"
  }
}
```

### POST /{userId}/generate - Generate Response

```json
{
  "success": true,
  "summary": { /* same as above */ },
  "stats": {
    "sessions_analyzed": 5,
    "messages_analyzed": 52,
    "understanding_level": 47.5
  },
  "message": "User summary generated successfully"
}
```

### GET /{userId}/progression - Progression Response

```json
{
  "success": true,
  "progression": [
    { "session": 1, "level": 25, "increment": 0 },
    { "session": 2, "level": 35, "increment": 10 },
    { "session": 3, "level": 40, "increment": 5 },
    { "session": 4, "level": 45, "increment": 5 },
    { "session": 5, "level": 47.5, "increment": 2.5 }
  ],
  "currentLevel": 47.5,
  "nextIncrement": 2.5,
  "maxLevel": 75,
  "sessionsToMax": 25
}
```

### GET /{userId}/stats - Stats Response

```json
{
  "success": true,
  "stats": {
    "understandingLevel": 47.5,
    "totalSessions": 5,
    "totalMessages": 52,
    "engagementLevel": "high",
    "lastAnalyzed": "2025-01-15T10:30:00Z",
    "nextSessionBonus": 2.5,
    "maxLevel": 75,
    "levelProgress": 63
  }
}
```

### Error Responses

```json
// 400 Bad Request
{ "success": false, "error": "Invalid user ID format. Expected UUID." }

// 404 Not Found
{ "success": false, "error": "No summary found for this user. Start chatting to generate insights!" }

// 500 Server Error
{ "success": false, "error": "Failed to fetch user summary. Please try again." }
```

---

## 5. TESTING

### Test with curl:

```bash
# Get summary
curl 'https://your-project.supabase.co/functions/v1/user-summary/USER_ID' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# Generate summary
curl -X POST 'https://your-project.supabase.co/functions/v1/user-summary/USER_ID/generate' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# Get progression
curl 'https://your-project.supabase.co/functions/v1/user-summary/USER_ID/progression' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# Get stats
curl 'https://your-project.supabase.co/functions/v1/user-summary/USER_ID/stats' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

---

## 6. UNDERSTANDING LEVEL LOGIC

The Edge Function includes the full understanding level calculator:

| Session | Level | Increment | Description |
|---------|-------|-----------|-------------|
| 1 | 25% | - | Base understanding |
| 2 | 35% | +10 | Major jump (basics) |
| 3-4 | +5 each | +5 | Core understanding |
| 5-6 | +2.5 each | +2.5 | Deepening insights |
| 7-8 | +1.5 each | +1.5 | Fine-tuning |
| 9-10 | +1 each | +1 | Nuanced understanding |
| 11-14 | +0.5 each | +0.5 | Subtle refinements |
| 15-20 | +0.25 each | +0.25 | Micro-adjustments |
| 21+ | +0.1 each | +0.1 | Approaching limit |
| Max | 75% | - | AI can never fully understand humans |

---

## 7. MIGRATION CHECKLIST

- [ ] Deploy Edge Function: `supabase functions deploy user-summary`
- [ ] Create `userSummaryApi.ts` client
- [ ] Update SummaryPage to use new API
- [ ] Update any hooks using user-summary
- [ ] Test all 4 endpoints
- [ ] Remove Express routes when ready

---

## 8. ROLLBACK

If issues occur, point frontend back to Express:

```typescript
// Rollback: use Express API
const response = await fetch(`/api/user-summary/${userId}`);
```

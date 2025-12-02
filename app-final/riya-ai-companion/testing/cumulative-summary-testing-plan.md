# Cumulative Summary System Testing Plan

## Overview
This document provides comprehensive testing procedures for the cumulative summary system including database, API, frontend, and integration testing.

---

## 1. Database Testing

### 1.1 Check Table Exists
```sql
-- Run in Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_cumulative_summary';
```
**Expected:** Returns 1 row with `user_cumulative_summary`

### 1.2 Check Table Schema
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_cumulative_summary'
ORDER BY ordinal_position;
```
**Expected:** 23 columns including id, user_id, cumulative_summary, understanding_level, etc.

### 1.3 Insert Test Data
```sql
-- Insert test user first (if not exists)
INSERT INTO users (id, name, email, gender)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test@example.com', 'male')
ON CONFLICT (id) DO NOTHING;

-- Insert test summary
INSERT INTO user_cumulative_summary (
  user_id,
  cumulative_summary,
  ideal_partner_type,
  user_personality_traits,
  communication_style,
  emotional_needs,
  values,
  interests,
  understanding_level,
  total_sessions_count,
  total_messages_count,
  engagement_level
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test user is exploring relationship topics with curiosity.',
  'Someone warm and supportive',
  ARRAY['Curious', 'Thoughtful', 'Caring'],
  'Open and expressive',
  ARRAY['Emotional support', 'Understanding'],
  ARRAY['Trust', 'Honesty'],
  ARRAY['Music', 'Travel'],
  35,
  2,
  12,
  'engaged'
);
```

### 1.4 Verify Data Inserted
```sql
SELECT * FROM user_cumulative_summary 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```
**Expected:** Returns the inserted row with all fields populated

### 1.5 Test Understanding Level Update
```sql
UPDATE user_cumulative_summary
SET understanding_level = 45,
    total_sessions_count = 4,
    updated_at = NOW()
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

SELECT understanding_level, total_sessions_count, updated_at
FROM user_cumulative_summary
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```
**Expected:** understanding_level = 45, total_sessions_count = 4

### 1.6 Cleanup Test Data
```sql
DELETE FROM user_cumulative_summary 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

DELETE FROM users 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 2. API Testing (curl commands)

### 2.1 Health Check
```bash
curl -X GET http://localhost:5000/api/health
```
**Expected:** `{"status":"ok","timestamp":"..."}`

### 2.2 Get User Summary (No Data)
```bash
curl -X GET http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000
```
**Expected:** `{"success":false,"error":"No summary found for this user. Start chatting to generate insights!"}`

### 2.3 Get User Summary (With Data)
```bash
# First insert test data via SQL (section 1.3), then:
curl -X GET http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000
```
**Expected:** 
```json
{
  "success": true,
  "summary": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "understanding_level": 35,
    "cumulative_summary": "Test user is exploring...",
    ...
  }
}
```

### 2.4 Get Progression
```bash
curl -X GET http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000/progression
```
**Expected:**
```json
{
  "success": true,
  "progression": [
    {"session": 1, "level": 25, "increment": 0},
    {"session": 2, "level": 35, "increment": 10}
  ],
  "currentLevel": 35,
  "nextIncrement": 5,
  "maxLevel": 75,
  "sessionsToMax": 89
}
```

### 2.5 Get Stats
```bash
curl -X GET http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000/stats
```
**Expected:**
```json
{
  "success": true,
  "stats": {
    "understandingLevel": 35,
    "totalSessions": 2,
    "totalMessages": 12,
    "engagementLevel": "engaged",
    "nextSessionBonus": 5,
    "maxLevel": 75,
    "levelProgress": 47
  }
}
```

### 2.6 Trigger Summary Generation
```bash
curl -X POST http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000/generate \
  -H "Content-Type: application/json"
```
**Expected:** (depends on Edge Function availability)
- Success: `{"success":true,"summary":{...},"stats":{...}}`
- No messages: `{"success":false,"error":"Not enough messages..."}`

### 2.7 Invalid User ID Format
```bash
curl -X GET http://localhost:5000/api/user-summary/invalid-id
```
**Expected:** `{"success":false,"error":"Invalid user ID format. Expected UUID."}`

---

## 3. Frontend Testing

### 3.1 Manual UI Testing Checklist

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page Load | Navigate to `/tracker` | Page loads without errors |
| Loading State | Observe initial load | Skeleton placeholders appear briefly |
| Error State (No User) | Load without auth | "Unable to load your insights" message |
| Error State (No Data) | Load with auth, no data | "Start chatting to build your profile" message |
| Retry Button | Click "Retry" on error | Page attempts to refetch data |
| Progress Ring | Load with data | Circular progress shows correct percentage |
| Progress Ring Animation | Load page | Ring animates to fill level |
| Summary Cards | Load with data | 6 cards display with icons and content |
| Empty Card State | Load with partial data | Missing data shows "Not yet determined" |
| Personality Traits | Load with traits | Purple badges with sparkle icons |
| Emotional Needs | Load with needs | Blue badges with heart icons |
| Values | Load with values | Green badges with target icons |
| Interests | Load with interests | Orange badges with star icons |
| Exploration Box | Load with topics | List items with arrow bullets |
| Stats Footer | Load with data | 4 stat boxes show correct values |
| Dark Mode | Toggle theme | All elements adapt colors correctly |
| Mobile Layout | Resize to mobile | Cards stack, scroll works |
| Navigation | Click sidebar link | Page navigates correctly |

### 3.2 Console Error Check
1. Open browser DevTools (F12)
2. Navigate to `/tracker`
3. Check Console tab for errors
4. **Expected:** No red errors (warnings acceptable)

### 3.3 Network Request Check
1. Open DevTools Network tab
2. Navigate to `/tracker`
3. Look for `/api/user-summary/*` requests
4. **Expected:** Requests complete with 200 or 404 status

---

## 4. Integration Testing

### 4.1 End-to-End User Flow

**Prerequisites:**
- User account exists in database
- User is logged in
- Chat functionality working

**Test Steps:**

```
Step 1: Login
- Navigate to /login
- Enter credentials
- Verify redirect to /chat
- Note user_id from dev tools or session

Step 2: Initial State Check
- Navigate to /tracker
- Expected: "Start chatting to build your profile" or loading

Step 3: Send Initial Messages
- Navigate to /chat
- Send 5 messages:
  1. "Hi Riya!"
  2. "I'm looking for relationship advice"
  3. "I value honesty and trust"
  4. "I enjoy traveling and music"
  5. "What do you think about long-distance relationships?"
- Wait for Riya's responses

Step 4: Verify Summary Generation
- Wait 5-10 seconds for background processing
- Navigate to /tracker
- Expected: Understanding level shows 35%

Step 5: Verify Summary Content
- Check "Ideal Partner" card has content
- Check personality traits appear
- Check interests show "traveling", "music"
- Check values show "honesty", "trust"

Step 6: Continue Chatting
- Navigate back to /chat
- Send 5 more messages about relationship goals
- Wait for responses

Step 7: Verify Level Increase
- Navigate to /tracker
- Expected: Understanding level shows 40%
- Expected: More insights populated
- Expected: Timeline shows session history

Step 8: Check Progression
- Scroll to progression section
- Expected: Shows sessions 1-3 with levels 25→35→40
- Expected: Increment badges show +10, +5

Step 9: Verify Stats
- Check footer stats
- Expected: Sessions = 3
- Expected: Messages = 10+
- Expected: Updated timestamp is recent
```

### 4.2 Understanding Level Progression Test

| Sessions | Expected Level | Increment |
|----------|---------------|-----------|
| 1 | 25% | (base) |
| 2 | 35% | +10 |
| 3 | 40% | +5 |
| 4 | 45% | +5 |
| 5 | 47.5% | +2.5 |
| 6 | 50% | +2.5 |
| 7 | 51.5% | +1.5 |
| 8 | 53% | +1.5 |
| 9 | 54% | +1 |
| 10 | 55% | +1 |
| 20+ | 75% | (max) |

---

## 5. Error Scenario Testing

### 5.1 Network Errors
```bash
# Simulate by stopping server
# Then navigate to /tracker
```
**Expected:** Error state with "Unable to load" message and Retry button

### 5.2 Invalid User ID
```bash
curl -X GET http://localhost:5000/api/user-summary/not-a-uuid
```
**Expected:** 400 error with "Invalid user ID format"

### 5.3 Database Connection Error
```bash
# Temporarily set invalid SUPABASE_URL
# Then call API
```
**Expected:** 500 error with "Failed to fetch user summary"

### 5.4 Edge Function Timeout
```bash
# Call generate with very large message history
curl -X POST http://localhost:5000/api/user-summary/USER_ID/generate
```
**Expected:** Timeout handled gracefully, error message returned

### 5.5 Unauthorized Access
```bash
# In production with different session user
curl -X GET http://localhost:5000/api/user-summary/OTHER_USER_ID
```
**Expected:** 403 error with "Access denied"

---

## 6. Quick Verification Commands

### Run All API Tests
```bash
# Create test script
echo "Testing Cumulative Summary APIs..."
echo ""
echo "1. Health Check:"
curl -s http://localhost:5000/api/health | jq .
echo ""
echo "2. Get Summary (expect 404):"
curl -s http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000 | jq .
echo ""
echo "3. Get Progression:"
curl -s http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000/progression | jq .
echo ""
echo "4. Get Stats:"
curl -s http://localhost:5000/api/user-summary/550e8400-e29b-41d4-a716-446655440000/stats | jq .
echo ""
echo "5. Invalid ID (expect 400):"
curl -s http://localhost:5000/api/user-summary/invalid | jq .
echo ""
echo "All tests complete!"
```

### Check Server Logs
```bash
# View recent user-summary logs
grep "user-summary" /tmp/logs/Start_application*.log | tail -20
```

---

## 7. Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|------------|
| API Response Time | < 200ms | < 500ms |
| Page Load Time | < 1s | < 2s |
| Summary Generation | < 5s | < 10s |
| Database Query | < 50ms | < 100ms |

---

## 8. Cleanup After Testing

```sql
-- Remove all test data
DELETE FROM user_cumulative_summary 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000',
  'test-user-id'
);

-- Reset understanding levels for dev testing
UPDATE user_cumulative_summary 
SET understanding_level = 25, 
    total_sessions_count = 1 
WHERE user_id = 'your-dev-user-id';
```

---

## Summary

| Test Category | Tests | Priority |
|--------------|-------|----------|
| Database | 6 | High |
| API | 7 | High |
| Frontend | 15+ | Medium |
| Integration | 9 | High |
| Error Handling | 5 | Medium |

**Total Tests:** 40+

Run this testing plan after deploying the cumulative summary system to ensure everything works correctly.

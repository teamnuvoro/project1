-- Fix Analytics Event Names Migration
-- This migration normalizes event names and backfills missing events from user creation/login data

-- 1. Update existing events to use standard names
UPDATE user_events
SET event_name = 'signup_started'
WHERE (event_name IS NULL OR event_name = '') 
  AND event_type = 'track'
  AND (path LIKE '%/signup%' OR path LIKE '%signup%');

UPDATE user_events
SET event_name = 'otp_verified'
WHERE (event_name IS NULL OR event_name = '') 
  AND event_type = 'track'
  AND (path LIKE '%/verify%' OR path LIKE '%otp%');

UPDATE user_events
SET event_name = 'login_successful'
WHERE (event_name IS NULL OR event_name = '') 
  AND event_type = 'track'
  AND (path LIKE '%/login%' OR event_name = 'login_completed');

-- 2. Backfill signup_started events from users table
-- Create signup_started events for users who don't have one
INSERT INTO user_events (user_id, event_name, event_type, path, created_at, event_properties)
SELECT 
  u.id as user_id,
  'signup_started' as event_name,
  'track' as event_type,
  '/signup' as path,
  u.created_at as created_at,
  jsonb_build_object('backfilled', true, 'source', 'user_creation') as event_properties
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_events e 
  WHERE e.user_id = u.id 
  AND (e.event_name = 'signup_started' OR e.event_name = 'signup_completed')
)
AND u.created_at IS NOT NULL;

-- 3. Backfill otp_verified events from users table (assume OTP was verified if user exists)
INSERT INTO user_events (user_id, event_name, event_type, path, created_at, event_properties)
SELECT 
  u.id as user_id,
  'otp_verified' as event_name,
  'track' as event_type,
  '/signup' as path,
  u.created_at + INTERVAL '30 seconds' as created_at,
  jsonb_build_object('backfilled', true, 'source', 'user_creation', 'attempt_count', 1) as event_properties
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_events e 
  WHERE e.user_id = u.id 
  AND (e.event_name = 'otp_verified' OR e.event_name = 'login_otp_success')
)
AND u.created_at IS NOT NULL;

-- 4. Backfill login_successful events for users with sessions
INSERT INTO user_events (user_id, event_name, event_type, path, created_at, event_properties)
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  'login_successful' as event_name,
  'track' as event_type,
  '/login' as path,
  s.created_at as created_at,
  jsonb_build_object(
    'backfilled', true,
    'source', 'session_creation',
    'returning_user', CASE 
      WHEN s.created_at > (SELECT MIN(created_at) FROM sessions s2 WHERE s2.user_id = s.user_id) + INTERVAL '1 day'
      THEN true 
      ELSE false 
    END
  ) as event_properties
FROM sessions s
WHERE NOT EXISTS (
  SELECT 1 FROM user_events e 
  WHERE e.user_id = s.user_id 
  AND (e.event_name = 'login_successful' OR e.event_name = 'login_completed')
  AND e.created_at >= s.created_at - INTERVAL '5 minutes'
  AND e.created_at <= s.created_at + INTERVAL '5 minutes'
)
AND s.user_id IS NOT NULL
ORDER BY s.user_id, s.created_at;

-- 5. Update returning_user_login events
UPDATE user_events
SET event_name = 'returning_user_login'
WHERE event_name = 'login_successful'
  AND (event_properties->>'returning_user')::boolean = true;

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_events_event_name_lower ON user_events(LOWER(event_name));
CREATE INDEX IF NOT EXISTS idx_user_events_created_at_user ON user_events(user_id, created_at DESC);


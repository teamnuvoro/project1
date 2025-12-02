-- ============================================
-- RIYA AI - ADD MISSING COLUMNS TO SUPABASE
-- Run this in Supabase SQL Editor
-- Project: xgraxcgavqeyqfwimbwt
-- ============================================

-- Step 1: Create the persona enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE persona_enum AS ENUM ('sweet_supportive', 'playful_flirty', 'bold_confident', 'calm_mature');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS persona persona_enum DEFAULT 'sweet_supportive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS persona_prompt JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Step 3: Add missing column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS persona_snapshot JSONB DEFAULT '{}'::jsonb;

-- Step 4: Create usage_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS usage_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_call_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 5: Enable RLS on usage_stats (safe to run multiple times)
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policy for usage_stats (drop first if exists to avoid error)
DROP POLICY IF EXISTS "Usage stats are accessible" ON usage_stats;
CREATE POLICY "Usage stats are accessible" ON usage_stats FOR ALL USING (true);

-- Step 7: Initialize usage stats for existing users
INSERT INTO usage_stats (user_id, total_messages, total_call_seconds)
SELECT id, 0, 0 FROM users
WHERE NOT EXISTS (SELECT 1 FROM usage_stats WHERE usage_stats.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- Done! Your Supabase database is now ready for Riya AI.
-- Note: Schema cache may take 1-2 minutes to refresh automatically.

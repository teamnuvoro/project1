-- Fix missing columns in usage_stats table
-- Run this SQL in your Supabase SQL Editor

-- Add call_duration_seconds column
ALTER TABLE usage_stats 
ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER DEFAULT 0;

-- Add last_call_at column (fixes crash in call/end endpoint)
ALTER TABLE usage_stats 
ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ DEFAULT NOW();

-- Reload schema cache (required for PostgREST)
NOTIFY pgrst, 'reload schema';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'usage_stats' 
AND column_name IN ('call_duration_seconds', 'last_call_at');

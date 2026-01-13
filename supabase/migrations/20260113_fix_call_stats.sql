-- Add missing columns to usage_stats to prevent call end crashes
ALTER TABLE usage_stats ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE usage_stats ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER DEFAULT 0;

-- Notify pgrst to reload schema so the new columns are detected
NOTIFY pgrst, 'reload schema';

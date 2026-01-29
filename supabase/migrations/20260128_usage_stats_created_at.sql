-- Add created_at to usage_stats if missing (fixes "Could not find the 'created_at' column" in schema cache)
ALTER TABLE usage_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- Ensure updated_at exists (some code paths expect it)
ALTER TABLE usage_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';

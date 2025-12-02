-- Add missing columns to sessions table for session management
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS total_messages_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_context JSONB;

-- Update existing sessions to have is_active based on ended_at
UPDATE sessions SET is_active = (ended_at IS NULL) WHERE is_active IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = true;

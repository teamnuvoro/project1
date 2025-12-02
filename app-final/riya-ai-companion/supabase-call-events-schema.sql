-- Supabase Call Events Schema
-- Run this in Supabase SQL Editor to create call tracking tables

-- Create call_status enum type
DO $$ BEGIN
    CREATE TYPE call_status AS ENUM ('started', 'in_progress', 'completed', 'failed', 'aborted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Call Sessions table - tracks Vapi-specific call data
CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vapi_call_id TEXT UNIQUE,
    status call_status NOT NULL DEFAULT 'started',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    transcript TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_at ON call_sessions(user_id, started_at DESC);

-- User Events table - tracks all user actions/events
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB,
    call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user events
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_occurred ON user_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_metadata ON user_events USING GIN (metadata);

-- Usage Stats table - tracks user usage for limiting free tier
CREATE TABLE IF NOT EXISTS usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    message_count INTEGER NOT NULL DEFAULT 0,
    call_duration_seconds INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_call_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for usage stats
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);

-- Function to update usage stats when a call ends
CREATE OR REPLACE FUNCTION update_call_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.duration_seconds IS NOT NULL THEN
        INSERT INTO usage_stats (user_id, call_duration_seconds, last_call_at)
        VALUES (NEW.user_id, NEW.duration_seconds, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            call_duration_seconds = usage_stats.call_duration_seconds + NEW.duration_seconds,
            last_call_at = NOW(),
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update usage stats when call session ends
DROP TRIGGER IF EXISTS trigger_update_call_usage ON call_sessions;
CREATE TRIGGER trigger_update_call_usage
    AFTER UPDATE OF status ON call_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_call_usage();

-- Enable RLS on new tables
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_sessions
CREATE POLICY "Users can view own call sessions" ON call_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

CREATE POLICY "Users can insert own call sessions" ON call_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

CREATE POLICY "Users can update own call sessions" ON call_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

-- RLS Policies for user_events
CREATE POLICY "Users can view own events" ON user_events
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

CREATE POLICY "Users can insert own events" ON user_events
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

-- RLS Policies for usage_stats
CREATE POLICY "Users can view own usage stats" ON usage_stats
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

CREATE POLICY "System can insert usage stats" ON usage_stats
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage stats" ON usage_stats
    FOR UPDATE USING (true);

-- Service role policy for webhooks
CREATE POLICY "Service role full access call_sessions" ON call_sessions
    FOR ALL USING (true);

CREATE POLICY "Service role full access user_events" ON user_events
    FOR ALL USING (true);

CREATE POLICY "Service role full access usage_stats" ON usage_stats
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON call_sessions TO authenticated;
GRANT ALL ON user_events TO authenticated;
GRANT ALL ON usage_stats TO authenticated;
GRANT ALL ON call_sessions TO service_role;
GRANT ALL ON user_events TO service_role;
GRANT ALL ON usage_stats TO service_role;

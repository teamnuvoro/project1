-- =====================================================
-- USER CUMULATIVE SUMMARY TABLE
-- Stores aggregated insights from all user chats
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing table if needed (comment out if you want to preserve data)
-- DROP TABLE IF EXISTS user_cumulative_summary CASCADE;

-- Create the user_cumulative_summary table
CREATE TABLE IF NOT EXISTS user_cumulative_summary (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to users table (unique per user)
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- AI-generated cumulative summary of all chats
    cumulative_summary TEXT,
    
    -- JSONB for storing all sessions context/metadata
    all_sessions_context JSONB,
    
    -- Relationship insights
    ideal_partner_type TEXT,
    user_personality_traits TEXT[],
    communication_style TEXT,
    emotional_needs TEXT[],
    values TEXT[],
    interests TEXT[],
    relationship_expectations TEXT,
    
    -- Exploration and growth
    what_to_explore TEXT[],
    suggested_conversation_starters TEXT[],
    growth_areas TEXT[],
    
    -- Metrics and levels
    understanding_level INTEGER DEFAULT 25 CHECK (understanding_level >= 0 AND understanding_level <= 100),
    total_sessions_count INTEGER DEFAULT 0,
    total_messages_count INTEGER DEFAULT 0,
    
    -- Engagement patterns
    engagement_level TEXT,
    primary_conversation_theme TEXT,
    mood_pattern TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_analysis_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_cumulative_summary_user_id 
    ON user_cumulative_summary(user_id);

CREATE INDEX IF NOT EXISTS idx_user_cumulative_summary_created_at 
    ON user_cumulative_summary(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_cumulative_summary_updated_at 
    ON user_cumulative_summary(updated_at DESC);

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_cumulative_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on row changes
DROP TRIGGER IF EXISTS trigger_update_user_cumulative_summary_updated_at ON user_cumulative_summary;
CREATE TRIGGER trigger_update_user_cumulative_summary_updated_at
    BEFORE UPDATE ON user_cumulative_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_user_cumulative_summary_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE user_cumulative_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own summary
CREATE POLICY "Users can view own cumulative summary"
    ON user_cumulative_summary
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own summary
CREATE POLICY "Users can insert own cumulative summary"
    ON user_cumulative_summary
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own summary
CREATE POLICY "Users can update own cumulative summary"
    ON user_cumulative_summary
    FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role full access to cumulative summary"
    ON user_cumulative_summary
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON user_cumulative_summary TO authenticated;
GRANT ALL ON user_cumulative_summary TO service_role;

-- Add table comment for documentation
COMMENT ON TABLE user_cumulative_summary IS 'Stores AI-generated cumulative insights from all user chat sessions';
COMMENT ON COLUMN user_cumulative_summary.cumulative_summary IS 'AI-generated summary of all user conversations';
COMMENT ON COLUMN user_cumulative_summary.all_sessions_context IS 'JSONB storing context from all chat sessions';
COMMENT ON COLUMN user_cumulative_summary.ideal_partner_type IS 'AI-inferred ideal partner type for the user';
COMMENT ON COLUMN user_cumulative_summary.user_personality_traits IS 'Array of identified personality traits';
COMMENT ON COLUMN user_cumulative_summary.communication_style IS 'Users preferred communication style';
COMMENT ON COLUMN user_cumulative_summary.emotional_needs IS 'Array of identified emotional needs';
COMMENT ON COLUMN user_cumulative_summary.values IS 'Array of core values identified from conversations';
COMMENT ON COLUMN user_cumulative_summary.interests IS 'Array of user interests and hobbies';
COMMENT ON COLUMN user_cumulative_summary.relationship_expectations IS 'What user expects from relationships';
COMMENT ON COLUMN user_cumulative_summary.what_to_explore IS 'Topics to explore in future conversations';
COMMENT ON COLUMN user_cumulative_summary.suggested_conversation_starters IS 'AI-suggested topics for next chat';
COMMENT ON COLUMN user_cumulative_summary.growth_areas IS 'Areas where user can grow in relationships';
COMMENT ON COLUMN user_cumulative_summary.understanding_level IS 'How well AI understands user (0-100%)';
COMMENT ON COLUMN user_cumulative_summary.total_sessions_count IS 'Total number of chat sessions';
COMMENT ON COLUMN user_cumulative_summary.total_messages_count IS 'Total messages across all sessions';
COMMENT ON COLUMN user_cumulative_summary.engagement_level IS 'User engagement level (low/medium/high)';
COMMENT ON COLUMN user_cumulative_summary.primary_conversation_theme IS 'Most common conversation topic';
COMMENT ON COLUMN user_cumulative_summary.mood_pattern IS 'Typical mood pattern in conversations';
COMMENT ON COLUMN user_cumulative_summary.last_analysis_at IS 'When the summary was last analyzed/updated by AI';

-- =====================================================
-- VERIFICATION QUERY
-- Run this after creating the table to verify structure
-- =====================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_cumulative_summary'
-- ORDER BY ordinal_position;

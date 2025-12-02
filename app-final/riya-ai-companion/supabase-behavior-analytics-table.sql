-- User Behavior Analytics Table for Riya AI Companion
-- Tracks user interaction patterns and behavioral insights

CREATE TABLE IF NOT EXISTS user_behavior_analytics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Interaction Metrics
  total_messages_sent INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_message_length INTEGER DEFAULT 0,
  avg_messages_per_session DECIMAL(5,2) DEFAULT 0,
  avg_response_time_seconds INTEGER DEFAULT 0,
  
  -- Engagement Patterns
  preferred_chat_hours JSONB DEFAULT '[]'::JSONB,
  most_active_days TEXT[] DEFAULT '{}',
  conversation_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  
  -- Emotional Patterns (derived from message analysis)
  dominant_emotions TEXT[] DEFAULT '{}',
  emotional_openness_score DECIMAL(3,2) DEFAULT 0.3,
  vulnerability_level TEXT DEFAULT 'low',
  
  -- Topic Interests
  frequently_discussed_topics TEXT[] DEFAULT '{}',
  relationship_concerns TEXT[] DEFAULT '{}',
  personal_interests TEXT[] DEFAULT '{}',
  
  -- Communication Style Metrics
  uses_hinglish BOOLEAN DEFAULT FALSE,
  hinglish_ratio DECIMAL(3,2) DEFAULT 0,
  avg_emoji_per_message DECIMAL(3,2) DEFAULT 0,
  question_asking_ratio DECIMAL(3,2) DEFAULT 0,
  shares_personal_info BOOLEAN DEFAULT FALSE,
  
  -- Love Language Signals
  words_of_affirmation_signals INTEGER DEFAULT 0,
  quality_time_signals INTEGER DEFAULT 0,
  acts_of_service_signals INTEGER DEFAULT 0,
  physical_touch_signals INTEGER DEFAULT 0,
  receiving_gifts_signals INTEGER DEFAULT 0,
  
  -- Relationship Goals Insights
  seeking_commitment_level TEXT DEFAULT 'unknown',
  ideal_partner_traits_mentioned TEXT[] DEFAULT '{}',
  deal_breakers_mentioned TEXT[] DEFAULT '{}',
  past_relationship_references INTEGER DEFAULT 0,
  
  -- Timestamps
  first_interaction_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_behavior_analytics_user_id ON user_behavior_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_analytics_last_interaction ON user_behavior_analytics(last_interaction_at);

-- Enable Row Level Security
ALTER TABLE user_behavior_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own analytics" ON user_behavior_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON user_behavior_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update behavior analytics after message insert
CREATE OR REPLACE FUNCTION update_behavior_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_behavior_analytics (user_id, total_messages_sent, last_interaction_at, first_interaction_at)
  VALUES (NEW.user_id, 1, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_messages_sent = user_behavior_analytics.total_messages_sent + 1,
    last_interaction_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update analytics on new user messages
DROP TRIGGER IF EXISTS trigger_update_behavior_analytics ON messages;
CREATE TRIGGER trigger_update_behavior_analytics
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.role = 'user')
  EXECUTE FUNCTION update_behavior_analytics();

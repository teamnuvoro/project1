-- User Summary Latest Table for Riya AI Companion
-- This table stores the latest relationship insights for each user

CREATE TABLE IF NOT EXISTS user_summary_latest (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  partner_type_one_liner TEXT,
  top_3_traits_you_value TEXT[],
  what_you_might_work_on TEXT[],
  next_time_focus TEXT[],
  love_language_guess TEXT,
  communication_fit TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_summary_latest_user_id ON user_summary_latest(user_id);

-- Enable Row Level Security
ALTER TABLE user_summary_latest ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own summary
CREATE POLICY "Users can view own summary" ON user_summary_latest
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own summary
CREATE POLICY "Users can update own summary" ON user_summary_latest
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own summary
CREATE POLICY "Users can insert own summary" ON user_summary_latest
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do anything (for API access)
CREATE POLICY "Service role full access" ON user_summary_latest
  FOR ALL USING (auth.role() = 'service_role');

-- Sample data for testing (replace with actual user_id)
-- INSERT INTO user_summary_latest (
--   user_id,
--   partner_type_one_liner,
--   top_3_traits_you_value,
--   what_you_might_work_on,
--   next_time_focus,
--   love_language_guess,
--   communication_fit,
--   confidence_score
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'You connect best with someone warm, emotionally expressive, and grounded who values deep conversations.',
--   ARRAY['Emotional understanding', 'Playful communication', 'Shared ambition'],
--   ARRAY['Opening up more consistently about feelings', 'Practicing emotional clarity in conversations', 'Being more present during vulnerable moments'],
--   ARRAY['Love Language', 'Emotional Security', 'Trust Patterns'],
--   'Words of Affirmation',
--   'Thoughtful & Direct',
--   0.42
-- );

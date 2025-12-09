-- Create feedback table for user ratings and comments
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('bug', 'feature_request', 'general')),
  sentiment VARCHAR(20) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Function to auto-calculate sentiment based on rating
CREATE OR REPLACE FUNCTION calculate_feedback_sentiment(rating INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  CASE
    WHEN rating >= 4 THEN RETURN 'positive';
    WHEN rating = 3 THEN RETURN 'neutral';
    WHEN rating <= 2 THEN RETURN 'negative';
    ELSE RETURN 'neutral';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-set sentiment on insert/update
CREATE OR REPLACE FUNCTION set_feedback_sentiment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sentiment = calculate_feedback_sentiment(NEW.rating);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_sentiment_trigger
  BEFORE INSERT OR UPDATE OF rating ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_feedback_sentiment();

-- Add comment for documentation
COMMENT ON TABLE feedback IS 'User feedback and ratings for the application';
COMMENT ON COLUMN feedback.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN feedback.sentiment IS 'Auto-calculated: positive (4-5), neutral (3), negative (1-2)';
COMMENT ON COLUMN feedback.category IS 'Type of feedback: bug, feature_request, or general';


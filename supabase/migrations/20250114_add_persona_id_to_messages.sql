-- =====================================================
-- ADD PERSONA_ID TO MESSAGES TABLE
-- Tracks which persona generated each AI message
-- =====================================================

-- Add persona_id column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS persona_id VARCHAR(50);

-- Create index for persona queries (useful for analytics and filtering)
CREATE INDEX IF NOT EXISTS idx_messages_persona_id 
ON messages(persona_id) 
WHERE persona_id IS NOT NULL;

-- Create composite index for user + persona queries
CREATE INDEX IF NOT EXISTS idx_messages_user_persona 
ON messages(user_id, persona_id) 
WHERE persona_id IS NOT NULL;

-- Backfill existing AI messages with user's default persona
-- This ensures historical data has persona_id set
UPDATE messages
SET persona_id = (
  SELECT COALESCE(
    -- Map old persona enum values to new persona IDs
    CASE users.persona
      WHEN 'playful_flirty' THEN 'flirtatious'
      WHEN 'bold_confident' THEN 'dominant'
      WHEN 'sweet_supportive' THEN 'sweet_supportive'
      WHEN 'calm_mature' THEN 'calm_mature'
      ELSE 'sweet_supportive'
    END,
    'sweet_supportive'
  )
  FROM users
  WHERE users.id = messages.user_id
)
WHERE persona_id IS NULL 
  AND role = 'ai'
  AND user_id IS NOT NULL;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Persona ID column added to messages table!' as status;



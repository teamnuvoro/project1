-- =====================================================
-- ADD BOLNA CALL ID SUPPORT
-- Adds bolna_call_id field to call_sessions table
-- =====================================================

-- Add bolna_call_id column to call_sessions table
ALTER TABLE call_sessions
ADD COLUMN IF NOT EXISTS bolna_call_id VARCHAR(255);

-- Create index for Bolna call lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_bolna_call_id 
ON call_sessions(bolna_call_id) 
WHERE bolna_call_id IS NOT NULL;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Bolna call ID support added!' as status;



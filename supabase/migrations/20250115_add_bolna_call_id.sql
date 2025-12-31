-- Migration: Add bolna_call_id to call_sessions table
-- Date: 2025-01-15
-- Description: Adds bolna_call_id field to call_sessions table for Bolna Voice AI integration

-- Add bolna_call_id column to call_sessions table
ALTER TABLE call_sessions
ADD COLUMN IF NOT EXISTS bolna_call_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_bolna_call_id 
ON call_sessions(bolna_call_id) 
WHERE bolna_call_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN call_sessions.bolna_call_id IS 'Bolna Voice AI call identifier';


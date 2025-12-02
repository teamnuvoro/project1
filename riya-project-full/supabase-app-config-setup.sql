-- ============================================
-- SUPABASE APP CONFIG TABLE SETUP
-- Run this in Supabase SQL Editor to store API keys
-- ============================================

-- Create app_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read (for backend)
CREATE POLICY "Service role can read app_config"
  ON app_config
  FOR SELECT
  TO service_role
  USING (true);

-- Insert or update GROQ_API_KEY
-- Replace 'YOUR_GROQ_API_KEY_HERE' with your actual Groq API key
INSERT INTO app_config (key, value, description)
VALUES ('GROQ_API_KEY', 'YOUR_GROQ_API_KEY_HERE', 'Groq API key for AI chat responses')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Verify the key was inserted
SELECT key, description, 
       CASE 
         WHEN length(value) > 10 THEN substring(value, 1, 10) || '...' 
         ELSE '***' 
       END as value_preview
FROM app_config
WHERE key = 'GROQ_API_KEY';


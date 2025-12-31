-- =====================================================
-- CHAT IMAGES TABLE
-- Stores image URLs that Riya can send in chat
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT,
  category VARCHAR(50) DEFAULT 'general', -- 'general', 'selfie', 'outfit', 'daily', etc.
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for random selection of active images
CREATE INDEX IF NOT EXISTS idx_chat_images_active 
ON chat_images(is_active) 
WHERE is_active = true;

-- Index for category-based selection
CREATE INDEX IF NOT EXISTS idx_chat_images_category 
ON chat_images(category, is_active);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_set_chat_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_chat_images_updated_at ON chat_images;
CREATE TRIGGER set_chat_images_updated_at
BEFORE UPDATE ON chat_images
FOR EACH ROW
EXECUTE FUNCTION trigger_set_chat_images_updated_at();

-- RLS Policies
ALTER TABLE chat_images ENABLE ROW LEVEL SECURITY;

-- Service role can manage all images
DROP POLICY IF EXISTS "Service role can manage images" ON chat_images;
CREATE POLICY "Service role can manage images" ON chat_images
  FOR ALL USING (true);

-- Authenticated users can view active images (for display)
DROP POLICY IF EXISTS "Users can view active images" ON chat_images;
CREATE POLICY "Users can view active images" ON chat_images
  FOR SELECT USING (is_active = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_images TO service_role;
GRANT SELECT ON chat_images TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Chat images table created!' as status;



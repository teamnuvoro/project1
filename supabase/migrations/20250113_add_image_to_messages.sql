-- =====================================================
-- ADD IMAGE URL TO MESSAGES TABLE
-- Allows messages to include image URLs
-- =====================================================

-- Add image_url column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for messages with images
CREATE INDEX IF NOT EXISTS idx_messages_image_url 
ON messages(image_url) 
WHERE image_url IS NOT NULL;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Image URL support added to messages table!' as status;



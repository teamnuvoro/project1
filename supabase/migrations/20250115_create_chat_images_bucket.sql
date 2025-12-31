-- =====================================================
-- CREATE CHAT IMAGES STORAGE BUCKET
-- Creates Supabase Storage bucket for chat images
-- =====================================================

-- Note: Supabase Storage buckets are created via the Storage API, not SQL
-- This migration file documents the bucket configuration
-- The bucket will be created automatically by the image-upload service if it doesn't exist

-- Bucket Configuration:
-- - Name: chat-images
-- - Public: true (for public URL access)
-- - File size limit: 10MB
-- - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

-- Storage structure:
-- chat-images/
--   └── selfies/
--       ├── [timestamp]-[filename].jpg
--       ├── [timestamp]-[filename].png
--       └── ...

-- =====================================================
-- BUCKET POLICIES (Set via Supabase Dashboard or API)
-- =====================================================

-- Public read access for all images
-- INSERT policy: Service role only (via backend)
-- SELECT policy: Public (anyone can view images via URL)
-- UPDATE policy: Service role only
-- DELETE policy: Service role only

-- =====================================================
-- USAGE
-- =====================================================

-- The bucket will be created automatically when you run:
--   npx tsx scripts/upload-chat-images.ts [path/to/images]

-- Or you can create it manually via Supabase Dashboard:
--   1. Go to Storage
--   2. Create new bucket: "chat-images"
--   3. Set to Public
--   4. Configure policies as needed

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Chat images bucket configuration documented. Bucket will be created automatically by upload service.' as status;


# 🧪 Test Image Sharing Feature

## Quick Test Script

Run this command to test the image sharing feature:

```bash
npx tsx scripts/test-image-feature.ts
```

## What the Script Does

1. ✅ **Verifies Database Setup**
   - Checks if `chat_images` table exists
   - Checks if `messages.image_url` column exists

2. ✅ **Tests Image Detection**
   - Tests various phrases (English & Hinglish)
   - Verifies detection accuracy

3. ✅ **Adds Test Images**
   - Adds 20 test images from Unsplash
   - Categorizes them (selfie, daily, outfit, general)

4. ✅ **Tests Image Service**
   - Tests random image selection
   - Tests image retrieval functions

## Manual Testing

After running the script, test in chat:

### Test Phrases (Should Trigger Image):
- "Can you send me a pic?"
- "Photo bhejo"
- "Show me a photo"
- "Pic dikhao"
- "Send photo please"
- "Tasveer chahiye"
- "I want to see your image"

### Test Phrases (Should NOT Trigger):
- "How are you?"
- "Just chatting"
- "Tell me about yourself"

## Expected Behavior

When you ask for a pic:
1. Riya detects the image request
2. Random image is selected from database
3. Riya responds with text mentioning the photo
4. Image appears in the chat bubble below the text
5. Clicking image opens it in a new tab

## Troubleshooting

### "chat_images table does not exist"
→ Run migration: `supabase/migrations/20250113_chat_images_combined.sql` in Supabase SQL Editor

### "No images found"
→ Run the test script to add test images, or add your own using:
```bash
npx tsx scripts/add-chat-images.ts
```

### Images not showing
→ Check browser console for errors
→ Verify image URLs are accessible (not blocked by CORS)
→ Check that `imageUrl` is included in message response

## API Testing

You can also test the API endpoints directly:

```bash
# List all images
curl http://localhost:3000/api/images

# Add an image
curl -X POST http://localhost:3000/api/images \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Test image",
    "category": "general"
  }'

# Get stats
curl http://localhost:3000/api/images/stats
```



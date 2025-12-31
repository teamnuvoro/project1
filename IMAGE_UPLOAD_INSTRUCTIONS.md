# Image Upload Instructions

You have 12 images that you want to be randomly shown when users ask for pics. Here are your options:

## Option 1: If you have the image files locally

1. **Place the 12 image files** in: `attached_assets/chat-images/`
   - Supported formats: JPG, JPEG, PNG, WebP, GIF
   - Max size: 10MB per image

2. **Run the upload script:**
   ```bash
   npx tsx scripts/upload-chat-images.ts attached_assets/chat-images
   ```

This will:
- Upload images to Supabase Storage
- Store URLs in the database with category "selfie"
- Make them available for random selection

## Option 2: If you have image URLs

1. **Edit the script:** `scripts/add-images-from-urls.ts`
2. **Add your 12 image URLs** in the `IMAGE_URLS` array:
   ```typescript
   const IMAGE_URLS = [
     { url: 'https://example.com/image1.jpg', caption: 'Selfie 1', category: 'selfie' },
     { url: 'https://example.com/image2.jpg', caption: 'Selfie 2', category: 'selfie' },
     // ... add all 12 URLs
   ];
   ```

3. **Run the script:**
   ```bash
   npx tsx scripts/add-images-from-urls.ts
   ```

## Option 3: Upload via API

You can also upload images one by one via the API endpoint:

```bash
curl -X POST http://localhost:3000/api/images \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Selfie",
    "category": "selfie"
  }'
```

## After Upload

Once images are uploaded, the system will automatically:
- ✅ Detect when users ask for pics ("send pics", "photo bhejo", etc.)
- ✅ Select a random image from the database
- ✅ Send it in the chat response

The AI will naturally mention sending a photo in the response, like:
- "Here's a photo for you! 📸"
- "Yeh lo, maine tumhare liye ek photo bheji hai! 💕"

## Verify Images

Check if images were added successfully:
```bash
curl http://localhost:3000/api/images/stats
```

Or view all images:
```bash
curl http://localhost:3000/api/images
```


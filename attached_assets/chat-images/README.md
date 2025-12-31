# Chat Images Directory

Place your 12 images of different women in this directory.

## Supported Formats
- JPG / JPEG
- PNG
- WebP
- GIF

## How to Upload

Once you place the images here, run:

```bash
npx tsx scripts/upload-chat-images.ts attached_assets/chat-images
```

This will:
1. Upload all images to Supabase Storage
2. Store them in the database with category "selfie"
3. Make them available for random selection when users ask for pics

## Image Requirements
- Max file size: 10MB per image
- Recommended: High quality images (at least 800px width)
- Naming: Any name is fine (e.g., `selfie-1.jpg`, `photo-beach.png`)

## After Upload

When users ask for pics/photos/images, the AI will automatically:
- Detect the request (keywords like "send pics", "photo bhejo", etc.)
- Select a random image from the database
- Send it in the chat response


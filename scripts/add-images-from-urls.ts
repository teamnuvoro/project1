/**
 * Add Chat Images from URLs
 * Adds images directly to the database from URLs
 * 
 * Usage:
 *   npx tsx scripts/add-images-from-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { addImage } from '../server/services/image-service';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  process.exit(1);
}

// Image URLs - Replace these with actual URLs of the 12 images
// If you have the image files, use the upload-chat-images.ts script instead
const IMAGE_URLS = [
  // Add your 12 image URLs here
  // Example format:
  // { url: 'https://example.com/image1.jpg', caption: 'Selfie 1', category: 'selfie' },
];

async function addImagesFromUrls() {
  console.log('\n📸 Adding Chat Images from URLs\n');

  if (IMAGE_URLS.length === 0) {
    console.log('⚠️  No image URLs provided in the script.');
    console.log('   Please edit scripts/add-images-from-urls.ts and add your image URLs.');
    console.log('   Or use scripts/upload-chat-images.ts if you have local image files.\n');
    process.exit(1);
  }

  console.log(`📤 Adding ${IMAGE_URLS.length} images to database...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < IMAGE_URLS.length; i++) {
    const imageData = IMAGE_URLS[i];
    console.log(`[${i + 1}/${IMAGE_URLS.length}] Adding: ${imageData.url}`);

    try {
      const image = await addImage(
        imageData.url,
        imageData.caption || undefined,
        imageData.category || 'selfie'
      );

      if (image) {
        console.log(`   ✅ Added: ${image.id}`);
        if (imageData.caption) {
          console.log(`   📝 Caption: ${imageData.caption}`);
        }
        successCount++;
      } else {
        console.log(`   ❌ Failed to add image`);
        failCount++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      failCount++;
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(50));
  console.log('📊 Upload Summary');
  console.log('='.repeat(50));
  console.log(`Total URLs: ${IMAGE_URLS.length}`);
  console.log(`Added to database: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('='.repeat(50) + '\n');

  if (successCount > 0) {
    console.log('✅ Images are now available for random selection in chat!');
    console.log('   When users ask for pics, a random image will be sent.\n');
  }
}

// Main execution
async function main() {
  try {
    await addImagesFromUrls();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


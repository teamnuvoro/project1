/**
 * Batch Upload Chat Images Script
 * Uploads multiple local image files to Supabase Storage and stores them in chat_images table
 * 
 * Usage:
 *   npx tsx scripts/upload-chat-images.ts [path/to/images]
 *   npx tsx scripts/upload-chat-images.ts attached_assets/chat-images
 */

import dotenv from 'dotenv';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { uploadMultipleImages } from '../server/services/image-upload';
import { addImage } from '../server/services/image-service';
import { supabase, isSupabaseConfigured } from '../server/supabase';

// Load .env from root or server directory
dotenv.config({ path: join(process.cwd(), '.env') });
dotenv.config({ path: join(process.cwd(), 'server', '.env') });

if (!isSupabaseConfigured) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  console.error('   Please set these in your .env file or environment variables');
  process.exit(1);
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Get all image files from a directory
 */
async function getImageFiles(directory: string): Promise<string[]> {
  try {
    const files = await readdir(directory);
    const imageFiles: string[] = [];

    for (const file of files) {
      const filePath = join(directory, file);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        const ext = extname(file).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          imageFiles.push(filePath);
        }
      }
    }

    return imageFiles.sort();
  } catch (error: any) {
    console.error(`❌ Error reading directory ${directory}:`, error.message);
    return [];
  }
}

/**
 * Generate caption from filename
 */
function generateCaption(fileName: string): string {
  // Remove extension and clean up filename
  const name = basename(fileName, extname(fileName))
    .replace(/[-_]/g, ' ')
    .replace(/\d+/g, '')
    .trim();
  
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1) || 'Selfie';
}

/**
 * Main upload function
 */
async function uploadImages(imageDirectory: string) {
  console.log('\n📸 Chat Images Batch Upload\n');
  console.log(`📁 Reading images from: ${imageDirectory}\n`);

  // Get all image files
  const imageFiles = await getImageFiles(imageDirectory);

  if (imageFiles.length === 0) {
    console.log('❌ No image files found in the specified directory');
    console.log(`   Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
    process.exit(1);
  }

  console.log(`✅ Found ${imageFiles.length} image file(s):`);
  imageFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${basename(file)}`);
  });
  console.log('');

  // Upload images to Supabase Storage
  console.log('📤 Uploading images to Supabase Storage...\n');
  const uploadResults = await uploadMultipleImages(imageFiles);

  // Filter successful uploads
  const successfulUploads = uploadResults.filter(r => r.success);

  if (successfulUploads.length === 0) {
    console.log('❌ No images were uploaded successfully');
    process.exit(1);
  }

  console.log(`\n✅ ${successfulUploads.length}/${imageFiles.length} images uploaded to storage\n`);

  // Store URLs in database
  console.log('💾 Storing image URLs in database...\n');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < successfulUploads.length; i++) {
    const upload = successfulUploads[i];
    const fileName = basename(upload.fileName);
    const caption = generateCaption(fileName);

    console.log(`[${i + 1}/${successfulUploads.length}] Adding to database: ${fileName}`);

    const image = await addImage(
      upload.url,
      caption,
      'selfie' // Category: selfie
    );

    if (image) {
      console.log(`   ✅ Added: ${image.id}`);
      console.log(`   📝 Caption: ${caption}`);
      console.log(`   🔗 URL: ${upload.url}\n`);
      successCount++;
    } else {
      console.log(`   ❌ Failed to add to database\n`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary');
  console.log('='.repeat(50));
  console.log(`Total files found: ${imageFiles.length}`);
  console.log(`Uploaded to storage: ${successfulUploads.length}`);
  console.log(`Added to database: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('='.repeat(50) + '\n');

  if (successCount > 0) {
    console.log('✅ Images are now available for random selection in chat!');
  }
}

// Main execution
async function main() {
  const imageDirectory = process.argv[2] || 'attached_assets/chat-images';

  try {
    await uploadImages(imageDirectory);
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


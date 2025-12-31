/**
 * Simple Image Upload Script
 * Uses the server's Supabase configuration
 */

import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { uploadMultipleImages } from '../server/services/image-upload';
import { addImage } from '../server/services/image-service';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG'];

async function getImageFiles(directory: string): Promise<string[]> {
  try {
    const files = await readdir(directory);
    const imageFiles: string[] = [];

    for (const file of files) {
      const filePath = join(directory, file);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        const ext = extname(file).toLowerCase();
        if (ALLOWED_EXTENSIONS.some(allowed => ext === allowed.toLowerCase())) {
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

function generateCaption(fileName: string): string {
  const name = basename(fileName, extname(fileName))
    .replace(/[-_]/g, ' ')
    .replace(/\d+/g, '')
    .trim();
  
  return name.charAt(0).toUpperCase() + name.slice(1) || 'Selfie';
}

async function uploadImages(imageDirectory: string) {
  console.log('\n📸 Chat Images Batch Upload\n');
  console.log(`📁 Reading images from: ${imageDirectory}\n`);

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

  console.log('📤 Uploading images to Supabase Storage...\n');
  const uploadResults = await uploadMultipleImages(imageFiles);

  const successfulUploads = uploadResults.filter(r => r.success);

  if (successfulUploads.length === 0) {
    console.log('❌ No images were uploaded successfully');
    console.log('   Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment');
    process.exit(1);
  }

  console.log(`\n✅ ${successfulUploads.length}/${imageFiles.length} images uploaded to storage\n`);

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
      'selfie'
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
    console.log('   When users ask for pics, a random image will be sent.\n');
  }
}

async function main() {
  const imageDirectory = process.argv[2] || 'attached_assets/chat-images';

  try {
    await uploadImages(imageDirectory);
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.message.includes('API key') || error.message.includes('Supabase')) {
      console.error('\n💡 Tip: Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables');
      console.error('   You can set it by running:');
      console.error('   export SUPABASE_SERVICE_ROLE_KEY=your_key_here');
      console.error('   Or create a .env file in the project root with:');
      console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key_here\n');
    }
    console.error(error.stack);
    process.exit(1);
  }
}

main();


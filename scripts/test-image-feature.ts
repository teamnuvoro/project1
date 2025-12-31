/**
 * Test Script for Image Sharing Feature
 * Adds test images and verifies the feature works
 * 
 * Usage: npx tsx scripts/test-image-feature.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Test images - using placeholder images from Unsplash
// Replace these with your actual image URLs
const TEST_IMAGES = [
  {
    image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    caption: 'Hey! This is me 😊',
    category: 'selfie'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face',
    caption: 'Just chilling at home',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    caption: 'Feeling cute today 💕',
    category: 'selfie'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    caption: 'Morning vibes ☀️',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
    caption: 'Ready for the day!',
    category: 'outfit'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1488426862026-3ee34cbe39dc?w=400&h=400&fit=crop&crop=face',
    caption: 'Evening selfie 🌆',
    category: 'selfie'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    caption: 'Coffee time ☕',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    caption: 'Weekend vibes 🎉',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    caption: 'Just thinking...',
    category: 'general'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face',
    caption: 'Feeling good! 😄',
    category: 'selfie'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    caption: 'Beautiful day outside',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    caption: 'Missing you 💭',
    category: 'general'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face',
    caption: 'New outfit! 👗',
    category: 'outfit'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    caption: 'Just woke up 😴',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    caption: 'Feeling pretty today ✨',
    category: 'selfie'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1488426862026-3ee34cbe39dc?w=400&h=400&fit=crop&crop=face',
    caption: 'Evening walk 🌅',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
    caption: 'Ready for bed 🌙',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    caption: 'Good morning! ☀️',
    category: 'daily'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face',
    caption: 'Feeling happy 😊',
    category: 'general'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    caption: 'Just me 💕',
    category: 'selfie'
  },
];

async function testImageDetection() {
  console.log('\n🔍 Testing Image Detection Service...\n');

  // Import the detection service
  const { detectImageRequest } = await import('../server/services/image-detection');

  const testPhrases = [
    'Can you send me a pic?',
    'Photo bhejo',
    'Show me a photo',
    'I want to see your image',
    'Pic dikhao',
    'Send photo please',
    'Tasveer chahiye',
    'Can I see a picture?',
    'Photo chahiye',
    'Just chatting', // Should NOT trigger
    'How are you?', // Should NOT trigger
  ];

  let passed = 0;
  let failed = 0;

  testPhrases.forEach((phrase, index) => {
    const shouldDetect = index < 9; // First 9 should detect, last 2 should not
    const detected = detectImageRequest(phrase);
    const result = detected === shouldDetect ? '✅' : '❌';
    
    if (detected === shouldDetect) {
      passed++;
    } else {
      failed++;
    }

    console.log(`${result} "${phrase}" - Detected: ${detected} (Expected: ${shouldDetect})`);
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

async function addTestImages() {
  console.log('📸 Adding test images to database...\n');

  // First, check if images already exist
  const { data: existingImages } = await supabase
    .from('chat_images')
    .select('id')
    .limit(1);

  if (existingImages && existingImages.length > 0) {
    console.log('⚠️  Images already exist in database.');
    const { count } = await supabase
      .from('chat_images')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    console.log(`   Found ${count || 0} active images.`);
    console.log('   Skipping image insertion. Use --force to overwrite.\n');
    return;
  }

  console.log(`Adding ${TEST_IMAGES.length} test images...\n`);

  const { data, error } = await supabase
    .from('chat_images')
    .insert(
      TEST_IMAGES.map((img, index) => ({
        image_url: img.image_url,
        caption: img.caption,
        category: img.category,
        is_active: true,
        display_order: index,
      }))
    )
    .select();

  if (error) {
    console.error('❌ Error adding images:', error);
    return false;
  }

  console.log(`✅ Successfully added ${data?.length || 0} test images!\n`);
  
  // Show summary
  const categories = TEST_IMAGES.reduce((acc, img) => {
    acc[img.category] = (acc[img.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Image breakdown by category:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} images`);
  });

  return true;
}

async function verifyDatabase() {
  console.log('\n🔍 Verifying database setup...\n');

  // Check chat_images table
  const { data: images, error: imagesError } = await supabase
    .from('chat_images')
    .select('id')
    .limit(1);

  if (imagesError) {
    console.error('❌ chat_images table error:', imagesError.message);
    console.log('   → Run the migration: supabase/migrations/20250113_chat_images_combined.sql\n');
    return false;
  }

  console.log('✅ chat_images table exists');

  // Check messages table has image_url column
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('image_url')
    .limit(1);

  if (messagesError && messagesError.message.includes('column "image_url" does not exist')) {
    console.error('❌ messages.image_url column missing');
    console.log('   → Run the migration: supabase/migrations/20250113_add_image_to_messages.sql\n');
    return false;
  }

  console.log('✅ messages.image_url column exists\n');
  return true;
}

async function testImageService() {
  console.log('🔍 Testing Image Service...\n');

  const { getRandomImage, getAllImages, getImageCount } = await import('../server/services/image-service');

  // Test getRandomImage
  const randomImage = await getRandomImage();
  if (randomImage) {
    console.log('✅ getRandomImage() works');
    console.log(`   Selected: ${randomImage.image_url.substring(0, 50)}...`);
  } else {
    console.log('⚠️  getRandomImage() returned null (no images in database)');
  }

  // Test getAllImages
  const allImages = await getAllImages();
  console.log(`✅ getAllImages() works - Found ${allImages.length} active images`);

  // Test getImageCount
  const count = await getImageCount();
  console.log(`✅ getImageCount() works - Total active: ${count}\n`);

  return true;
}

async function main() {
  console.log('🚀 Image Sharing Feature Test Script\n');
  console.log('=====================================\n');

  // Step 1: Verify database
  const dbOk = await verifyDatabase();
  if (!dbOk) {
    console.log('❌ Database setup incomplete. Please run migrations first.\n');
    process.exit(1);
  }

  // Step 2: Test image detection
  const detectionOk = await testImageDetection();
  if (!detectionOk) {
    console.log('⚠️  Some detection tests failed, but continuing...\n');
  }

  // Step 3: Add test images
  await addTestImages();

  // Step 4: Test image service
  await testImageService();

  console.log('✅ Test script completed!\n');
  console.log('📝 Next steps:');
  console.log('   1. Go to your chat interface');
  console.log('   2. Try asking: "Can you send me a pic?" or "Photo bhejo"');
  console.log('   3. Riya should respond with text and an image!\n');
}

main().catch((error) => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});



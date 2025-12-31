/**
 * Helper script to add chat images to the database
 * Usage: npx tsx scripts/add-chat-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addImage() {
  console.log('\n📸 Add Chat Image\n');

  const imageUrl = await question('Image URL: ');
  if (!imageUrl) {
    console.log('❌ Image URL is required');
    return;
  }

  const caption = await question('Caption (optional): ');
  const category = await question('Category (general/selfie/outfit/daily, default: general): ') || 'general';

  const { data, error } = await supabase
    .from('chat_images')
    .insert({
      image_url: imageUrl,
      caption: caption || null,
      category: category || 'general',
      is_active: true,
      display_order: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error adding image:', error);
  } else {
    console.log('✅ Image added successfully!');
    console.log('   ID:', data.id);
    console.log('   URL:', data.image_url);
  }
}

async function addMultipleImages() {
  console.log('\n📸 Add Multiple Chat Images\n');
  console.log('Enter image URLs (one per line). Type "done" when finished.\n');

  const images: Array<{ image_url: string; caption?: string; category?: string }> = [];

  while (true) {
    const url = await question(`Image ${images.length + 1} URL (or "done" to finish): `);
    if (url.toLowerCase() === 'done' || !url) break;

    const caption = await question('  Caption (optional): ');
    const category = await question('  Category (default: general): ') || 'general';

    images.push({
      image_url: url,
      caption: caption || undefined,
      category: category || 'general',
    });
  }

  if (images.length === 0) {
    console.log('No images to add.');
    return;
  }

  console.log(`\nAdding ${images.length} images...`);

  const { data, error } = await supabase
    .from('chat_images')
    .insert(
      images.map(img => ({
        image_url: img.image_url,
        caption: img.caption || null,
        category: img.category || 'general',
        is_active: true,
        display_order: 0,
      }))
    )
    .select();

  if (error) {
    console.error('❌ Error adding images:', error);
  } else {
    console.log(`✅ Successfully added ${data?.length || 0} images!`);
  }
}

async function listImages() {
  const { data, error } = await supabase
    .from('chat_images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching images:', error);
    return;
  }

  console.log(`\n📸 Total Images: ${data?.length || 0}\n`);

  if (data && data.length > 0) {
    data.forEach((img, index) => {
      console.log(`${index + 1}. ${img.image_url}`);
      if (img.caption) console.log(`   Caption: ${img.caption}`);
      console.log(`   Category: ${img.category || 'general'}`);
      console.log(`   Active: ${img.is_active ? 'Yes' : 'No'}`);
      console.log('');
    });
  } else {
    console.log('No images found.');
  }
}

async function main() {
  console.log('🚀 Chat Images Management Tool\n');

  while (true) {
    console.log('\nOptions:');
    console.log('  1. Add single image');
    console.log('  2. Add multiple images');
    console.log('  3. List all images');
    console.log('  4. Exit');

    const choice = await question('\nSelect option (1-4): ');

    switch (choice) {
      case '1':
        await addImage();
        break;
      case '2':
        await addMultipleImages();
        break;
      case '3':
        await listImages();
        break;
      case '4':
        console.log('\n👋 Goodbye!');
        rl.close();
        process.exit(0);
      default:
        console.log('❌ Invalid option');
    }
  }
}

main().catch(console.error);



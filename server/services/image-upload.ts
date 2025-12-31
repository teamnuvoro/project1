/**
 * Image Upload Service
 * Handles uploading images to Supabase Storage and managing chat images
 */

import { supabase, isSupabaseConfigured } from '../supabase';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, basename } from 'path';

const BUCKET_NAME = 'chat-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  size: number;
}

/**
 * Check if bucket exists, create if it doesn't
 */
async function ensureBucketExists(): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[ImageUpload] Supabase not configured, cannot create bucket');
      return false;
    }

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[ImageUpload] Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`[ImageUpload] Bucket "${BUCKET_NAME}" already exists`);
      return true;
    }

    // Create bucket
    console.log(`[ImageUpload] Creating bucket "${BUCKET_NAME}"...`);
    const { data: bucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    });

    if (createError) {
      console.error('[ImageUpload] Error creating bucket:', createError);
      return false;
    }

    console.log(`[ImageUpload] Bucket "${BUCKET_NAME}" created successfully`);
    return true;
  } catch (error: any) {
    console.error('[ImageUpload] Error ensuring bucket exists:', error);
    return false;
  }
}

/**
 * Validate image file
 */
function validateImageFile(filePath: string): { valid: boolean; error?: string } {
  if (!existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  const ext = extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
    };
  }

  try {
    const stats = statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }
  } catch (error) {
    return { valid: false, error: 'Cannot read file stats' };
  }

  return { valid: true };
}

/**
 * Upload a single image file to Supabase Storage
 */
export async function uploadImageToStorage(
  filePath: string,
  fileName?: string
): Promise<UploadResult | null> {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[ImageUpload] Supabase not configured, cannot upload');
      return null;
    }

    // Validate file
    const validation = validateImageFile(filePath);
    if (!validation.valid) {
      console.error(`[ImageUpload] Validation failed: ${validation.error}`);
      return null;
    }

    // Ensure bucket exists
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      console.error('[ImageUpload] Bucket not ready');
      return null;
    }

    // Read file
    const fileBuffer = readFileSync(filePath);
    const finalFileName = fileName || `${Date.now()}-${basename(filePath)}`;
    const storagePath = `selfies/${finalFileName}`;

    console.log(`[ImageUpload] Uploading ${basename(filePath)} to ${storagePath}...`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: `image/${extname(filePath).slice(1).toLowerCase()}`,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error('[ImageUpload] Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    console.log(`[ImageUpload] ✅ Uploaded successfully: ${publicUrl}`);

    return {
      url: publicUrl,
      path: storagePath,
      fileName: finalFileName,
      size: fileBuffer.length,
    };
  } catch (error: any) {
    console.error('[ImageUpload] Error uploading image:', error);
    return null;
  }
}

/**
 * Upload multiple images to Supabase Storage
 */
export async function uploadMultipleImages(
  filePaths: string[]
): Promise<Array<UploadResult & { success: boolean; error?: string }>> {
  const results: Array<UploadResult & { success: boolean; error?: string }> = [];

  console.log(`[ImageUpload] Starting batch upload of ${filePaths.length} images...`);

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    console.log(`[ImageUpload] [${i + 1}/${filePaths.length}] Processing: ${basename(filePath)}`);

    const result = await uploadImageToStorage(filePath);

    if (result) {
      results.push({ ...result, success: true });
    } else {
      results.push({
        url: '',
        path: '',
        fileName: basename(filePath),
        size: 0,
        success: false,
        error: 'Upload failed',
      });
    }

    // Small delay to avoid rate limiting
    if (i < filePaths.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[ImageUpload] Batch upload complete: ${successCount}/${filePaths.length} successful`);

  return results;
}

/**
 * Get public URL for an existing file in storage
 */
export function getPublicUrl(storagePath: string): string {
  if (!isSupabaseConfigured) {
    return '';
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}


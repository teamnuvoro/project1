/**
 * Image Service
 * Manages chat images - selection, retrieval, and management
 */

import { supabase, isSupabaseConfigured } from '../supabase';

export interface ChatImage {
  id: string;
  image_url: string;
  caption?: string;
  category?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get a random active image from the database
 */
export async function getRandomImage(category?: string): Promise<ChatImage | null> {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[ImageService] Supabase not configured, returning null');
      return null;
    }

    let query = supabase
      .from('chat_images')
      .select('*')
      .eq('is_active', true);

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error('[ImageService] Error fetching images:', error);
      return null;
    }

    if (!images || images.length === 0) {
      console.warn('[ImageService] No active images found in database');
      return null;
    }

    // Select random image
    const randomIndex = Math.floor(Math.random() * images.length);
    const selectedImage = images[randomIndex];

    console.log(`[ImageService] Selected random image: ${selectedImage.id} (${images.length} total images)`);

    return selectedImage as ChatImage;
  } catch (error: any) {
    console.error('[ImageService] Error in getRandomImage:', error);
    return null;
  }
}

/**
 * Get all active images
 */
export async function getAllImages(includeInactive: boolean = false): Promise<ChatImage[]> {
  try {
    if (!isSupabaseConfigured) {
      return [];
    }

    let query = supabase
      .from('chat_images')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error('[ImageService] Error fetching all images:', error);
      return [];
    }

    return (images || []) as ChatImage[];
  } catch (error: any) {
    console.error('[ImageService] Error in getAllImages:', error);
    return [];
  }
}

/**
 * Add a new image to the database
 */
export async function addImage(
  imageUrl: string,
  caption?: string,
  category: string = 'general'
): Promise<ChatImage | null> {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[ImageService] Supabase not configured, cannot add image');
      return null;
    }

    const { data: image, error } = await supabase
      .from('chat_images')
      .insert({
        image_url: imageUrl,
        caption: caption || null,
        category: category,
        is_active: true,
        display_order: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[ImageService] Error adding image:', error);
      return null;
    }

    console.log(`[ImageService] Added new image: ${image.id}`);
    return image as ChatImage;
  } catch (error: any) {
    console.error('[ImageService] Error in addImage:', error);
    return null;
  }
}

/**
 * Update image (caption, category, active status)
 */
export async function updateImage(
  imageId: string,
  updates: Partial<Pick<ChatImage, 'caption' | 'category' | 'is_active' | 'display_order'>>
): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      return false;
    }

    const { error } = await supabase
      .from('chat_images')
      .update(updates)
      .eq('id', imageId);

    if (error) {
      console.error('[ImageService] Error updating image:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[ImageService] Error in updateImage:', error);
    return false;
  }
}

/**
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      return false;
    }

    const { error } = await supabase
      .from('chat_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('[ImageService] Error deleting image:', error);
      return false;
    }

    console.log(`[ImageService] Deleted image: ${imageId}`);
    return true;
  } catch (error: any) {
    console.error('[ImageService] Error in deleteImage:', error);
    return false;
  }
}

/**
 * Get image count (for admin/stats)
 */
export async function getImageCount(activeOnly: boolean = true): Promise<number> {
  try {
    if (!isSupabaseConfigured) {
      return 0;
    }

    let query = supabase
      .from('chat_images')
      .select('id', { count: 'exact', head: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { count, error } = await query;

    if (error) {
      console.error('[ImageService] Error counting images:', error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error('[ImageService] Error in getImageCount:', error);
    return 0;
  }
}



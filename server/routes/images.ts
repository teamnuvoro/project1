/**
 * Image Management API Routes
 * Admin endpoints for managing chat images
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase, isSupabaseConfigured } from '../supabase';
import { getAllImages, addImage, updateImage, deleteImage, getImageCount } from '../services/image-service';
import { uploadImageToStorage } from '../services/image-upload';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

/**
 * GET /api/images
 * Get all images (with optional filters)
 */
router.get('/api/images', async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const includeInactiveBool = includeInactive === 'true';

    const images = await getAllImages(includeInactiveBool);

    res.json({
      success: true,
      count: images.length,
      images
    });
  } catch (error: any) {
    console.error('[Images API] Error fetching images:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch images' });
  }
});

/**
 * POST /api/images
 * Add a new image
 */
router.post('/api/images', async (req: Request, res: Response) => {
  try {
    const { imageUrl, caption, category } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required and must be a string' });
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: 'imageUrl must be a valid URL' });
    }

    const image = await addImage(
      imageUrl,
      caption,
      category || 'general'
    );

    if (!image) {
      return res.status(500).json({ error: 'Failed to add image' });
    }

    res.json({
      success: true,
      image
    });
  } catch (error: any) {
    console.error('[Images API] Error adding image:', error);
    res.status(500).json({ error: error.message || 'Failed to add image' });
  }
});

/**
 * PUT /api/images/:id
 * Update an image
 */
router.put('/api/images/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { caption, category, isActive, displayOrder } = req.body;

    const updates: any = {};
    if (caption !== undefined) updates.caption = caption;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.is_active = isActive;
    if (displayOrder !== undefined) updates.display_order = displayOrder;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const success = await updateImage(id, updates);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update image' });
    }

    res.json({
      success: true,
      message: 'Image updated successfully'
    });
  } catch (error: any) {
    console.error('[Images API] Error updating image:', error);
    res.status(500).json({ error: error.message || 'Failed to update image' });
  }
});

/**
 * DELETE /api/images/:id
 * Delete an image
 */
router.delete('/api/images/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const success = await deleteImage(id);

    if (!success) {
      return res.status(500).json({ error: 'Failed to delete image' });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error: any) {
    console.error('[Images API] Error deleting image:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image' });
  }
});

/**
 * GET /api/images/stats
 * Get image statistics
 */
router.get('/api/images/stats', async (req: Request, res: Response) => {
  try {
    const totalCount = await getImageCount(false);
    const activeCount = await getImageCount(true);

    res.json({
      success: true,
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount
      }
    });
  } catch (error: any) {
    console.error('[Images API] Error fetching stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

/**
 * POST /api/images/upload
 * Upload an image file to Supabase Storage and store in database
 * Accepts multipart/form-data with 'image' field
 */
router.post('/api/images/upload', upload.single('image'), async (req: Request, res: Response) => {
  let uploadedFilePath: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided. Use field name "image"' });
    }

    uploadedFilePath = req.file.path;
    const { caption, category } = req.body;

    console.log(`[Images API] Uploading image: ${req.file.originalname}`);

    // Upload to Supabase Storage
    const uploadResult = await uploadImageToStorage(
      uploadedFilePath,
      req.file.originalname
    );

    if (!uploadResult) {
      return res.status(500).json({ error: 'Failed to upload image to storage' });
    }

    // Store in database
    const image = await addImage(
      uploadResult.url,
      caption || undefined,
      category || 'general'
    );

    if (!image) {
      return res.status(500).json({ error: 'Failed to store image in database' });
    }

    // Clean up temporary file
    try {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
    } catch (cleanupError) {
      console.warn('[Images API] Failed to cleanup temp file:', cleanupError);
    }

    res.json({
      success: true,
      image,
      uploadResult: {
        url: uploadResult.url,
        path: uploadResult.path,
        size: uploadResult.size,
      }
    });
  } catch (error: any) {
    // Clean up temporary file on error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        console.warn('[Images API] Failed to cleanup temp file on error:', cleanupError);
      }
    }

    console.error('[Images API] Error uploading image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

export default router;



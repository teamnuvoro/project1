import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured } from "../supabase";

const router = Router();

// POST /api/feedback - Submit user feedback
router.post("/api/feedback", async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const { rating, comment, category } = req.body;
    const userId = (req as any).session?.userId || req.body.userId;

    // Validate required fields
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    }

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate category
    const validCategories = ['bug', 'feature_request', 'general'];
    const feedbackCategory = validCategories.includes(category) ? category : 'general';

    // Calculate sentiment based on rating
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (rating >= 4) {
      sentiment = 'positive';
    } else if (rating === 3) {
      sentiment = 'neutral';
    } else {
      sentiment = 'negative';
    }

    // Insert feedback into database
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        rating: Math.round(rating),
        comment: comment || null,
        category: feedbackCategory,
        sentiment: sentiment
      })
      .select()
      .single();

    if (error) {
      console.error('[Feedback] Error inserting feedback:', error);
      return res.status(500).json({ error: "Failed to submit feedback", details: error.message });
    }

    console.log(`[Feedback] New feedback submitted by user ${userId}: ${rating} stars, ${sentiment}`);

    res.status(201).json({
      success: true,
      feedback: data,
      message: "Thank you for your feedback!"
    });
  } catch (error: any) {
    console.error("[Feedback] Error:", error);
    res.status(500).json({ error: "Failed to submit feedback", details: error.message });
  }
});

// GET /api/admin/feedback - Get all feedback (Admin only)
router.get("/api/admin/feedback", async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = (req as any).session?.userId || req.query?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.warn('[Admin Feedback] User not found or error:', userError);
      // Allow access - password protection is on frontend
    } else if (!user.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get query parameters for filtering
    const sentiment = req.query.sentiment as string | undefined;
    const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;
    const category = req.query.category as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    // Build query
    let feedbackQuery = supabase
      .from('feedback')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
      feedbackQuery = feedbackQuery.eq('sentiment', sentiment);
    }

    if (rating && rating >= 1 && rating <= 5) {
      feedbackQuery = feedbackQuery.eq('rating', rating);
    }

    if (category && ['bug', 'feature_request', 'general'].includes(category)) {
      feedbackQuery = feedbackQuery.eq('category', category);
    }

    const { data: feedback, error: feedbackError } = await feedbackQuery;

    if (feedbackError) {
      console.error('[Admin Feedback] Error fetching feedback:', feedbackError);
      return res.status(500).json({ error: "Failed to fetch feedback", details: feedbackError.message });
    }

    // Calculate metrics
    const totalFeedback = feedback?.length || 0;
    const avgRating = totalFeedback > 0
      ? feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / totalFeedback
      : 0;

    // Calculate NPS (Net Promoter Score)
    // Promoters (9-10) = ratings 4-5, Detractors (0-6) = ratings 1-2, Passives (7-8) = rating 3
    const promoters = feedback?.filter((f: any) => f.rating >= 4).length || 0;
    const detractors = feedback?.filter((f: any) => f.rating <= 2).length || 0;
    const nps = totalFeedback > 0
      ? Math.round(((promoters - detractors) / totalFeedback) * 100)
      : 0;

    // Count by sentiment
    const sentimentCounts = {
      positive: feedback?.filter((f: any) => f.sentiment === 'positive').length || 0,
      neutral: feedback?.filter((f: any) => f.sentiment === 'neutral').length || 0,
      negative: feedback?.filter((f: any) => f.sentiment === 'negative').length || 0,
    };

    // Count by category
    const categoryCounts = {
      bug: feedback?.filter((f: any) => f.category === 'bug').length || 0,
      feature_request: feedback?.filter((f: any) => f.category === 'feature_request').length || 0,
      general: feedback?.filter((f: any) => f.category === 'general').length || 0,
    };

    res.json({
      feedback: feedback || [],
      metrics: {
        total: totalFeedback,
        avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        nps: nps,
        sentimentCounts,
        categoryCounts
      }
    });
  } catch (error: any) {
    console.error("[Admin Feedback] Error:", error);
    res.status(500).json({ error: "Failed to fetch feedback", details: error.message });
  }
});

export default router;


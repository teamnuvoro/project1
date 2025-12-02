import { Router, Request, Response } from 'express';
import { supabase } from '../supabase';
import { 
  calculateUnderstandingLevel, 
  getUnderstandingProgression,
  getNextSessionIncrement,
  UNDERSTANDING_CONSTANTS
} from '../lib/understandingLevelCalculator';

/**
 * User Cumulative Summary type matching database schema
 */
interface UserCumulativeSummary {
  id: string;
  user_id: string;
  cumulative_summary: string | null;
  all_sessions_context: Record<string, any> | null;
  ideal_partner_type: string | null;
  user_personality_traits: string[] | null;
  communication_style: string | null;
  emotional_needs: string[] | null;
  values: string[] | null;
  interests: string[] | null;
  relationship_expectations: string | null;
  what_to_explore: string[] | null;
  suggested_conversation_starters: string[] | null;
  growth_areas: string[] | null;
  understanding_level: number;
  total_sessions_count: number;
  total_messages_count: number;
  engagement_level: string | null;
  primary_conversation_theme: string | null;
  mood_pattern: string | null;
  created_at: string;
  updated_at: string;
  last_analysis_at: string;
}

/**
 * Understanding progression step
 */
interface ProgressionStep {
  session: number;
  level: number;
  increment: number;
}

/**
 * API response types
 */
interface SummaryResponse {
  success: boolean;
  summary?: UserCumulativeSummary;
  message?: string;
  error?: string;
}

interface ProgressionResponse {
  success: boolean;
  progression?: ProgressionStep[];
  currentLevel?: number;
  nextIncrement?: number;
  maxLevel?: number;
  sessionsToMax?: number;
  error?: string;
}

interface GenerateResponse {
  success: boolean;
  summary?: UserCumulativeSummary;
  stats?: {
    sessions_analyzed: number;
    messages_analyzed: number;
    understanding_level: number;
  };
  message?: string;
  error?: string;
}

const router = Router();

/**
 * Verify user has access to the requested data
 * In production, this should check session/auth
 */
function verifyAccess(req: Request, requestedUserId: string): boolean {
  const sessionUserId = (req.session as any)?.userId;
  
  // Allow if no auth required (development) or user matches
  if (!sessionUserId) {
    console.log('[user-summary] No session auth, allowing access (dev mode)');
    return true;
  }
  
  if (sessionUserId === requestedUserId) {
    return true;
  }
  
  console.log(`[user-summary] Access denied: session user ${sessionUserId} != requested ${requestedUserId}`);
  return false;
}

/**
 * GET /api/user-summary/:userId
 * Fetch user's cumulative summary from Supabase
 */
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  console.log(`[user-summary] GET /${userId}`);

  try {
    // Verify access
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own summary.'
      } as SummaryResponse);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Expected UUID.'
      } as SummaryResponse);
    }

    // Fetch summary from database
    const { data: summary, error } = await supabase
      .from('user_cumulative_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found)
      if (error.code === 'PGRST116') {
        console.log(`[user-summary] No summary found for user ${userId}`);
        return res.status(404).json({
          success: false,
          error: 'No summary found for this user. Start chatting to generate insights!'
        } as SummaryResponse);
      }

      console.error('[user-summary] Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user summary. Please try again.'
      } as SummaryResponse);
    }

    console.log(`[user-summary] Found summary for user ${userId} (understanding: ${summary.understanding_level}%)`);

    return res.json({
      success: true,
      summary: summary as UserCumulativeSummary
    } as SummaryResponse);

  } catch (error) {
    console.error('[user-summary] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.'
    } as SummaryResponse);
  }
});

/**
 * POST /api/user-summary/:userId/generate
 * Manually trigger summary generation for a user
 */
router.post('/:userId/generate', async (req: Request, res: Response) => {
  const { userId } = req.params;

  console.log(`[user-summary] POST /${userId}/generate`);

  try {
    // Verify access
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only generate your own summary.'
      } as GenerateResponse);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Expected UUID.'
      } as GenerateResponse);
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log(`[user-summary] User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      } as GenerateResponse);
    }

    // Invoke the Edge Function to generate summary
    console.log(`[user-summary] Invoking generate-user-summary Edge Function...`);

    const { data: result, error: invokeError } = await supabase.functions.invoke(
      'generate-user-summary',
      {
        body: { userId }
      }
    );

    if (invokeError) {
      console.error('[user-summary] Edge Function error:', invokeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate summary. The AI service may be temporarily unavailable.'
      } as GenerateResponse);
    }

    if (!result?.success) {
      console.error('[user-summary] Edge Function returned failure:', result);
      return res.status(500).json({
        success: false,
        error: result?.error || 'Summary generation failed.'
      } as GenerateResponse);
    }

    console.log(`[user-summary] Summary generated successfully for user ${userId}`);

    return res.json({
      success: true,
      summary: result.summary as UserCumulativeSummary,
      stats: result.stats,
      message: 'User summary generated successfully'
    } as GenerateResponse);

  } catch (error) {
    console.error('[user-summary] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating summary.'
    } as GenerateResponse);
  }
});

/**
 * GET /api/user-summary/:userId/progression
 * Return understanding level progression steps
 */
router.get('/:userId/progression', async (req: Request, res: Response) => {
  const { userId } = req.params;

  console.log(`[user-summary] GET /${userId}/progression`);

  try {
    // Verify access
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own progression.'
      } as ProgressionResponse);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Expected UUID.'
      } as ProgressionResponse);
    }

    // Fetch summary to get session count
    const { data: summary, error } = await supabase
      .from('user_cumulative_summary')
      .select('total_sessions_count, understanding_level')
      .eq('user_id', userId)
      .single();

    let sessionCount = 1;
    let currentLevel = UNDERSTANDING_CONSTANTS.BASE_LEVEL;

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('[user-summary] Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user data.'
        } as ProgressionResponse);
      }
      // No summary yet - use defaults
      console.log(`[user-summary] No summary for ${userId}, using defaults`);
    } else if (summary) {
      sessionCount = summary.total_sessions_count || 1;
      currentLevel = summary.understanding_level || calculateUnderstandingLevel(sessionCount);
    }

    // Calculate progression
    const progression = getUnderstandingProgression(sessionCount);
    const nextIncrement = getNextSessionIncrement(sessionCount);

    // Calculate sessions needed to reach max
    let sessionsToMax = 0;
    let tempLevel = currentLevel;
    let tempSession = sessionCount;
    while (tempLevel < UNDERSTANDING_CONSTANTS.MAX_LEVEL && sessionsToMax < 100) {
      tempSession++;
      tempLevel = calculateUnderstandingLevel(tempSession);
      sessionsToMax++;
    }

    console.log(`[user-summary] Progression for ${userId}: ${sessionCount} sessions, ${currentLevel}% understanding`);

    return res.json({
      success: true,
      progression,
      currentLevel,
      nextIncrement,
      maxLevel: UNDERSTANDING_CONSTANTS.MAX_LEVEL,
      sessionsToMax: sessionsToMax > 0 ? sessionsToMax : 0
    } as ProgressionResponse);

  } catch (error) {
    console.error('[user-summary] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.'
    } as ProgressionResponse);
  }
});

/**
 * GET /api/user-summary/:userId/stats
 * Return quick stats about user's understanding
 */
router.get('/:userId/stats', async (req: Request, res: Response) => {
  const { userId } = req.params;

  console.log(`[user-summary] GET /${userId}/stats`);

  try {
    // Verify access
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    // Fetch summary
    const { data: summary, error } = await supabase
      .from('user_cumulative_summary')
      .select('understanding_level, total_sessions_count, total_messages_count, engagement_level, last_analysis_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stats.'
      });
    }

    const sessionCount = summary?.total_sessions_count || 0;
    const currentLevel = summary?.understanding_level || (sessionCount > 0 ? calculateUnderstandingLevel(sessionCount) : 0);
    const nextIncrement = getNextSessionIncrement(sessionCount);

    return res.json({
      success: true,
      stats: {
        understandingLevel: currentLevel,
        totalSessions: sessionCount,
        totalMessages: summary?.total_messages_count || 0,
        engagementLevel: summary?.engagement_level || 'new',
        lastAnalyzed: summary?.last_analysis_at || null,
        nextSessionBonus: nextIncrement,
        maxLevel: UNDERSTANDING_CONSTANTS.MAX_LEVEL,
        levelProgress: Math.round((currentLevel / UNDERSTANDING_CONSTANTS.MAX_LEVEL) * 100)
      }
    });

  } catch (error) {
    console.error('[user-summary] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.'
    });
  }
});

export default router;

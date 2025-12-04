import { Router, Request, Response } from 'express';
import { supabase } from '../supabase';
import {
  calculateUnderstandingLevel,
  getUnderstandingProgression,
  getNextSessionIncrement,
  UNDERSTANDING_CONSTANTS
} from '../lib/understandingLevelCalculator';

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

interface ProgressionStep {
  session: number;
  level: number;
  increment: number;
}

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
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

function verifyAccess(req: Request, requestedUserId: string): boolean {
  const sessionUserId = (req as any).session?.userId;

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

router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[user-summary] GET /${userId}`);
  try {
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own summary.'
      } as SummaryResponse);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Expected UUID.'
      } as SummaryResponse);
    }

    const { data: summary, error } = await supabase
      .from('user_cumulative_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
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

router.post('/:userId/generate', async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[user-summary] POST /${userId}/generate`);
  try {
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only generate your own summary.'
      } as GenerateResponse);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Expected UUID.'
      } as GenerateResponse);
    }

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

    // For now, return error that Edge Function is not available
    // In production, this would invoke the Edge Function
    console.log(`[user-summary] Edge Function not available, returning error`);
    return res.status(503).json({
      success: false,
      error: 'Summary generation via Edge Function is not yet configured. Please use the /api/summary/generate endpoint instead.'
    } as GenerateResponse);
  } catch (error) {
    console.error('[user-summary] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating summary.'
    } as GenerateResponse);
  }
});

router.get('/:userId/progression', async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[user-summary] GET /${userId}/progression`);
  try {
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own progression.'
      } as ProgressionResponse);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Expected UUID.'
      } as ProgressionResponse);
    }

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
      console.log(`[user-summary] No summary for ${userId}, using defaults`);
    } else if (summary) {
      sessionCount = summary.total_sessions_count || 1;
      currentLevel = summary.understanding_level || calculateUnderstandingLevel(sessionCount);
    }

    const progression = getUnderstandingProgression(sessionCount);
    const nextIncrement = getNextSessionIncrement(sessionCount);

    let sessionsToMax = 0;
    let tempLevel: number = currentLevel;
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

router.get('/:userId/stats', async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[user-summary] GET /${userId}/stats`);
  try {
    if (!verifyAccess(req, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

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


/**
 * =============================================================================
 * SUPABASE EDGE FUNCTION: user-summary
 * =============================================================================
 * 
 * Handles all user summary endpoints:
 * - GET /{userId} - Fetch user's cumulative summary
 * - POST /{userId}/generate - Trigger summary generation
 * - GET /{userId}/progression - Get understanding level progression
 * - GET /{userId}/stats - Get quick stats
 * 
 * Replaces: server/routes/user-summary.ts
 * Includes logic from: server/lib/understandingLevelCalculator.ts
 * =============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// =============================================================================
// CORS HEADERS
// =============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// =============================================================================
// UNDERSTANDING LEVEL CALCULATOR (from server/lib/understandingLevelCalculator.ts)
// =============================================================================

const MAX_UNDERSTANDING_LEVEL = 75;
const BASE_UNDERSTANDING_LEVEL = 25;

interface UnderstandingStep {
  session: number;
  level: number;
  increment: number;
}

function getIncrementForSession(sessionNumber: number): number {
  if (sessionNumber <= 1) return 0;
  if (sessionNumber === 2) return 10;
  if (sessionNumber <= 4) return 5;
  if (sessionNumber <= 6) return 2.5;
  if (sessionNumber <= 8) return 1.5;
  if (sessionNumber <= 10) return 1;
  if (sessionNumber <= 14) return 0.5;
  if (sessionNumber <= 20) return 0.25;
  return 0.1;
}

function roundToDecimal(value: number, decimals: number = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

function calculateUnderstandingLevel(sessionCount: number): number {
  if (sessionCount <= 0) return 0;
  
  let level = BASE_UNDERSTANDING_LEVEL;
  
  for (let session = 2; session <= sessionCount; session++) {
    const increment = getIncrementForSession(session);
    level += increment;
    
    if (level >= MAX_UNDERSTANDING_LEVEL) {
      return MAX_UNDERSTANDING_LEVEL;
    }
  }
  
  return roundToDecimal(level);
}

function getUnderstandingProgression(sessionCount: number): UnderstandingStep[] {
  const progression: UnderstandingStep[] = [];
  
  if (sessionCount <= 0) return progression;
  
  let currentLevel = BASE_UNDERSTANDING_LEVEL;
  
  progression.push({
    session: 1,
    level: roundToDecimal(currentLevel),
    increment: 0
  });
  
  for (let session = 2; session <= sessionCount; session++) {
    const increment = getIncrementForSession(session);
    currentLevel += increment;
    
    const cappedLevel = Math.min(currentLevel, MAX_UNDERSTANDING_LEVEL);
    const actualIncrement = session === 2 
      ? increment 
      : roundToDecimal(cappedLevel - progression[progression.length - 1].level);
    
    progression.push({
      session,
      level: roundToDecimal(cappedLevel),
      increment: roundToDecimal(actualIncrement)
    });
    
    if (cappedLevel >= MAX_UNDERSTANDING_LEVEL) break;
  }
  
  return progression;
}

function getNextSessionIncrement(currentSessionCount: number): number {
  const currentLevel = calculateUnderstandingLevel(currentSessionCount);
  
  if (currentLevel >= MAX_UNDERSTANDING_LEVEL) return 0;
  
  const nextSession = currentSessionCount + 1;
  const increment = getIncrementForSession(nextSession);
  
  if (currentLevel + increment > MAX_UNDERSTANDING_LEVEL) {
    return roundToDecimal(MAX_UNDERSTANDING_LEVEL - currentLevel);
  }
  
  return increment;
}

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /{userId} - Fetch user's cumulative summary
 */
async function handleGetSummary(supabase: any, userId: string): Promise<Response> {
  console.log(`[user-summary] GET /${userId}`);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid user ID format. Expected UUID.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch summary from database
  const { data: summary, error } = await supabase
    .from('user_cumulative_summary')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`[user-summary] No summary found for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No summary found for this user. Start chatting to generate insights!' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('[user-summary] Database error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch user summary. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[user-summary] Found summary for user ${userId} (understanding: ${summary.understanding_level}%)`);

  return new Response(
    JSON.stringify({ success: true, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /{userId}/generate - Trigger summary generation
 */
async function handleGenerateSummary(supabase: any, userId: string): Promise<Response> {
  console.log(`[user-summary] POST /${userId}/generate`);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid user ID format. Expected UUID.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.log(`[user-summary] User not found: ${userId}`);
    return new Response(
      JSON.stringify({ success: false, error: 'User not found.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Invoke the generate-user-summary Edge Function
  console.log(`[user-summary] Invoking generate-user-summary Edge Function...`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-user-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[user-summary] Edge Function error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate summary. The AI service may be temporarily unavailable.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    if (!result?.success) {
      console.error('[user-summary] Edge Function returned failure:', result);
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Summary generation failed.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[user-summary] Summary generated successfully for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: result.summary,
        stats: result.stats,
        message: 'User summary generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[user-summary] Failed to invoke Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to connect to summary generation service.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /{userId}/progression - Get understanding level progression
 */
async function handleGetProgression(supabase: any, userId: string): Promise<Response> {
  console.log(`[user-summary] GET /${userId}/progression`);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid user ID format. Expected UUID.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch summary to get session count
  const { data: summary, error } = await supabase
    .from('user_cumulative_summary')
    .select('total_sessions_count, understanding_level')
    .eq('user_id', userId)
    .single();

  let sessionCount = 1;
  let currentLevel = BASE_UNDERSTANDING_LEVEL;

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[user-summary] Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user data.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
  while (tempLevel < MAX_UNDERSTANDING_LEVEL && sessionsToMax < 100) {
    tempSession++;
    tempLevel = calculateUnderstandingLevel(tempSession);
    sessionsToMax++;
  }

  console.log(`[user-summary] Progression for ${userId}: ${sessionCount} sessions, ${currentLevel}% understanding`);

  return new Response(
    JSON.stringify({
      success: true,
      progression,
      currentLevel,
      nextIncrement,
      maxLevel: MAX_UNDERSTANDING_LEVEL,
      sessionsToMax: sessionsToMax > 0 ? sessionsToMax : 0
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * GET /{userId}/stats - Get quick stats
 */
async function handleGetStats(supabase: any, userId: string): Promise<Response> {
  console.log(`[user-summary] GET /${userId}/stats`);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid user ID format. Expected UUID.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch summary
  const { data: summary, error } = await supabase
    .from('user_cumulative_summary')
    .select('understanding_level, total_sessions_count, total_messages_count, engagement_level, last_analysis_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch stats.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const sessionCount = summary?.total_sessions_count || 0;
  const currentLevel = summary?.understanding_level || (sessionCount > 0 ? calculateUnderstandingLevel(sessionCount) : 0);
  const nextIncrement = getNextSessionIncrement(sessionCount);

  return new Response(
    JSON.stringify({
      success: true,
      stats: {
        understandingLevel: currentLevel,
        totalSessions: sessionCount,
        totalMessages: summary?.total_messages_count || 0,
        engagementLevel: summary?.engagement_level || 'new',
        lastAnalyzed: summary?.last_analysis_at || null,
        nextSessionBonus: nextIncrement,
        maxLevel: MAX_UNDERSTANDING_LEVEL,
        levelProgress: Math.round((currentLevel / MAX_UNDERSTANDING_LEVEL) * 100)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = getSupabaseClient();

  try {
    // Parse URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p && p !== 'user-summary');
    
    console.log('[user-summary] Path parts:', pathParts);

    // Extract userId and action from path
    // Path formats:
    // /user-summary/{userId} - GET summary
    // /user-summary/{userId}/generate - POST generate
    // /user-summary/{userId}/progression - GET progression
    // /user-summary/{userId}/stats - GET stats

    if (pathParts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = pathParts[0];
    const action = pathParts[1] || null;

    // Route to appropriate handler
    if (req.method === 'GET') {
      if (action === 'progression') {
        return await handleGetProgression(supabase, userId);
      } else if (action === 'stats') {
        return await handleGetStats(supabase, userId);
      } else if (!action) {
        return await handleGetSummary(supabase, userId);
      }
    } else if (req.method === 'POST') {
      if (action === 'generate') {
        return await handleGenerateSummary(supabase, userId);
      }
    }

    // Unknown route
    return new Response(
      JSON.stringify({ success: false, error: 'Unknown endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[user-summary] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

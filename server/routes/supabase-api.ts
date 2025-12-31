import { Router, Request, Response } from 'express';
import { supabase, PERSONA_CONFIGS, isSupabaseConfigured, type PersonaType, type User, type Session, type Message, type UsageStats } from '../supabase';
import { getPersona } from '../persona-engine/personaLoader';
import { personaExists } from '../personas';
import { checkPremiumStatus } from '../utils/checkPremiumStatus';

const router = Router();

// Development user UUID (consistent for testing)
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

// NOTE: /api/session and /api/messages routes are defined in chat.ts to avoid duplicates

// Get current user
router.get('/api/user', async (req: Request, res: Response) => {
  try {
    // For now, use a dev user - in production, get from session
    const userId = (req as any).session?.userId || DEV_USER_ID;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[/api/user] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      // Return dev user for development
      return res.json({
        id: userId,
        name: 'Dev User',
        email: 'dev@example.com',
        gender: 'male',
        persona: 'sweet_supportive',
        premium_user: false,
        locale: 'hi-IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    res.json(user);
  } catch (error: any) {
    console.error('[/api/user] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.patch('/api/user', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const updates = req.body;

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/user] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error: any) {
    console.error('[PATCH /api/user] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user persona
router.patch('/api/user/persona', async (req: Request, res: Response) => {
  try {
    console.log('[PATCH /api/user/persona] Request body:', JSON.stringify(req.body));
    
    // Get userId from request body, session, or fallback to dev
    const userId = req.body?.userId || (req as any).session?.userId || DEV_USER_ID;
    const { persona: requestedPersonaId } = req.body as { persona: string; userId?: string };

    if (!requestedPersonaId) {
      console.error('[PATCH /api/user/persona] No persona ID provided in request');
      return res.status(400).json({ error: 'Persona ID is required' });
    }

    console.log(`[PATCH /api/user/persona] Requested persona: ${requestedPersonaId}, User: ${userId}`);

    // Map old persona IDs to new ones (for accepting old IDs from frontend)
    const oldToNewPersonaMap: Record<string, string> = {
      'sweet_supportive': 'sweet_supportive',
      'playful_flirty': 'flirtatious',  // Map old to new
      'flirtatious': 'flirtatious',
      'playful': 'playful',
      'bold_confident': 'dominant',     // Map old to new
      'dominant': 'dominant',
      'calm_mature': 'calm_mature',
    };

    // Map new persona IDs to old ones for database storage (backward compatibility)
    const personaIdToOldType: Record<string, PersonaType> = {
      'sweet_supportive': 'sweet_supportive',
      'flirtatious': 'playful_flirty',
      'playful': 'playful_flirty',
      'dominant': 'bold_confident',
      'calm_mature': 'calm_mature',
    };

    // Convert old persona ID to new one if needed
    const normalizedPersonaId = oldToNewPersonaMap[requestedPersonaId] || requestedPersonaId;
    console.log(`[PATCH /api/user/persona] Original: ${requestedPersonaId}, Normalized: ${normalizedPersonaId}`);

    // Validate using persona engine - check if persona actually exists (not just fallback)
    const personaExistsCheck = personaExists(normalizedPersonaId);
    console.log(`[PATCH /api/user/persona] Persona exists check: ${personaExistsCheck} for ID: ${normalizedPersonaId}`);
    
    if (!personaExistsCheck) {
      console.error(`[PATCH /api/user/persona] Invalid persona ID: ${requestedPersonaId} (normalized: ${normalizedPersonaId})`);
      const availablePersonas = ['sweet_supportive', 'flirtatious', 'playful', 'dominant', 'calm_mature'];
      return res.status(400).json({ 
        error: `Invalid persona type: ${requestedPersonaId}`,
        available: availablePersonas
      });
    }
    
    // Get the persona (will be valid since we checked existence)
    const persona = getPersona(normalizedPersonaId);
    console.log(`[PATCH /api/user/persona] Loaded persona: ${persona.id} (${persona.name})`);

    // Get old persona type for database storage (backward compatibility)
    const oldPersonaType = personaIdToOldType[persona.id] || persona.id as PersonaType;

    // If Supabase is not configured, just return success (dev mode)
    if (!isSupabaseConfigured) {
      console.log(`[PATCH /api/user/persona] Dev mode: User ${userId} selected persona: ${persona.id} (${persona.name})`);
      return res.json({
        success: true,
        persona: persona.id,
        personaConfig: {
          id: persona.id,
          name: persona.name,
          description: persona.description,
        },
        message: 'Persona updated (dev mode - not persisted)'
      });
    }

    // Try to update in Supabase (using old type for backward compatibility)
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        persona: oldPersonaType, // Store old type in database
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/user/persona] Supabase error:', error);
      // Fallback to dev mode if Supabase fails
      console.log(`[PATCH /api/user/persona] Falling back to dev mode for persona: ${persona.id}`);
      return res.json({
        success: true,
        persona: persona.id,
        personaConfig: {
          id: persona.id,
          name: persona.name,
          description: persona.description,
        },
        message: 'Persona updated (dev mode - Supabase unavailable)'
      });
    }

    res.json({ 
      success: true, 
      persona: persona.id,
      personaConfig: {
        id: persona.id,
        name: persona.name,
        description: persona.description,
      }
    });
  } catch (error: any) {
    console.error('[PATCH /api/user/persona] Error:', error);
    // Even on error, try to return success if persona is valid
    const { persona: requestedPersonaId } = req.body as { persona: string };
    if (requestedPersonaId) {
      const persona = getPersona(requestedPersonaId);
      if (persona) {
        return res.json({
          success: true,
          persona: persona.id,
          personaConfig: {
            id: persona.id,
            name: persona.name,
            description: persona.description,
          },
          message: 'Persona updated (dev mode - error handled)'
        });
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// Get user usage stats
router.get('/api/user/usage', async (req: Request, res: Response) => {
  try {
    // Get userId from query params, session, or fallback to dev
    const userId = (req.query?.userId as string) || (req as any).session?.userId || DEV_USER_ID;

    // Try to get usage stats - if table doesn't exist, use defaults
    let stats = { total_messages: 0, total_call_seconds: 0 };
    let isPremium = false;
    let subscriptionPlan: string | undefined = undefined;
    let user: any = null;

    try {
      const { data: usage, error } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && usage) {
        stats = usage;
      } else if (error && error.code !== 'PGRST116') {
        console.error('[/api/user/usage] Supabase error:', error);
      }

      // Fetch user data to check premium status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('premium_user, subscription_plan, subscription_expiry')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        user = userData;
        isPremium = userData.premium_user || false;
        subscriptionPlan = userData.subscription_plan;
        
        // Also check if subscription hasn't expired
        if (isPremium && userData.subscription_expiry) {
          const expiry = new Date(userData.subscription_expiry);
          const now = new Date();
          if (expiry < now) {
            // Subscription expired, downgrade user
            console.log(`[User Usage] Subscription expired for user ${userId}, downgrading...`);
            isPremium = false;
            await supabase
              .from('users')
              .update({ premium_user: false, updated_at: new Date().toISOString() })
              .eq('id', userId);
          }
        }
      } else if (userError) {
        console.error('[/api/user/usage] Error fetching user:', userError);
      }
    } catch (e) {
      // Supabase connection issue - use defaults
      console.log('[/api/user/usage] Using default stats:', e);
    }

    // Calculate message limit (1000 for free users, unlimited for premium)
    const messageLimit = isPremium ? 999999 : 1000;
    const messageLimitReached = !isPremium && stats.total_messages >= messageLimit;

    res.json({
      messageCount: stats.total_messages,
      callDuration: stats.total_call_seconds,
      premiumUser: isPremium,
      subscriptionPlan: subscriptionPlan,
      messageLimitReached: messageLimitReached,
      callLimitReached: !isPremium && stats.total_call_seconds >= 135,
    });
  } catch (error: any) {
    console.error('[/api/user/usage] Error:', error);
    // Return default stats instead of error
    res.json({
      messageCount: 0,
      callDuration: 0,
      premiumUser: false,
      messageLimitReached: false,
      callLimitReached: false,
    });
  }
});

// Increment message count
router.post('/api/user/usage', async (req: Request, res: Response) => {
  try {
    // Get userId from request body (frontend sends it), session, or fallback to dev
    const userId = req.body?.userId || (req as any).session?.userId || DEV_USER_ID;
    const { incrementMessages, incrementCallSeconds } = req.body;

    // Handle backdoor user - return premium status without database queries
    if (userId === 'backdoor-user-id' || userId === '00000000-0000-0000-0000-000000000001') {
      console.log(`[User Usage] Backdoor user detected: ${userId} - returning premium status`);
      return res.json({
        messageCount: 0,
        callDuration: 0,
        premiumUser: true,
        subscriptionPlan: 'daily',
        messageLimitReached: false,
        callLimitReached: false,
      });
    }

    let currentMessages = 0;
    let currentSeconds = 0;
    let isPremium = false;
    let subscriptionPlan: string | undefined = undefined;

    try {
      // Get current usage
      const { data: current } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      currentMessages = current?.total_messages || 0;
      currentSeconds = current?.total_call_seconds || 0;

      const { data, error } = await supabase
        .from('usage_stats')
        .upsert({
          user_id: userId,
          total_messages: currentMessages + (incrementMessages || 0),
          total_call_seconds: currentSeconds + (incrementCallSeconds || 0),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        currentMessages = data.total_messages;
        currentSeconds = data.total_call_seconds;
      } else if (error) {
        console.error('[POST /api/user/usage] Supabase error:', error);
      }

      // Use unified premium status check (same as chat endpoint)
      // This ensures consistency across all endpoints
      try {
        const premiumStatus = await checkPremiumStatus(supabase, userId);
        isPremium = premiumStatus.isPremium;
        subscriptionPlan = premiumStatus.planType || (isPremium ? 'daily' : null);
        
        console.log(`[User Usage] User ${userId} premium status: ${isPremium} (Source: ${premiumStatus.source}, Plan: ${subscriptionPlan || 'N/A'})`);
        
        // If premium check failed but we have a valid UUID, log more details
        if (!isPremium && premiumStatus.source === 'none') {
          console.warn(`[User Usage] ⚠️ Premium check returned false for user ${userId}. Checking database directly...`);
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('premium_user, subscription_tier, subscription_plan')
            .eq('id', userId)
            .single();
          
          if (userError) {
            console.error(`[User Usage] Database error checking user ${userId}:`, userError);
          } else if (userData) {
            console.log(`[User Usage] User data from DB:`, {
              premium_user: userData.premium_user,
              subscription_tier: userData.subscription_tier,
              subscription_plan: userData.subscription_plan
            });
          } else {
            console.warn(`[User Usage] User ${userId} not found in database`);
          }
        }
      } catch (premiumCheckError) {
        console.error('[User Usage] Error checking premium status:', premiumCheckError);
        // Fallback: check user table (legacy support)
        const { data: userData } = await supabase
          .from('users')
          .select('premium_user, subscription_plan')
          .eq('id', userId)
          .single();
        
        if (userData) {
          isPremium = userData.premium_user || false;
          subscriptionPlan = userData.subscription_plan;
          console.log(`[User Usage] Fallback: Using user table data - premium: ${isPremium}`);
        }
      }
    } catch (e) {
      console.log('[POST /api/user/usage] Using local counters:', e);
    }

    // Calculate message limit (1000 for free users, unlimited for premium)
    const messageLimit = isPremium ? 999999 : 1000;
    const finalMessageCount = currentMessages + (incrementMessages || 0);
    const messageLimitReached = !isPremium && finalMessageCount >= messageLimit;

    res.json({
      messageCount: finalMessageCount,
      callDuration: currentSeconds + (incrementCallSeconds || 0),
      premiumUser: isPremium,
      subscriptionPlan: subscriptionPlan,
      messageLimitReached: messageLimitReached,
      callLimitReached: !isPremium && (currentSeconds + (incrementCallSeconds || 0)) >= 135,
    });
  } catch (error: any) {
    console.error('[POST /api/user/usage] Error:', error);
    res.json({ messageCount: 0, callDuration: 0 });
  }
});

// Get user summary
router.get('/api/user/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    const { data: summary, error } = await supabase
      .from('user_summary_latest')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[/api/user/summary] Supabase error:', error);
    }

    if (!summary) {
      return res.json({
        partner_type_one_liner: null,
        top_3_traits_you_value: [],
        what_you_might_work_on: [],
        next_time_focus: [],
        love_language_guess: null,
        communication_fit: null,
        confidence_score: 30
      });
    }

    res.json(summary);
  } catch (error: any) {
    console.error('[/api/user/summary] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat sessions
router.get('/api/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[/api/sessions] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(sessions || []);
  } catch (error: any) {
    console.error('[/api/sessions] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/api/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { type = 'chat' } = req.body;

    // Get user's current persona
    const { data: user } = await supabase
      .from('users')
      .select('persona, persona_prompt')
      .eq('id', userId)
      .single();

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        type,
        persona_snapshot: user?.persona_prompt || {},
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/sessions] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(session);
  } catch (error: any) {
    console.error('[POST /api/sessions] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a session
router.get('/api/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[/api/sessions/:id/messages] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(messages || []);
  } catch (error: any) {
    console.error('[/api/sessions/:id/messages] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save message
router.post('/api/messages', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { session_id, role, text, tag = 'general' } = req.body;

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        session_id,
        user_id: userId,
        role,
        text,
        tag
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/messages] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(message);
  } catch (error: any) {
    console.error('[POST /api/messages] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get persona configs
router.get('/api/personas', async (_req: Request, res: Response) => {
  res.json(PERSONA_CONFIGS);
});

export default router;

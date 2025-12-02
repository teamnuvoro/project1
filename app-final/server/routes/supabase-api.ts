import { Router, Request, Response } from 'express';
import { supabase, PERSONA_CONFIGS, type PersonaType, type User, type Session, type Message, type UsageStats } from '../supabase';

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
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { persona } = req.body as { persona: PersonaType };

    if (!persona || !PERSONA_CONFIGS[persona]) {
      return res.status(400).json({ error: 'Invalid persona type' });
    }

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        persona,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/user/persona] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, persona, personaConfig: PERSONA_CONFIGS[persona] });
  } catch (error: any) {
    console.error('[PATCH /api/user/persona] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user usage stats
router.get('/api/user/usage', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    // Try to get usage stats - if table doesn't exist, use defaults
    let stats = { total_messages: 0, total_call_seconds: 0 };
    let isPremium = false;

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

      const { data: user } = await supabase
        .from('users')
        .select('premium_user')
        .eq('id', userId)
        .single();

      isPremium = user?.premium_user || false;
    } catch (e) {
      // Supabase connection issue - use defaults
      console.log('[/api/user/usage] Using default stats');
    }

    res.json({
      messageCount: stats.total_messages,
      callDuration: stats.total_call_seconds,
      premiumUser: isPremium,
      messageLimitReached: !isPremium && stats.total_messages >= 20,
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
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { incrementMessages, incrementCallSeconds } = req.body;

    let currentMessages = 0;
    let currentSeconds = 0;

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
    } catch (e) {
      console.log('[POST /api/user/usage] Using local counters');
    }

    res.json({
      messageCount: currentMessages + (incrementMessages || 0),
      callDuration: currentSeconds + (incrementCallSeconds || 0)
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

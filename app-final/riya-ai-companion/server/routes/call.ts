import { Router, Request, Response } from 'express';
import { supabase } from '../supabase';

const router = Router();

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

interface CallSession {
  id: string;
  user_id: string;
  vapi_call_id?: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'aborted';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  transcript?: string;
  metadata?: Record<string, any>;
}

router.get('/api/call/config', async (req: Request, res: Response) => {
  try {
    const publicKey = process.env.VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(503).json({ 
        ready: false, 
        error: 'Voice calling not configured' 
      });
    }

    res.json({ 
      ready: true,
      publicKey 
    });
  } catch (error: any) {
    console.error('[/api/call/config] Error:', error);
    res.status(500).json({ ready: false, error: error.message });
  }
});

router.post('/api/call/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { vapiCallId, metadata } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, premium_user')
      .eq('id', userId)
      .single();

    const { data: usageStats } = await supabase
      .from('usage_stats')
      .select('call_duration_seconds')
      .eq('user_id', userId)
      .single();

    const totalUsed = usageStats?.call_duration_seconds || 0;
    const isPremium = existingUser?.premium_user || false;
    const FREE_LIMIT = 135;

    if (!isPremium && totalUsed >= FREE_LIMIT) {
      return res.status(403).json({ 
        error: 'Call limit reached',
        limitReached: true 
      });
    }

    const { data: session, error } = await supabase
      .from('call_sessions')
      .insert({
        user_id: userId,
        vapi_call_id: vapiCallId,
        status: 'started',
        started_at: new Date().toISOString(),
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/call/start] Supabase error:', error);
      
      return res.json({
        id: `local-${Date.now()}`,
        user_id: userId,
        status: 'started',
        started_at: new Date().toISOString(),
        remainingSeconds: isPremium ? Infinity : Math.max(0, FREE_LIMIT - totalUsed)
      });
    }

    await supabase
      .from('user_events')
      .insert({
        user_id: userId,
        event_type: 'call_started',
        call_session_id: session.id,
        metadata: { vapi_call_id: vapiCallId }
      });

    res.json({
      ...session,
      remainingSeconds: isPremium ? Infinity : Math.max(0, FREE_LIMIT - totalUsed)
    });
  } catch (error: any) {
    console.error('[POST /api/call/start] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/call/end', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { sessionId, vapiCallId, durationSeconds, transcript, endReason } = req.body;

    let callSession: CallSession | null = null;

    if (sessionId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      callSession = data;
    } else if (vapiCallId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('vapi_call_id', vapiCallId)
        .single();
      callSession = data;
    }

    if (callSession) {
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          transcript
        })
        .eq('id', callSession.id);

      if (updateError) {
        console.error('[POST /api/call/end] Update error:', updateError);
      }

      await supabase
        .from('user_events')
        .insert({
          user_id: userId,
          event_type: 'call_ended',
          call_session_id: callSession.id,
          metadata: { 
            duration_seconds: durationSeconds,
            end_reason: endReason 
          }
        });
    }

    if (durationSeconds && durationSeconds > 0) {
      const { data: currentUsage } = await supabase
        .from('usage_stats')
        .select('call_duration_seconds')
        .eq('user_id', userId)
        .single();

      const currentSeconds = currentUsage?.call_duration_seconds || 0;

      const { error: upsertError } = await supabase
        .from('usage_stats')
        .upsert({
          user_id: userId,
          call_duration_seconds: currentSeconds + durationSeconds,
          last_call_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[POST /api/call/end] Usage update error:', upsertError);
      }
    }

    res.json({ success: true, durationSeconds });
  } catch (error: any) {
    console.error('[POST /api/call/end] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/call/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    const { data: sessions, error } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[/api/call/history] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(sessions || []);
  } catch (error: any) {
    console.error('[/api/call/history] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/call/webhook', async (req: Request, res: Response) => {
  try {
    const { type, call } = req.body;

    console.log('[Vapi Webhook] Received:', type, call?.id);

    switch (type) {
      case 'call.started':
        if (call?.id) {
          await supabase
            .from('call_sessions')
            .update({ status: 'in_progress' })
            .eq('vapi_call_id', call.id);
        }
        break;

      case 'call.ended':
        if (call?.id) {
          const duration = call.endedAt && call.startedAt 
            ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
            : 0;

          await supabase
            .from('call_sessions')
            .update({
              status: 'completed',
              ended_at: call.endedAt || new Date().toISOString(),
              duration_seconds: duration
            })
            .eq('vapi_call_id', call.id);
        }
        break;

      case 'transcript':
        if (call?.id && call?.transcript) {
          await supabase
            .from('call_sessions')
            .update({ transcript: call.transcript })
            .eq('vapi_call_id', call.id);
        }
        break;
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[/api/call/webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

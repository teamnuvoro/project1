import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';
import { 
  createBolnaCall, 
  endBolnaCall, 
  getBolnaCallStatus, 
  isBolnaConfigured 
} from '../services/bolna';
import { getConversationMemory } from '../services/sarvam';

const router = Router();

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

interface CallSession {
  id: string;
  user_id: string;
  vapi_call_id?: string;
  sarvam_call_id?: string;
  bolna_call_id?: string; // Added for Bolna support
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'aborted';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  transcript?: string;
  metadata?: Record<string, any>;
}

router.get('/api/call/config', async (req: Request, res: Response) => {
  try {
    // Check for Bolna API key first (preferred)
    if (isBolnaConfigured()) {
      const agentId = process.env.BOLNA_AGENT_ID;
      console.log('[Call Config] Using Bolna AI for voice calls');
      return res.json({
        ready: true,
        provider: 'bolna',
        agentId: agentId,
        apiUrl: process.env.BOLNA_API_URL || 'https://api.bolna.ai/v1',
        // Note: API key is kept server-side for security
      });
    }

    // Fallback to Sarvam (legacy)
    const sarvamApiKey = process.env.SARVAM_API_KEY;
    if (sarvamApiKey) {
      console.log('[Call Config] Using Sarvam AI for voice calls (fallback)');
      return res.json({
        ready: true,
        provider: 'sarvam',
        apiKey: sarvamApiKey,
      });
    }

    // Fallback to Vapi (legacy)
    const publicKey = process.env.VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY;
    if (publicKey) {
      console.log('[Call Config] Using Vapi for voice calls (fallback)');
      return res.json({
        ready: true,
        provider: 'vapi',
        publicKey
      });
    }

    return res.status(503).json({
      ready: false,
      error: 'Voice calling not configured. Set BOLNA_API_KEY, SARVAM_API_KEY, or VAPI_PUBLIC_KEY',
      provider: null
    });
  } catch (error: any) {
    console.error('[/api/call/config] Error:', error);
    res.status(500).json({ ready: false, error: error.message });
  }
});

router.post('/api/call/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { bolnaCallId, vapiCallId, sarvamCallId, metadata, provider, phoneNumber } = req.body;

    if (!isSupabaseConfigured) {
      return res.json({
        id: `local-${Date.now()}`,
        user_id: userId,
        status: 'started',
        started_at: new Date().toISOString(),
        remainingSeconds: Infinity
      });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, premium_user, persona')
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

    // Determine provider and start call
    let finalCallId = bolnaCallId || vapiCallId || sarvamCallId;
    let finalProvider = provider || (isBolnaConfigured() ? 'bolna' : (process.env.SARVAM_API_KEY ? 'sarvam' : 'vapi'));

    // If using Bolna and no call ID provided, start a new Bolna call
    if (finalProvider === 'bolna' && isBolnaConfigured() && !finalCallId) {
      try {
        const agentId = process.env.BOLNA_AGENT_ID;
        if (!agentId) {
          throw new Error('BOLNA_AGENT_ID not configured');
        }

        // Get conversation memory for context
        const conversationHistory = await getConversationMemory(userId, 10);
        
        // Prepare context for Bolna agent
        const context: Record<string, any> = {
          user_id: userId,
          persona: existingUser?.persona || 'sweet_supportive',
        };

        // Add conversation history to context if needed
        if (conversationHistory.length > 0) {
          context.recent_conversation = conversationHistory.slice(-5); // Last 5 messages
        }

        const bolnaResponse = await createBolnaCall({
          userId,
          agentId,
          phoneNumber, // Optional: for outbound calls
          metadata: {
            ...metadata,
            user_id: userId,
            persona: existingUser?.persona,
          },
          context,
        });

        finalCallId = bolnaResponse.callId;
        console.log('[Call Start] Bolna call initiated:', finalCallId);
      } catch (bolnaError: any) {
        console.error('[Call Start] Bolna call failed:', bolnaError);
        // Fallback to other providers if Bolna fails
        if (process.env.SARVAM_API_KEY) {
          finalProvider = 'sarvam';
        } else {
          finalProvider = 'vapi';
        }
      }
    }

    const { data: session, error } = await supabase
      .from('call_sessions')
      .insert({
        user_id: userId,
        bolna_call_id: finalProvider === 'bolna' ? finalCallId : undefined,
        vapi_call_id: finalProvider === 'vapi' ? finalCallId : undefined,
        sarvam_call_id: finalProvider === 'sarvam' ? finalCallId : undefined,
        status: 'started',
        started_at: new Date().toISOString(),
        metadata: { 
          ...metadata, 
          provider: finalProvider,
          phone_number: phoneNumber 
        }
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
        metadata: { 
          bolna_call_id: finalProvider === 'bolna' ? finalCallId : undefined,
          vapi_call_id: finalProvider === 'vapi' ? finalCallId : undefined,
          sarvam_call_id: finalProvider === 'sarvam' ? finalCallId : undefined,
          provider: finalProvider
        }
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
    const { sessionId, bolnaCallId, vapiCallId, sarvamCallId, durationSeconds, transcript, endReason } = req.body;

    if (!isSupabaseConfigured) {
      return res.json({ success: true, durationSeconds });
    }

    let callSession: CallSession | null = null;

    if (sessionId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      callSession = data;
    } else if (bolnaCallId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('bolna_call_id', bolnaCallId)
        .single();
      callSession = data;
      
      // End the call in Bolna
      try {
        await endBolnaCall(bolnaCallId);
        console.log('[Call End] Bolna call ended:', bolnaCallId);
      } catch (error: any) {
        console.error('[Call End] Failed to end Bolna call:', error);
        // Continue even if Bolna end fails
      }
    } else if (vapiCallId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('vapi_call_id', vapiCallId)
        .single();
      callSession = data;
    } else if (sarvamCallId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('sarvam_call_id', sarvamCallId)
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

    if (!isSupabaseConfigured) {
      return res.json([]);
    }

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

router.post('/api/call/status', async (req: Request, res: Response) => {
  try {
    const { callId, provider } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'callId is required' });
    }

    if (provider === 'bolna' && isBolnaConfigured()) {
      try {
        const status = await getBolnaCallStatus(callId);
        return res.json(status);
      } catch (error: any) {
        console.error('[Call Status] Bolna error:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Fallback: get status from database
    if (!isSupabaseConfigured) {
      return res.json({ status: 'unknown' });
    }

    const { data: session } = await supabase
      .from('call_sessions')
      .select('*')
      .or(`bolna_call_id.eq.${callId},vapi_call_id.eq.${callId},sarvam_call_id.eq.${callId}`)
      .single();

    if (session) {
      return res.json({
        callId: session.bolna_call_id || session.vapi_call_id || session.sarvam_call_id,
        status: session.status,
        duration: session.duration_seconds,
        transcript: session.transcript,
      });
    }

    res.json({ status: 'not_found' });
  } catch (error: any) {
    console.error('[/api/call/status] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/call/webhook', async (req: Request, res: Response) => {
  try {
    const { type, call, event } = req.body;

    console.log('[Call Webhook] Received:', type, call?.id || event?.call_id);

    if (!isSupabaseConfigured) {
      return res.json({ received: true });
    }

    // Handle Bolna webhooks
    if (event?.call_id || call?.call_id) {
      const callId = event?.call_id || call?.call_id;
      const eventType = event?.type || type;

      switch (eventType) {
        case 'call.started':
        case 'call_started':
          await supabase
            .from('call_sessions')
            .update({ status: 'in_progress' })
            .eq('bolna_call_id', callId);
          break;

        case 'call.ended':
        case 'call_ended':
          const duration = event?.duration || call?.duration || 0;
          await supabase
            .from('call_sessions')
            .update({
              status: 'completed',
              ended_at: event?.ended_at || call?.ended_at || new Date().toISOString(),
              duration_seconds: duration
            })
            .eq('bolna_call_id', callId);
          break;

        case 'transcript':
        case 'transcript.updated':
          if (event?.transcript || call?.transcript) {
            await supabase
              .from('call_sessions')
              .update({ transcript: event?.transcript || call?.transcript })
              .eq('bolna_call_id', callId);
          }
          break;
      }
    }

    // Handle Vapi webhooks (legacy)
    if (call?.id && !call?.call_id) {
      switch (type) {
        case 'call.started':
          await supabase
            .from('call_sessions')
            .update({ status: 'in_progress' })
            .eq('vapi_call_id', call.id);
          break;

        case 'call.ended':
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
          break;

        case 'transcript':
          if (call?.transcript) {
            await supabase
              .from('call_sessions')
              .update({ transcript: call.transcript })
              .eq('vapi_call_id', call.id);
          }
          break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[/api/call/webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';
import { VapiClient } from '@vapi-ai/server-sdk';
import { startSarvamCall, getConversationMemory } from '../services/sarvam';
import { startBolnaCall, endBolnaCall } from '../services/bolna';

const router = Router();

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

interface CallSession {
  id: string;
  user_id: string;
  vapi_call_id?: string;
  sarvam_call_id?: string; // Added for Sarvam support
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
    // Check for Bolna API key first (new integration)
    const bolnaApiKey = process.env.BOLNA_API_KEY;
    const bolnaAgentId = process.env.BOLNA_AGENT_ID;
    
    if (bolnaApiKey && bolnaAgentId) {
      console.log('[Call Config] Using Bolna AI for voice calls');
      return res.json({
        ready: true,
        provider: 'bolna',
        apiKey: bolnaApiKey, // Frontend will use this
        agentId: bolnaAgentId,
        // Note: In production, don't expose full API key to frontend
        // Consider using a public key or token instead
      });
    }

    // Check for Sarvam API key (Version 2)
    const sarvamApiKey = process.env.SARVAM_API_KEY;
    
    if (sarvamApiKey) {
      console.log('[Call Config] Using Sarvam AI for voice calls');
      return res.json({
        ready: true,
        provider: 'sarvam',
        apiKey: sarvamApiKey, // Frontend will use this
        // Note: In production, don't expose full API key to frontend
        // Consider using a public key or token instead
      });
    }

    // Fallback to Vapi (legacy)
    let vapi: any = null;
    try {
      if (process.env.VAPI_PRIVATE_KEY) {
        vapi = new VapiClient({ token: process.env.VAPI_PRIVATE_KEY });
      } else {
        console.warn("[Vapi] VAPI_PRIVATE_KEY not found. Calls will fail.");
      }
    } catch (e) {
      console.error("[Vapi] Failed to initialize:", e);
    }
    const publicKey = process.env.VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY;

    if (!publicKey) {
      return res.status(503).json({
        ready: false,
        error: 'Voice calling not configured. Set BOLNA_API_KEY, SARVAM_API_KEY, or VAPI_PUBLIC_KEY',
        provider: null
      });
    }

    res.json({
      ready: true,
      provider: 'vapi',
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
    const { vapiCallId, sarvamCallId, bolnaCallId, metadata, provider } = req.body;

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

    // Determine provider priority: Bolna > Sarvam > Vapi
    let finalProvider = provider || 'vapi';
    let finalCallId = vapiCallId || sarvamCallId || bolnaCallId;

    // Check environment to determine default provider
    if (!provider) {
      if (process.env.BOLNA_API_KEY && process.env.BOLNA_AGENT_ID) {
        finalProvider = 'bolna';
      } else if (process.env.SARVAM_API_KEY) {
        finalProvider = 'sarvam';
      } else {
        finalProvider = 'vapi';
      }
    }

    // If using Bolna and no call ID provided, start a new Bolna call
    if (finalProvider === 'bolna' && !finalCallId) {
      try {
        // Get conversation memory for context
        const conversationHistory = await getConversationMemory(userId, 10);
        
        // Get user persona for system prompt
        const { data: userData } = await supabase
          .from('users')
          .select('persona')
          .eq('id', userId)
          .single();

        const systemPrompt = `You are Riya, a warm and caring AI companion. You speak in a mix of Hindi and English (Hinglish) naturally. You're supportive, understanding, and always there to listen. Keep responses conversational and empathetic.`;

        const bolnaResponse = await startBolnaCall({
          userId,
          agentId: process.env.BOLNA_AGENT_ID,
          conversationHistory,
          systemPrompt,
          voiceSettings: {
            voiceId: process.env.BOLNA_VOICE_ID,
            language: 'hi-IN',
          }
        });

        finalCallId = bolnaResponse.callId;
        console.log('[Call Start] Bolna call initiated:', finalCallId);
        console.log('[Call Start] Bolna WebSocket URL:', bolnaResponse.websocketUrl);
        
        // Store websocket URL in metadata for frontend
        if (bolnaResponse.websocketUrl) {
          metadata = { ...metadata, websocketUrl: bolnaResponse.websocketUrl };
        }
      } catch (bolnaError: any) {
        console.error('[Call Start] Bolna call failed:', bolnaError);
        // Fallback to next provider
      }
    }

    // If using Sarvam and no call ID provided, start a new Sarvam call
    if ((finalProvider === 'sarvam' || process.env.SARVAM_API_KEY) && !finalCallId) {
      try {
        // Get conversation memory for context
        const conversationHistory = await getConversationMemory(userId, 10);
        
        // Get user persona for system prompt
        const { data: userData } = await supabase
          .from('users')
          .select('persona')
          .eq('id', userId)
          .single();

        const systemPrompt = `You are Riya, a warm and caring AI companion. You speak in a mix of Hindi and English (Hinglish) naturally. You're supportive, understanding, and always there to listen. Keep responses conversational and empathetic.`;

        const sarvamResponse = await startSarvamCall({
          userId,
          conversationHistory,
          systemPrompt,
          voiceSettings: {
            language: 'hi-IN',
          }
        });

        finalCallId = sarvamResponse.callId;
        console.log('[Call Start] Sarvam call initiated:', finalCallId);
      } catch (sarvamError: any) {
        console.error('[Call Start] Sarvam call failed:', sarvamError);
        // Fallback to Vapi if Sarvam fails
      }
    }

    const { data: session, error } = await supabase
      .from('call_sessions')
      .insert({
        user_id: userId,
        vapi_call_id: finalProvider === 'vapi' ? finalCallId : undefined,
        sarvam_call_id: finalProvider === 'sarvam' ? finalCallId : undefined,
        bolna_call_id: finalProvider === 'bolna' ? finalCallId : undefined,
        status: 'started',
        started_at: new Date().toISOString(),
        metadata: { ...metadata, provider: finalProvider }
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
        bolna_call_id: finalProvider === 'bolna' ? finalCallId : undefined,
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
          vapi_call_id: vapiCallId,
          sarvam_call_id: sarvamCallId,
          bolna_call_id: bolnaCallId,
          provider: finalProvider
        }
      });

    const responseData: any = {
      ...session,
      bolna_call_id: finalProvider === 'bolna' ? finalCallId : session.bolna_call_id,
      remainingSeconds: isPremium ? Infinity : Math.max(0, FREE_LIMIT - totalUsed)
    };
    
    // Include websocket URL if available (for Bolna WebSocket calls)
    if (finalProvider === 'bolna' && metadata?.websocketUrl) {
      responseData.websocket_url = metadata.websocketUrl;
    }
    
    res.json(responseData);
  } catch (error: any) {
    console.error('[POST /api/call/start] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/call/end', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const { sessionId, vapiCallId, sarvamCallId, bolnaCallId, durationSeconds, transcript, endReason, provider } = req.body;

    // End the call on the provider side if needed
    if (provider === 'bolna' && bolnaCallId) {
      try {
        await endBolnaCall(bolnaCallId);
        console.log('[Call End] Bolna call ended:', bolnaCallId);
      } catch (error: any) {
        console.error('[Call End] Failed to end Bolna call:', error);
      }
    }

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
    } else if (sarvamCallId) {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('sarvam_call_id', sarvamCallId)
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

router.post('/api/call/webhook', async (req: Request, res: Response) => {
  try {
    const { type, call } = req.body;

    console.log('[Vapi Webhook] Received:', type, call?.id);

    if (!isSupabaseConfigured) {
      return res.json({ received: true });
    }

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


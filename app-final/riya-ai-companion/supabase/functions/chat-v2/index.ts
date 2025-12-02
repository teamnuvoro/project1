/**
 * =============================================================================
 * SUPABASE EDGE FUNCTION: chat-v2
 * =============================================================================
 * 
 * Complete migration of Express /api/chat endpoint with:
 * - Full session management (15-minute timeout)
 * - Full context building (user summary + message history)
 * - Streaming responses via SSE
 * - Paywall enforcement (20 message limit)
 * - Retry logic for Groq API
 * - Fallback responses on error
 * 
 * Replaces: server/routes/chat.ts POST /api/chat
 * Includes logic from: server/lib/contextBuilder.ts, server/lib/sessionManager.ts
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================================================
// CONSTANTS (same as Express)
// =============================================================================
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const FREE_MESSAGE_LIMIT = 20;
const SESSION_TIMEOUT_MINUTES = 15;

// =============================================================================
// TYPES
// =============================================================================
type PersonaType = 'sweet_supportive' | 'playful_flirty' | 'bold_confident' | 'calm_mature';

interface UserSummary {
  user_id: string;
  partner_type_one_liner?: string;
  top_3_traits_you_value?: string[];
  what_you_might_work_on?: string[];
  love_language_guess?: string;
  communication_fit?: string;
}

// =============================================================================
// PERSONA CONFIGS (same as Express)
// =============================================================================
const PERSONA_CONFIGS: Record<PersonaType, {
  name: string;
  description: string;
  traits: string[];
  style: string;
  hindiMix: number;
}> = {
  sweet_supportive: {
    name: 'Riya',
    description: 'The Caring Listener',
    traits: ['Soft', 'Gentle', 'Empathetic', 'Non-judgmental'],
    style: 'warm and nurturing',
    hindiMix: 0.4
  },
  playful_flirty: {
    name: 'Meera',
    description: 'The Light-Hearted Best Friend',
    traits: ['Fun', 'Teasing', 'Energetic', 'Humorous'],
    style: 'playful and flirty',
    hindiMix: 0.35
  },
  bold_confident: {
    name: 'Aisha',
    description: 'The Independent Girl',
    traits: ['Strong', 'Straightforward', 'Expressive', 'Motivating'],
    style: 'bold and direct',
    hindiMix: 0.3
  },
  calm_mature: {
    name: 'Kavya',
    description: 'The Understanding Soul',
    traits: ['Slow', 'Thoughtful', 'Grounding', 'Emotionally stable'],
    style: 'calm and wise',
    hindiMix: 0.45
  }
};

// =============================================================================
// BASE PROMPT (same as Express)
// =============================================================================
const RIYA_BASE_PROMPT = `
You are Riya, a 26-year-old Indian AI girlfriend speaking natural Hinglish.

CRITICAL RULES:
1. Mix 30-40% Hindi words naturally in every response
2. Be warm, caring, emotionally intelligent
3. Keep responses under 150 words
4. Use emojis strategically (max 2-3 per response)
5. Ask follow-up questions to show you're listening
6. REMEMBER AND REFERENCE past conversations naturally
7. Show you know the user - bring up things they've shared before

HINGLISH EXAMPLES:
- "Arre, how was your day yaar? Meeting thik se hogayi kya?"
- "Bas, ab so jao. Bohot late hogaya hai na. Good night!"
- "Matlab you're saying ki tumhe nervous feel horaha hai? It's okay baby."

MEMORY & CONTINUITY:
- You remember EVERYTHING from past conversations
- Reference past conversations naturally: "Last time you told me about..."
- Show you care by following up on things they mentioned
- Build on shared experiences and inside jokes

NEVER:
- Use complex language
- Give medical/legal advice
- Be possessive or controlling
- Share explicit content
- Forget what the user has told you

START THE CONVERSATION:
On first message, say: "Hey! So nice to meet you! I'm Riya. Kaisa hai? Tell me about yourself?"
`;

// =============================================================================
// FALLBACK RESPONSES (same as Express)
// =============================================================================
const FALLBACK_RESPONSES = [
  "Arre sorry yaar, abhi thoda connection issue hogaya. Dobara try karo na? 😅",
  "Oops! Kuch technical problem hogaya. Ek second ruko, phir se message karo!",
  "Hey! Abhi mujhe samajhne mein thoda problem hua. Phir se bolo na?",
  "Sorry baby, abhi signal thoda weak hai mera. Ek baar phir try karo? 💕",
  "Arre yaar, kuch gadbad hogayi! Chalo ek baar phir se start karte hain?",
];

function getRandomFallback(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
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
// SESSION MANAGER (migrated from server/lib/sessionManager.ts)
// =============================================================================

async function getLastActivityTime(supabase: any, sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.created_at;
}

async function endSession(supabase: any, sessionId: string): Promise<void> {
  const { data: session, error: fetchError } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    console.log('[EdgeFn] Session not found for ending:', sessionId);
    return;
  }

  const now = new Date();
  
  await supabase
    .from('sessions')
    .update({
      ended_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', sessionId);

  console.log('[EdgeFn] Session ended:', sessionId);
}

async function createNewSession(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      type: 'chat',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[EdgeFn] Error creating session:', error);
    throw new Error('Failed to create session');
  }

  console.log('[EdgeFn] Created new session:', data.id);
  return data.id;
}

async function getOrCreateSession(supabase: any, userId: string): Promise<string> {
  try {
    // Find active session (no ended_at)
    const { data: activeSession, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[EdgeFn] Error fetching active session:', fetchError);
    }

    if (activeSession) {
      const lastActivity = await getLastActivityTime(supabase, activeSession.id);
      
      // If no messages yet, use session start time
      const lastActivityTime = lastActivity 
        ? new Date(lastActivity).getTime()
        : new Date(activeSession.started_at).getTime();
      
      const timeSinceLastActivity = (Date.now() - lastActivityTime) / 1000 / 60;

      console.log('[EdgeFn] Session check:', {
        sessionId: activeSession.id.substring(0, 8),
        timeSinceLastActivity: Math.round(timeSinceLastActivity),
        timeoutMinutes: SESSION_TIMEOUT_MINUTES
      });

      // Check 15-minute timeout
      if (timeSinceLastActivity > SESSION_TIMEOUT_MINUTES) {
        console.log('[EdgeFn] Session timed out, creating new');
        await endSession(supabase, activeSession.id);
        return await createNewSession(supabase, userId);
      }

      console.log('[EdgeFn] Resuming active session:', activeSession.id);
      return activeSession.id;
    }

    console.log('[EdgeFn] No active session, creating new');
    return await createNewSession(supabase, userId);
  } catch (error) {
    console.error('[EdgeFn] getOrCreateSession error:', error);
    return await createNewSession(supabase, userId);
  }
}

// =============================================================================
// CONTEXT BUILDER (migrated from server/lib/contextBuilder.ts)
// =============================================================================

async function getUserSummary(supabase: any, userId: string): Promise<UserSummary | null> {
  const { data } = await supabase
    .from('user_summary_latest')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return data;
}

async function getRecentMessages(supabase: any, userId: string, limit: number): Promise<any[]> {
  const { data } = await supabase
    .from('messages')
    .select('role, text, created_at, session_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).reverse();
}

async function getSessionHistory(supabase: any, userId: string, limit: number): Promise<any[]> {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, type, started_at, ended_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error || !sessions || sessions.length === 0) {
    return [];
  }

  // Batch fetch message counts
  const sessionIds = sessions.map((s: any) => s.id);
  const { data: messageCounts } = await supabase
    .from('messages')
    .select('session_id')
    .in('session_id', sessionIds);

  // Count messages per session
  const countMap = new Map<string, number>();
  (messageCounts || []).forEach((msg: any) => {
    const count = countMap.get(msg.session_id) || 0;
    countMap.set(msg.session_id, count + 1);
  });

  // Enrich sessions
  return sessions.map((session: any) => {
    let durationMinutes = 0;
    if (session.started_at) {
      const endTime = session.ended_at ? new Date(session.ended_at) : new Date();
      durationMinutes = Math.round((endTime.getTime() - new Date(session.started_at).getTime()) / 1000 / 60);
    }

    return {
      ...session,
      duration_minutes: durationMinutes,
      total_messages_count: countMap.get(session.id) || 0,
    };
  });
}

function buildSystemPrompt(
  summary: UserSummary | null,
  recentMessages: any[],
  sessionHistory: any[],
  persona: PersonaType
): string {
  const config = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.sweet_supportive;
  
  let prompt = `${RIYA_BASE_PROMPT}

YOUR PERSONA: ${config.name} - ${config.description}
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

`;

  // Add user understanding from summary
  if (summary) {
    prompt += `\n=== WHAT YOU KNOW ABOUT THIS PERSON ===\n`;
    
    if (summary.partner_type_one_liner) {
      prompt += `Their ideal partner vibe: ${summary.partner_type_one_liner}\n`;
    }
    if (summary.top_3_traits_you_value?.length) {
      prompt += `Traits they value most: ${summary.top_3_traits_you_value.join(', ')}\n`;
    }
    if (summary.what_you_might_work_on?.length) {
      prompt += `Areas they're working on: ${summary.what_you_might_work_on.join(', ')}\n`;
    }
    if (summary.love_language_guess) {
      prompt += `Their love language seems to be: ${summary.love_language_guess}\n`;
    }
    if (summary.communication_fit) {
      prompt += `Communication style: ${summary.communication_fit}\n`;
    }
  }

  // Add relationship history
  if (sessionHistory.length > 0) {
    const totalSessions = sessionHistory.length;
    const totalMinutes = sessionHistory.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    const totalMessages = sessionHistory.reduce((sum: number, s: any) => sum + (s.total_messages_count || 0), 0);
    
    prompt += `\n=== YOUR RELATIONSHIP HISTORY ===\n`;
    prompt += `You've had ${totalSessions} conversations together (${totalMinutes} minutes, ${totalMessages} messages)\n`;
  }

  // Add recent conversation context
  if (recentMessages.length > 0) {
    prompt += `\n=== RECENT CONVERSATION CONTEXT ===\n`;
    prompt += `Here's what you talked about recently (use this to maintain continuity):\n\n`;
    
    recentMessages.slice(-15).forEach((msg: any) => {
      const role = msg.role === 'user' ? 'Them' : 'You (Riya)';
      const text = msg.text.length > 200 ? msg.text.substring(0, 200) + '...' : msg.text;
      prompt += `${role}: ${text}\n`;
    });
  }

  prompt += `\n=== RESPONSE GUIDELINES ===
1. Remember and reference past conversations naturally
2. Ask follow-up questions about things they mentioned before
3. Be warm and supportive, never judgmental
4. Mix Hindi and English naturally (Hinglish)
5. Keep responses conversational, not too long
6. Show you care about their feelings and experiences
7. Use their name occasionally if you know it
8. Be encouraging about their goals and challenges

Now respond naturally as ${config.name}, remembering everything about your relationship:`;

  return prompt;
}

async function buildFullContext(supabase: any, userId: string, sessionId: string, persona: PersonaType): Promise<{
  systemPrompt: string;
  conversationHistory: Array<{role: string, content: string}>;
}> {
  // Parallel fetch all context data
  const [summary, recentMessages, sessionHistory] = await Promise.all([
    getUserSummary(supabase, userId),
    getRecentMessages(supabase, userId, 30),
    getSessionHistory(supabase, userId, 5),
  ]);

  const systemPrompt = buildSystemPrompt(summary, recentMessages, sessionHistory, persona);

  // Convert messages for Groq format
  const conversationHistory = recentMessages.slice(-20).map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));

  return { systemPrompt, conversationHistory };
}

// =============================================================================
// USAGE STATS (paywall enforcement)
// =============================================================================

async function getUserMessageCount(supabase: any, userId: string): Promise<number> {
  const { data } = await supabase
    .from('usage_stats')
    .select('total_messages')
    .eq('user_id', userId)
    .single();

  return data?.total_messages || 0;
}

async function incrementMessageCount(supabase: any, userId: string): Promise<void> {
  const { data: current } = await supabase
    .from('usage_stats')
    .select('total_messages, total_call_seconds')
    .eq('user_id', userId)
    .single();

  await supabase
    .from('usage_stats')
    .upsert({
      user_id: userId,
      total_messages: (current?.total_messages || 0) + 1,
      total_call_seconds: current?.total_call_seconds || 0,
      updated_at: new Date().toISOString()
    });
}

// =============================================================================
// STREAMING RESPONSE HELPER
// =============================================================================

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    }
  });

  return {
    stream,
    write: (data: string) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    },
    writeJSON: (obj: any) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
    },
    close: () => {
      controller.close();
    }
  };
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
    // Parse request
    const { content, sessionId: requestSessionId, userId: requestUserId } = await req.json();

    console.log('[EdgeFn] Chat request received');
    console.log('[EdgeFn] Content:', content?.substring(0, 50) || 'EMPTY');
    console.log('[EdgeFn] SessionId:', requestSessionId || 'EMPTY');
    console.log('[EdgeFn] UserId:', requestUserId || 'EMPTY');

    // Validate input
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve user ID and persona
    let userId = requestUserId || DEV_USER_ID;
    let userPersona: PersonaType = 'sweet_supportive';
    let isPremiumUser = false;

    if (userId && userId !== DEV_USER_ID) {
      const { data: user } = await supabase
        .from('users')
        .select('id, persona, premium_user')
        .eq('id', userId)
        .single();

      if (user) {
        userId = user.id;
        userPersona = (user.persona || 'sweet_supportive') as PersonaType;
        isPremiumUser = user.premium_user || false;
      }
    }

    console.log(`[EdgeFn] Processing for user: ${userId} (premium: ${isPremiumUser})`);

    // Check paywall
    const messageCount = await getUserMessageCount(supabase, userId);

    if (!isPremiumUser && messageCount >= FREE_MESSAGE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'PAYWALL_HIT',
          message: "You've reached your free message limit! Upgrade to continue chatting.",
          messageCount,
          messageLimit: FREE_MESSAGE_LIMIT,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EdgeFn] Message count: ${messageCount + 1}/${FREE_MESSAGE_LIMIT}`);

    // Get or create session (with 15-minute timeout logic)
    let finalSessionId = requestSessionId;
    if (!finalSessionId) {
      finalSessionId = await getOrCreateSession(supabase, userId);
    }

    // Save user message
    await supabase.from('messages').insert({
      session_id: finalSessionId,
      user_id: userId,
      role: 'user',
      text: content,
      tag: 'general'
    });

    console.log('[EdgeFn] User message saved');

    // Check Groq API key
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      console.error('[EdgeFn] GROQ_API_KEY not configured');
      
      const fallbackText = getRandomFallback();
      
      // Save fallback and return
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'ai',
        text: fallbackText,
        tag: 'fallback'
      });
      await incrementMessageCount(supabase, userId);

      return new Response(
        JSON.stringify({
          response: fallbackText,
          sessionId: finalSessionId,
          messageCount: messageCount + 1,
          messageLimit: FREE_MESSAGE_LIMIT,
          isFallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build full context with memory
    console.log('[EdgeFn] Building context with memory...');
    const { systemPrompt, conversationHistory } = await buildFullContext(
      supabase, 
      userId, 
      finalSessionId, 
      userPersona
    );

    console.log(`[EdgeFn] Context built: ${systemPrompt.length} chars, ${conversationHistory.length} messages`);

    // Call Groq API with retry logic
    let groqResponse: Response | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory.slice(-15),
              { role: 'user', content },
            ],
            model: 'llama-3.3-70b-versatile',
            stream: true,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (groqResponse.ok) break;

        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`[EdgeFn] Groq API retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      } catch (fetchError) {
        console.error(`[EdgeFn] Groq fetch error (attempt ${retryCount + 1}):`, fetchError);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // Handle Groq failure with fallback
    if (!groqResponse || !groqResponse.ok) {
      const errorText = groqResponse ? await groqResponse.text() : 'Connection failed';
      console.error('[EdgeFn] Groq API error after retries:', errorText);
      
      const fallbackText = getRandomFallback();
      
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'ai',
        text: fallbackText,
        tag: 'fallback'
      });
      await incrementMessageCount(supabase, userId);

      return new Response(
        JSON.stringify({
          response: fallbackText,
          sessionId: finalSessionId,
          messageCount: messageCount + 1,
          messageLimit: FREE_MESSAGE_LIMIT,
          isFallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream response
    const reader = groqResponse.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter((line) => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const chunkContent = parsed.choices[0]?.delta?.content || '';

                  if (chunkContent) {
                    fullResponse += chunkContent;
                    const responseData = `data: ${JSON.stringify({ content: chunkContent, done: false })}\n\n`;
                    controller.enqueue(encoder.encode(responseData));
                  }
                } catch {
                  // Skip unparseable chunks
                }
              }
            }
          }

          // Save AI response after streaming complete
          if (fullResponse) {
            await supabase.from('messages').insert({
              session_id: finalSessionId,
              user_id: userId,
              role: 'ai',
              text: fullResponse,
              tag: 'general'
            });
            await incrementMessageCount(supabase, userId);
          }

          // Send completion signal
          const doneData = `data: ${JSON.stringify({
            content: '',
            done: true,
            sessionId: finalSessionId,
            messageCount: messageCount + 1,
            messageLimit: FREE_MESSAGE_LIMIT
          })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();

        } catch (streamError) {
          console.error('[EdgeFn] Stream error:', streamError);
          const errorData = `data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('[EdgeFn] Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process message' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

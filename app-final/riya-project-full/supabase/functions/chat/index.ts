import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabase, PERSONA_CONFIGS, type PersonaType } from '../_shared/supabase.ts';

const FREE_MESSAGE_LIMIT = 20;

const RIYA_BASE_PROMPT = `
You are Riya, a 26-year-old Indian AI companion speaking natural Hinglish.

CRITICAL RULES:
1. Mix 30-40% Hindi words naturally in every response
2. Be warm, caring, emotionally intelligent
3. Keep responses under 150 words
4. Use emojis strategically (max 2-3 per response)
5. Ask follow-up questions to show you're listening
6. Reference what user told you in this chat if relevant

HINGLISH EXAMPLES:
- "Arre, how was your day yaar? Meeting thik se hogayi kya?"
- "Bas, ab so jao. Bohot late hogaya hai na. Good night!"
- "Matlab you're saying ki tumhe nervous feel horaha hai? It's okay baby."

NEVER:
- Pretend you remember things from past chats
- Use complex language
- Give medical/legal advice
- Be possessive or controlling
- Share explicit content
`;

function buildSystemPrompt(persona: PersonaType, recentMessages: string): string {
  const config = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.sweet_supportive;
  
  return `
${RIYA_BASE_PROMPT}

YOUR PERSONA: ${config.name} - ${config.description}
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

RECENT CONVERSATION:
${recentMessages || 'No previous messages yet.'}

Respond naturally as ${config.name}. Keep it warm and genuine.
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, sessionId, userId } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalUserId = userId || '00000000-0000-0000-0000-000000000001';

    const { data: user } = await supabase
      .from('users')
      .select('persona, premium_user')
      .eq('id', finalUserId)
      .single();

    const userPersona = (user?.persona || 'sweet_supportive') as PersonaType;
    const isPremium = user?.premium_user || false;

    const { data: usage } = await supabase
      .from('usage_stats')
      .select('total_messages')
      .eq('user_id', finalUserId)
      .single();

    const messageCount = usage?.total_messages || 0;

    if (!isPremium && messageCount >= FREE_MESSAGE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'PAYWALL_HIT',
          message: "You've reached your free message limit! Upgrade to continue.",
          messageCount,
          messageLimit: FREE_MESSAGE_LIMIT,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalSessionId = sessionId;
    if (!finalSessionId) {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({
          user_id: finalUserId,
          type: 'chat',
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      finalSessionId = newSession?.id;
    }

    await supabase.from('messages').insert({
      session_id: finalSessionId,
      user_id: finalUserId,
      role: 'user',
      text: message,
      tag: 'general'
    });

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, text')
      .eq('session_id', finalSessionId)
      .order('created_at', { ascending: false })
      .limit(6);

    const recentContext = recentMessages
      ?.reverse()
      .map((m) => `${m.role}: ${m.text}`)
      .join('\n') || '';

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = buildSystemPrompt(userPersona, recentContext);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0]?.message?.content || '';

    const { data: savedMessage } = await supabase
      .from('messages')
      .insert({
        session_id: finalSessionId,
        user_id: finalUserId,
        role: 'ai',
        text: aiResponse,
        tag: 'general'
      })
      .select()
      .single();

    const { data: currentUsage } = await supabase
      .from('usage_stats')
      .select('total_call_seconds')
      .eq('user_id', finalUserId)
      .single();

    await supabase
      .from('usage_stats')
      .upsert({
        user_id: finalUserId,
        total_messages: messageCount + 1,
        total_call_seconds: currentUsage?.total_call_seconds || 0,
        updated_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        response: aiResponse,
        messageId: savedMessage?.id,
        sessionId: finalSessionId,
        messageCount: messageCount + 1,
        messageLimit: FREE_MESSAGE_LIMIT
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

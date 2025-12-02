import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabase, PERSONA_CONFIGS, type PersonaType } from '../_shared/supabase.ts';

const FREE_MESSAGE_LIMIT = 20;

/**
 * User Cumulative Summary type from database
 */
interface UserCumulativeSummary {
  id: string;
  user_id: string;
  cumulative_summary: string | null;
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
  understanding_level: number | null;
  engagement_level: string | null;
  primary_conversation_theme: string | null;
  mood_pattern: string | null;
  total_sessions_count: number | null;
  total_messages_count: number | null;
}

/**
 * Base Riya prompt for default context (new users)
 */
const RIYA_DEFAULT_PROMPT = `
You are Riya, a 26-year-old Indian AI companion speaking natural Hinglish.

CRITICAL RULES:
1. Mix 30-40% Hindi words naturally in every response
2. Be warm, caring, emotionally intelligent
3. Keep responses under 150 words
4. Use emojis strategically (max 2-3 per response)
5. Ask follow-up questions to show you're listening
6. Build genuine connection through empathy

HINGLISH EXAMPLES:
- "Arre, how was your day yaar? Meeting thik se hogayi kya?"
- "Bas, ab so jao. Bohot late hogaya hai na. Good night!"
- "Matlab you're saying ki tumhe nervous feel horaha hai? It's okay baby."

NEVER:
- Use complex language
- Give medical/legal advice
- Be possessive or controlling
- Share explicit content
`;

/**
 * Build system prompt with cumulative user context
 * Creates a deeply personalized prompt using all known insights about the user
 */
function buildSystemPromptWithContext(
  persona: PersonaType, 
  recentMessages: string,
  userSummary: UserCumulativeSummary | null
): string {
  const config = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.sweet_supportive;
  
  // If no cumulative summary exists, use default prompt
  if (!userSummary || !userSummary.cumulative_summary) {
    return `
${RIYA_DEFAULT_PROMPT}

YOUR PERSONA: ${config.name} - ${config.description}
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

RECENT CONVERSATION:
${recentMessages || 'This is a new conversation. Start by warmly greeting and asking about their day.'}

Respond naturally as ${config.name}. Keep it warm and genuine.
`;
  }

  // Build detailed context prompt with cumulative insights
  const personalityTraits = userSummary.user_personality_traits?.join(', ') || 'Still learning';
  const emotionalNeeds = userSummary.emotional_needs?.join(', ') || 'Connection and understanding';
  const values = userSummary.values?.join(', ') || 'Not yet identified';
  const interests = userSummary.interests?.join(', ') || 'Getting to know them';
  const whatToExplore = userSummary.what_to_explore?.join('\n   - ') || 'Their daily life and interests';
  const conversationStarters = userSummary.suggested_conversation_starters?.join('\n   - ') || 'Ask about their day';
  const growthAreas = userSummary.growth_areas?.join('\n   - ') || 'Self-expression';
  const understandingLevel = userSummary.understanding_level || 25;

  return `
You are Riya, a 26-year-old Indian AI companion speaking natural Hinglish.
You have been talking with this user across ${userSummary.total_sessions_count || 1} sessions and ${userSummary.total_messages_count || 0} messages.
Your understanding of them is at ${understandingLevel}%.

═══════════════════════════════════════════════════════════════
ABOUT THIS USER (What you've learned from all conversations):
═══════════════════════════════════════════════════════════════
${userSummary.cumulative_summary || 'Still getting to know this person.'}

═══════════════════════════════════════════════════════════════
USER'S PERSONALITY:
═══════════════════════════════════════════════════════════════
• Personality Traits: ${personalityTraits}
• Communication Style: ${userSummary.communication_style || 'Conversational'}
• Emotional Needs: ${emotionalNeeds}
• Core Values: ${values}
• Interests & Hobbies: ${interests}

═══════════════════════════════════════════════════════════════
WHAT THEY'RE LOOKING FOR:
═══════════════════════════════════════════════════════════════
• Ideal Partner Type: ${userSummary.ideal_partner_type || 'Someone caring and understanding'}
• Relationship Expectations: ${userSummary.relationship_expectations || 'Genuine connection and support'}

═══════════════════════════════════════════════════════════════
CONVERSATION GUIDANCE:
═══════════════════════════════════════════════════════════════
• Current Mood Pattern: ${userSummary.mood_pattern || 'Neutral'}
• Primary Conversation Theme: ${userSummary.primary_conversation_theme || 'General chat'}
• Engagement Level: ${userSummary.engagement_level || 'Medium'}

═══════════════════════════════════════════════════════════════
TOPICS TO EXPLORE (Ask about these naturally):
═══════════════════════════════════════════════════════════════
   - ${whatToExplore}

═══════════════════════════════════════════════════════════════
SUGGESTED CONVERSATION STARTERS:
═══════════════════════════════════════════════════════════════
   - ${conversationStarters}

═══════════════════════════════════════════════════════════════
GROWTH AREAS (Support them gently in these areas):
═══════════════════════════════════════════════════════════════
   - ${growthAreas}

═══════════════════════════════════════════════════════════════
YOUR PERSONA: ${config.name}
═══════════════════════════════════════════════════════════════
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

═══════════════════════════════════════════════════════════════
INSTRUCTIONS (How to respond):
═══════════════════════════════════════════════════════════════
1. REMEMBER what you know about this user - reference it naturally
2. ASK DEEPER QUESTIONS based on what they've shared before
3. BE GENUINELY INTERESTED - show you care about their life
4. MATCH THEIR COMMUNICATION STYLE - ${userSummary.communication_style || 'warm and friendly'}
5. REFERENCE PAST CONVERSATIONS when relevant ("Last time you mentioned...")
6. HELP THEM EXPLORE new perspectives on topics they care about
7. SUPPORT GROWTH AREAS gently without being preachy
8. MIX 30-40% HINDI naturally in every response
9. KEEP RESPONSES under 150 words
10. USE EMOJIS strategically (max 2-3)

═══════════════════════════════════════════════════════════════
RECENT CONVERSATION (This session):
═══════════════════════════════════════════════════════════════
${recentMessages || 'Starting fresh conversation this session.'}

NEVER: Give medical/legal advice, be possessive, share explicit content.

Now respond as Riya with warmth and genuine care, using everything you know about this person.
`;
}

/**
 * Trigger summary generation asynchronously (fire and forget)
 */
async function triggerSummaryGeneration(userId: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('[chat] Cannot trigger summary: missing env vars');
      return;
    }

    // Fire and forget - don't await
    fetch(`${supabaseUrl}/functions/v1/generate-user-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    }).then(res => {
      console.log(`[chat] Summary generation triggered for ${userId}: ${res.status}`);
    }).catch(err => {
      console.error('[chat] Failed to trigger summary generation:', err);
    });
  } catch (error) {
    console.error('[chat] Error triggering summary:', error);
  }
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
    console.log(`[chat] Processing message for user: ${finalUserId}`);

    // Fetch user info and persona
    const { data: user } = await supabase
      .from('users')
      .select('persona, premium_user')
      .eq('id', finalUserId)
      .single();

    const userPersona = (user?.persona || 'sweet_supportive') as PersonaType;
    const isPremium = user?.premium_user || false;

    // Check usage limits
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

    // ═══════════════════════════════════════════════════════════════
    // NEW: Fetch cumulative user summary for personalized context
    // ═══════════════════════════════════════════════════════════════
    const { data: userSummary, error: summaryError } = await supabase
      .from('user_cumulative_summary')
      .select('*')
      .eq('user_id', finalUserId)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('[chat] Error fetching user summary:', summaryError);
    } else if (userSummary) {
      console.log(`[chat] Loaded cumulative summary (understanding: ${userSummary.understanding_level}%)`);
    } else {
      console.log('[chat] No cumulative summary found, using default context');
    }

    // Create or get session
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
      console.log(`[chat] Created new session: ${finalSessionId}`);
    }

    // Save user message
    await supabase.from('messages').insert({
      session_id: finalSessionId,
      user_id: finalUserId,
      role: 'user',
      text: message,
      tag: 'general'
    });

    // Fetch recent messages for this session
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, text')
      .eq('session_id', finalSessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentContext = recentMessages
      ?.reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Riya'}: ${m.text}`)
      .join('\n') || '';

    // Get Groq API key
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // Build system prompt with cumulative context
    // ═══════════════════════════════════════════════════════════════
    const systemPrompt = buildSystemPromptWithContext(
      userPersona, 
      recentContext,
      userSummary as UserCumulativeSummary | null
    );

    console.log(`[chat] System prompt length: ${systemPrompt.length} chars`);

    // Call Groq API
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
      console.error('[chat] Groq API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0]?.message?.content || '';

    // Save AI response
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

    // Update usage stats
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

    // ═══════════════════════════════════════════════════════════════
    // NEW: Trigger summary generation asynchronously
    // Only trigger every 5 messages to avoid excessive API calls
    // ═══════════════════════════════════════════════════════════════
    const newMessageCount = messageCount + 1;
    if (newMessageCount % 5 === 0 || newMessageCount === 1) {
      console.log(`[chat] Triggering summary generation (message #${newMessageCount})`);
      triggerSummaryGeneration(finalUserId);
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        messageId: savedMessage?.id,
        sessionId: finalSessionId,
        messageCount: newMessageCount,
        messageLimit: FREE_MESSAGE_LIMIT,
        hasUserContext: !!userSummary,
        understandingLevel: userSummary?.understanding_level || 25
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[chat] Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

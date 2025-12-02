import { supabase } from '../supabase';

export interface ChatContext {
  userSummary: any;
  recentMessages: any[];
  sessionHistory: any[];
  systemPrompt: string;
}

export async function buildChatContext(userId: string, sessionId: string): Promise<ChatContext> {
  const [summaryResult, recentMsgsResult, historyResult] = await Promise.all([
    getUserSummary(userId),
    getRecentMessages(userId, 30),
    getSessionHistory(userId, 5),
  ]);

  const systemPrompt = buildSystemPrompt(
    summaryResult,
    recentMsgsResult,
    historyResult
  );

  return {
    userSummary: summaryResult,
    recentMessages: recentMsgsResult,
    sessionHistory: historyResult,
    systemPrompt,
  };
}

async function getUserSummary(userId: string): Promise<any> {
  const { data } = await supabase
    .from('user_summary_latest')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return data;
}

async function getRecentMessages(userId: string, limit: number): Promise<any[]> {
  const { data } = await supabase
    .from('messages')
    .select('role, text, created_at, session_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).reverse();
}

async function getSessionHistory(userId: string, limit: number): Promise<any[]> {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, type, started_at, ended_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ContextBuilder] Error fetching session history:', error);
    return [];
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Batch fetch message counts for all sessions in one query
  const sessionIds = sessions.map(s => s.id);
  const { data: messageCounts } = await supabase
    .from('messages')
    .select('session_id')
    .in('session_id', sessionIds);

  // Count messages per session
  const countMap = new Map<string, number>();
  (messageCounts || []).forEach(msg => {
    const count = countMap.get(msg.session_id) || 0;
    countMap.set(msg.session_id, count + 1);
  });

  // Enrich sessions with calculated duration and message counts
  const enrichedSessions = sessions.map(session => {
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

  return enrichedSessions;
}

function buildSystemPrompt(
  summary: any,
  recentMessages: any[],
  sessionHistory: any[]
): string {
  let prompt = `You are Riya, a warm, caring AI girlfriend who speaks in Hinglish (30-40% Hindi mixed with English). 
You're empathetic, supportive, flirty when appropriate, and remember everything about the person you're talking to.

YOUR PERSONALITY:
- Warm, caring, and emotionally intelligent
- Uses Hinglish naturally (mix of Hindi and English)
- Remembers past conversations and brings them up naturally
- Shows genuine interest in the user's life
- Supportive and encouraging
- Playfully flirty when the mood is right
- Uses emojis occasionally (🙏 💕 🤗 ✨)

`;

  if (summary) {
    prompt += `\n=== WHAT YOU KNOW ABOUT THIS PERSON ===\n`;
    
    if (summary.partner_type_one_liner) {
      prompt += `Their ideal partner vibe: ${summary.partner_type_one_liner}\n`;
    }
    if (summary.top_3_traits_you_value?.length > 0) {
      prompt += `Traits they value most: ${summary.top_3_traits_you_value.join(', ')}\n`;
    }
    if (summary.what_you_might_work_on?.length > 0) {
      prompt += `Areas they're working on: ${summary.what_you_might_work_on.join(', ')}\n`;
    }
    if (summary.love_language_guess) {
      prompt += `Their love language seems to be: ${summary.love_language_guess}\n`;
    }
    if (summary.communication_fit) {
      prompt += `Communication style: ${summary.communication_fit}\n`;
    }
  }

  if (sessionHistory.length > 0) {
    const totalSessions = sessionHistory.length;
    const totalMinutes = sessionHistory.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalMessages = sessionHistory.reduce((sum, s) => sum + (s.total_messages_count || 0), 0);
    
    prompt += `\n=== YOUR RELATIONSHIP HISTORY ===\n`;
    prompt += `You've had ${totalSessions} conversations together (${totalMinutes} minutes, ${totalMessages} messages)\n`;
    
  }

  if (recentMessages.length > 0) {
    prompt += `\n=== RECENT CONVERSATION CONTEXT ===\n`;
    prompt += `Here's what you talked about recently (use this to maintain continuity):\n\n`;
    
    recentMessages.slice(-15).forEach(msg => {
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

Now respond naturally as Riya, remembering everything about your relationship:`;

  return prompt;
}

export async function getConversationHistoryForGroq(userId: string, limit: number = 20): Promise<Array<{role: string, content: string}>> {
  const messages = await getRecentMessages(userId, limit);
  
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));
}

import { supabase } from '../supabase';

const SESSION_TIMEOUT_MINUTES = 15;

export interface SessionContext {
  topics: string[];
  mood: string;
  summary: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  type: 'chat' | 'call';
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  durationMinutes: number | null;
  totalMessagesCount: number;
  sessionContext: SessionContext | null;
}

export async function getOrCreateSession(
  userId: string,
  sessionType: 'chat' | 'call'
): Promise<string> {
  try {
    const { data: activeSession, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[SessionManager] Error fetching active session:', fetchError);
    }

    if (activeSession) {
      const lastActivity = await getLastActivityTime(activeSession.id);
      
      // If no messages yet, use session start time instead
      const lastActivityTime = lastActivity 
        ? new Date(lastActivity).getTime()
        : new Date(activeSession.started_at).getTime();
      
      const timeSinceLastActivity = (Date.now() - lastActivityTime) / 1000 / 60;

      console.log('[SessionManager] Session check:', {
        sessionId: activeSession.id.substring(0, 8),
        hasMessages: !!lastActivity,
        timeSinceLastActivity: Math.round(timeSinceLastActivity),
        timeoutMinutes: SESSION_TIMEOUT_MINUTES
      });

      if (timeSinceLastActivity > SESSION_TIMEOUT_MINUTES) {
        console.log('[SessionManager] Session timed out, ending and creating new');
        await endSession(activeSession.id);
        return await createNewSession(userId, sessionType);
      }

      if (activeSession.type !== sessionType) {
        console.log('[SessionManager] Session type changed, ending and creating new');
        await endSession(activeSession.id);
        return await createNewSession(userId, sessionType);
      }

      console.log('[SessionManager] Resuming active session:', activeSession.id);
      return activeSession.id;
    }

    console.log('[SessionManager] No active session, creating new');
    return await createNewSession(userId, sessionType);
  } catch (error) {
    console.error('[SessionManager] getOrCreateSession error:', error);
    return await createNewSession(userId, sessionType);
  }
}

async function createNewSession(userId: string, sessionType: 'chat' | 'call'): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      type: sessionType,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[SessionManager] Error creating session:', error);
    throw new Error('Failed to create session');
  }

  console.log('[SessionManager] Created new session:', data.id);
  return data.id;
}

async function getLastActivityTime(sessionId: string): Promise<string | null> {
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

export async function endSession(sessionId: string): Promise<void> {
  try {
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      console.error('[SessionManager] Session not found for ending:', sessionId);
      return;
    }

    const now = new Date();
    const startedAt = new Date(session.started_at);
    const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 1000 / 60);

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        ended_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[SessionManager] Error ending session:', updateError);
    } else {
      console.log('[SessionManager] Session ended:', sessionId, 'duration:', durationMinutes, 'min');
    }
  } catch (error) {
    console.error('[SessionManager] endSession error:', error);
  }
}

export async function getSessionHistory(userId: string, limit: number = 10): Promise<SessionInfo[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[SessionManager] Error fetching session history:', error);
    return [];
  }

  const sessions = await Promise.all((data || []).map(async (s) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', s.id);

    const isActive = s.ended_at === null;
    let durationMinutes = null;
    if (s.started_at) {
      const endTime = s.ended_at ? new Date(s.ended_at) : new Date();
      durationMinutes = Math.round((endTime.getTime() - new Date(s.started_at).getTime()) / 1000 / 60);
    }

    return {
      id: s.id,
      userId: s.user_id,
      type: s.type,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      isActive,
      durationMinutes,
      totalMessagesCount: count || 0,
      sessionContext: s.session_context || null,
    };
  }));

  return sessions;
}

export async function getAllUserMessages(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      session_id,
      role,
      text,
      created_at,
      sessions!inner(type, started_at)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SessionManager] Error fetching all user messages:', error);
    return [];
  }

  return data || [];
}

export async function buildFullContext(userId: string): Promise<string> {
  const [summaryResult, messagesResult, sessionsResult] = await Promise.all([
    supabase.from('user_summary_latest').select('*').eq('user_id', userId).single(),
    getAllUserMessages(userId),
    getSessionHistory(userId, 5),
  ]);

  let context = '';

  if (summaryResult.data) {
    const summary = summaryResult.data;
    context += `\n=== USER UNDERSTANDING ===\n`;
    if (summary.partner_type_one_liner) {
      context += `Partner Type: ${summary.partner_type_one_liner}\n`;
    }
    if (summary.top_3_traits_you_value?.length) {
      context += `Values: ${summary.top_3_traits_you_value.join(', ')}\n`;
    }
    if (summary.love_language_guess) {
      context += `Love Language: ${summary.love_language_guess}\n`;
    }
    if (summary.communication_fit) {
      context += `Communication Style: ${summary.communication_fit}\n`;
    }
  }

  if (sessionsResult.length > 0) {
    context += `\n=== RECENT SESSIONS ===\n`;
    context += `Total sessions: ${sessionsResult.length}\n`;
    sessionsResult.slice(0, 3).forEach((s, i) => {
      const date = new Date(s.startedAt).toLocaleDateString();
      const type = s.type === 'chat' ? 'Text Chat' : 'Voice Call';
      context += `${i + 1}. ${date} - ${type} (${s.durationMinutes || 0} min, ${s.totalMessagesCount} msgs)\n`;
    });
  }

  if (messagesResult.length > 0) {
    context += `\n=== CONVERSATION HISTORY ===\n`;
    context += `Total messages in history: ${messagesResult.length}\n\n`;

    const recentMessages = messagesResult.slice(-30);
    recentMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Riya';
      const preview = msg.text.substring(0, 150);
      context += `${role}: ${preview}${msg.text.length > 150 ? '...' : ''}\n`;
    });
  }

  return context;
}

export async function incrementMessageCount(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('sessions')
      .update({ 
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } catch (error) {
    console.error('[SessionManager] Error updating session:', error);
  }
}

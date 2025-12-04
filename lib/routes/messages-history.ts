import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';

const router = Router();
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/messages/all - Get all messages for the user across all sessions
router.get('/api/messages/all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    if (!isSupabaseConfigured) {
      // Return empty array if Supabase is not configured
      return res.json([]);
    }

    // Get all sessions for the user
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('[Messages History] Error fetching sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }

    if (!sessions || sessions.length === 0) {
      return res.json([]);
    }

    const sessionIds = sessions.map(s => s.id);

    // Get all messages for these sessions
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[Messages History] Error fetching messages:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    console.log(`[Messages History] Found ${messages?.length || 0} messages for user ${userId}`);

    // Transform the data to match frontend expectations
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      content: msg.content || msg.text || '',
      role: msg.role,
      createdAt: msg.created_at,
      sessionId: msg.session_id,
    }));

    res.json(transformedMessages);

  } catch (error: any) {
    console.error('[Messages History] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch message history' });
  }
});

export default router;


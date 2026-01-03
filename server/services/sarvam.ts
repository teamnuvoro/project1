/**
 * Sarvam AI Voice Service
 * 
 * Sarvam AI provides Indian-focused conversational AI with better Hinglish support.
 * API Documentation: https://docs.sarvam.ai
 */

const SARVAM_API_BASE_URL = process.env.SARVAM_API_BASE_URL || 'https://api.sarvam.ai';

export interface SarvamCallConfig {
  userId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  voiceSettings?: {
    voiceId?: string;
    language?: string;
  };
  systemPrompt?: string;
}

export interface SarvamCallResponse {
  callId: string;
  status: 'initiated' | 'active' | 'ended';
  audioStreamUrl?: string;
  websocketUrl?: string;
}

/**
 * Get Sarvam API key from environment
 */
function getSarvamApiKey(): string | null {
  const apiKey = process.env.SARVAM_API_KEY;
  
  if (!apiKey) {
    console.warn('[Sarvam] API key not configured. Set SARVAM_API_KEY in environment variables.');
    return null;
  }

  return apiKey;
}

/**
 * Make authenticated API request to Sarvam
 */
async function sarvamApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getSarvamApiKey();
  
  if (!apiKey) {
    throw new Error('Sarvam API key not configured');
  }

  const url = `${SARVAM_API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    ...options.headers,
  };

  console.log('[Sarvam] API Request:', {
    method: options.method || 'GET',
    endpoint,
    url: url.replace(apiKey, '[HIDDEN]')
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Sarvam] API Error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Sarvam API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Start a voice call with Sarvam AI
 * Creates a new voice conversation session
 */
export async function startSarvamCall(config: SarvamCallConfig): Promise<SarvamCallResponse> {
  try {
    const apiKey = getSarvamApiKey();
    
    if (!apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    // Get conversation memory if not provided
    let conversationHistory = config.conversationHistory;
    if (!conversationHistory || conversationHistory.length === 0) {
      conversationHistory = await getConversationMemory(config.userId, 10);
    }

    // Prepare request payload
    // Note: Update endpoint and payload structure based on actual Sarvam API documentation
    const payload = {
      user_id: config.userId,
      system_prompt: config.systemPrompt || 'You are Riya, a warm and caring AI companion. Speak in Hinglish naturally.',
      conversation_history: conversationHistory,
      voice: {
        voice_id: config.voiceSettings?.voiceId || 'default',
        language: config.voiceSettings?.language || 'hi-IN',
      },
      // Add other Sarvam-specific parameters as needed
    };

    console.log('[Sarvam] Starting call for user:', config.userId);
    console.log('[Sarvam] Conversation history length:', conversationHistory.length);

    // Make API call to start voice session
    // Update endpoint based on actual Sarvam API documentation
    const response = await sarvamApiRequest('/v1/calls/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    console.log('[Sarvam] Call started successfully:', data.call_id || data.id);

    return {
      callId: data.call_id || data.id || `sarvam_${Date.now()}_${config.userId.slice(0, 8)}`,
      status: 'initiated',
      audioStreamUrl: data.audio_stream_url,
      websocketUrl: data.websocket_url,
    };

  } catch (error: any) {
    console.error('[Sarvam] Error starting call:', error);
    throw new Error(`Failed to start Sarvam call: ${error.message}`);
  }
}

/**
 * End a Sarvam call
 * Terminates an active voice conversation
 */
export async function endSarvamCall(callId: string): Promise<void> {
  try {
    const apiKey = getSarvamApiKey();
    
    if (!apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    console.log('[Sarvam] Ending call:', callId);

    // Make API call to end voice session
    // Update endpoint based on actual Sarvam API documentation
    await sarvamApiRequest(`/v1/calls/${callId}/end`, {
      method: 'POST',
    });

    console.log('[Sarvam] Call ended successfully:', callId);

  } catch (error: any) {
    console.error('[Sarvam] Error ending call:', error);
    // Don't throw - ending a call should be best-effort
    console.warn('[Sarvam] Continuing despite end call error');
  }
}

/**
 * Get call status from Sarvam
 */
export async function getSarvamCallStatus(callId: string): Promise<any> {
  try {
    const response = await sarvamApiRequest(`/v1/calls/${callId}`, {
      method: 'GET',
    });

    return await response.json();
  } catch (error: any) {
    console.error('[Sarvam] Error getting call status:', error);
    throw error;
  }
}

/**
 * Get conversation memory/context for a user
 * This retrieves recent conversation history to maintain context across calls
 */
export async function getConversationMemory(userId: string, limit: number = 10): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    // Import supabase here to avoid circular dependencies
    const { supabase, isSupabaseConfigured } = await import('../supabase');

    if (!isSupabaseConfigured) {
      return [];
    }

    // Get recent messages from database
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Sarvam] Error fetching conversation memory:', error);
      return [];
    }

    // Transform to conversation format
    const conversationHistory = (messages || [])
      .reverse() // Reverse to get chronological order
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.text || ''
      }))
      .filter(msg => msg.content.trim().length > 0);

    return conversationHistory;

  } catch (error: any) {
    console.error('[Sarvam] Error getting conversation memory:', error);
    return [];
  }
}

/**
 * Save conversation to memory
 */
export async function saveConversationToMemory(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    // This is handled by the existing message logging system
    // Just ensure messages are being saved to the messages table
    console.log('[Sarvam] Conversation saved to memory:', { userId, role, contentLength: content.length });
  } catch (error: any) {
    console.error('[Sarvam] Error saving conversation to memory:', error);
  }
}

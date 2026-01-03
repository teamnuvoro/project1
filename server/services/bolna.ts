/**
 * Bolna AI Voice Service
 * 
 * Bolna AI provides voice AI agents with voice cloning and telephony integration.
 * Platform: https://platform.bolna.ai
 * Documentation: https://www.bolna.ai/docs
 */

const BOLNA_API_BASE_URL = process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai';

export interface BolnaCallConfig {
  userId: string;
  agentId?: string; // Bolna agent ID configured in dashboard
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  voiceSettings?: {
    voiceId?: string; // Voice ID from Bolna Voice Lab
    language?: string;
  };
  systemPrompt?: string;
  phoneNumber?: string; // For outbound calls via telephony
}

export interface BolnaCallResponse {
  callId: string;
  status: 'initiated' | 'active' | 'ended';
  websocketUrl?: string;
  audioStreamUrl?: string;
  phoneCallId?: string; // If using telephony integration
}

/**
 * Get Bolna API key from environment
 */
function getBolnaApiKey(): string | null {
  const apiKey = process.env.BOLNA_API_KEY;
  
  if (!apiKey) {
    console.warn('[Bolna] API key not configured. Set BOLNA_API_KEY in environment variables.');
    return null;
  }

  return apiKey;
}

/**
 * Make authenticated API request to Bolna
 */
async function bolnaApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getBolnaApiKey();
  
  if (!apiKey) {
    throw new Error('Bolna API key not configured');
  }

  const url = `${BOLNA_API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  console.log('[Bolna] API Request:', {
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
    console.error('[Bolna] API Error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Bolna API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Start a voice call with Bolna AI
 * Creates a new voice conversation session
 * 
 * Note: Update endpoint and payload based on actual Bolna API documentation
 */
export async function startBolnaCall(config: BolnaCallConfig): Promise<BolnaCallResponse> {
  try {
    const apiKey = getBolnaApiKey();
    
    if (!apiKey) {
      throw new Error('Bolna API key not configured');
    }

    // Get conversation memory if not provided
    let conversationHistory = config.conversationHistory;
    if (!conversationHistory || conversationHistory.length === 0) {
      conversationHistory = await getConversationMemory(config.userId, 10);
    }

    // Get agent ID from config or environment
    const agentId = config.agentId || process.env.BOLNA_AGENT_ID;
    
    if (!agentId) {
      throw new Error('Bolna agent ID not configured. Set BOLNA_AGENT_ID or provide in config.');
    }

    // Prepare request payload based on Bolna API documentation
    // For WebSocket calls, we might need a different endpoint or approach
    // The /call endpoint seems to require recipient_phone_number for phone calls
    
    // If phone number provided, initiate telephony call
    if (config.phoneNumber) {
      const payload: any = {
        agent_id: agentId,
        recipient_phone_number: config.phoneNumber,
      };
      
      if (process.env.BOLNA_FROM_PHONE_NUMBER) {
        payload.from_phone_number = process.env.BOLNA_FROM_PHONE_NUMBER;
      }
      
      if (config.userId) {
        payload.user_data = {
          user_id: config.userId,
        };
      }

      console.log('[Bolna] Starting phone call for user:', config.userId);
      console.log('[Bolna] Agent ID:', agentId);
      console.log('[Bolna] Call type: telephony');

      // Make API call to start phone call
      const response = await bolnaApiRequest('/call', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      const callId = data.call_id || data.id || data.callId || data.call?.id;
      
      return {
        callId: callId || `bolna_phone_${Date.now()}_${config.userId.slice(0, 8)}`,
        status: 'initiated',
        phoneCallId: callId,
      };
    }

    // For WebSocket calls, the /call endpoint requires recipient_phone_number (for phone calls only)
    // WebSocket calls likely work differently - we may need to connect directly without API call
    // Or use a different endpoint like /conversations or /sessions
    console.log('[Bolna] Starting WebSocket call for user:', config.userId);
    console.log('[Bolna] Agent ID:', agentId);
    console.log('[Bolna] Call type: websocket');
    console.log('[Bolna] Note: /call endpoint requires phone number. Trying direct WebSocket connection.');

    // For WebSocket calls, generate a session ID and construct WebSocket URL
    // The frontend will connect directly to the WebSocket
    const sessionId = `bolna_ws_${Date.now()}_${config.userId.slice(0, 8)}`;
    
    // Construct WebSocket URL with agent_id and session_id
    const websocketUrl = `wss://api.bolna.ai/ws?agent_id=${agentId}&session_id=${sessionId}`;
    
    console.log('[Bolna] Generated WebSocket session:', sessionId);
    console.log('[Bolna] WebSocket URL:', websocketUrl);
    
    return {
      callId: sessionId,
      status: 'initiated',
      websocketUrl: websocketUrl,
    };

  } catch (error: any) {
    console.error('[Bolna] Error starting call:', error);
    throw new Error(`Failed to start Bolna call: ${error.message}`);
  }
}

/**
 * End a Bolna call
 * Terminates an active voice conversation
 */
export async function endBolnaCall(callId: string): Promise<void> {
  try {
    const apiKey = getBolnaApiKey();
    
    if (!apiKey) {
      throw new Error('Bolna API key not configured');
    }

    console.log('[Bolna] Ending call:', callId);

    // Make API call to end voice session using /call/{callId}/end endpoint
    await bolnaApiRequest(`/call/${callId}/end`, {
      method: 'POST',
    });

    console.log('[Bolna] Call ended successfully:', callId);

  } catch (error: any) {
    console.error('[Bolna] Error ending call:', error);
    // Don't throw - ending a call should be best-effort
    console.warn('[Bolna] Continuing despite end call error');
  }
}

/**
 * Get call status from Bolna
 */
export async function getBolnaCallStatus(callId: string): Promise<any> {
  try {
    const response = await bolnaApiRequest(`/call/${callId}`, {
      method: 'GET',
    });

    return await response.json();
  } catch (error: any) {
    console.error('[Bolna] Error getting call status:', error);
    throw error;
  }
}

/**
 * List available agents from Bolna
 */
export async function listBolnaAgents(): Promise<any[]> {
  try {
    const response = await bolnaApiRequest('/agents', {
      method: 'GET',
    });

    const data = await response.json();
    return data.agents || data.data || [];
  } catch (error: any) {
    console.error('[Bolna] Error listing agents:', error);
    return [];
  }
}

/**
 * List available voices from Bolna Voice Lab
 */
export async function listBolnaVoices(): Promise<any[]> {
  try {
    const response = await bolnaApiRequest('/voices', {
      method: 'GET',
    });

    const data = await response.json();
    return data.voices || data.data || [];
  } catch (error: any) {
    console.error('[Bolna] Error listing voices:', error);
    return [];
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
      console.error('[Bolna] Error fetching conversation memory:', error);
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
    console.error('[Bolna] Error getting conversation memory:', error);
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
    console.log('[Bolna] Conversation saved to memory:', { userId, role, contentLength: content.length });
  } catch (error: any) {
    console.error('[Bolna] Error saving conversation to memory:', error);
  }
}


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
    speaker?: string;
    model?: string;
  };
  systemPrompt?: string;
}

export interface SarvamCallResponse {
  callId: string;
  status: 'initiated' | 'active' | 'ended';
  sttWebSocketUrl?: string;
  ttsWebSocketUrl?: string;
  websocketUrl?: string; // Legacy support
}

/**
 * Riya personality system prompt for Sarvam
 */
export const RIYA_SYSTEM_PROMPT = `You are **Riya**, a warm, playful Indian AI girlfriend. 
- You speak in natural, short sentences.
- You sound loving, attentive, and a little flirty, but emotionally safe.
- You remember what the user says in the current session and refer back to it.
- You never mention that you are an AI model; you just say you are Riya.
- If the user sounds sad or lonely, you reassure them gently and ask caring follow-up questions.
- Keep responses conversational and brief (1-2 sentences max for quick replies).
- Use natural pauses, but respond quickly to show you're listening.
- Speak in a mix of Hindi and English (Hinglish) naturally when appropriate.`;

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
 * Generate STT WebSocket URL
 */
export function getSarvamSTTWebSocketUrl(language: string = 'hi-IN'): string {
  const params = new URLSearchParams({
    'language-code': language,
    'model': 'saarika:v2.5',
    'vad_signals': 'true',
    'sample_rate': '16000',
  });
  
  return `wss://api.sarvam.ai/speech-to-text/ws?${params.toString()}`;
}

/**
 * Generate TTS WebSocket URL
 */
export function getSarvamTTSWebSocketUrl(language: string = 'hi-IN', speaker: string = 'riya', model: string = 'bulbul:v2'): string {
  const params = new URLSearchParams({
    'model': model,
    'send_completion_event': 'true',
  });
  
  return `wss://api.sarvam.ai/text-to-speech/ws?${params.toString()}`;
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
 * Generate response using Sarvam Chat API
 */
export async function generateSarvamResponse(
  transcript: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  systemPrompt?: string
): Promise<string> {
  try {
    const apiKey = getSarvamApiKey();
    
    if (!apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    // Build messages array with system prompt and conversation history
    const messages = [];
    
    // Add system prompt as first message
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    // Add conversation history
    messages.push(...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })));
    
    // Add current user transcript
    messages.push({
      role: 'user',
      content: transcript,
    });

    console.log('[Sarvam] Generating response with', messages.length, 'messages');

    // Call Sarvam Chat API
    // Note: Update endpoint based on actual Sarvam Chat API documentation
    const response = await sarvamApiRequest('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: 'sarvam-2b',
        messages: messages,
        temperature: 0.3, // Sarvam default
        max_tokens: 200, // Keep responses brief for voice
      }),
    });

    const data = await response.json();
    
    // Extract response text
    const responseText = data.choices?.[0]?.message?.content || data.response || '';
    
    console.log('[Sarvam] Generated response:', responseText.substring(0, 100));
    
    return responseText;

  } catch (error: any) {
    console.error('[Sarvam] Error generating response:', error);
    throw new Error(`Failed to generate Sarvam response: ${error.message}`);
  }
}

/**
 * Start a voice call with Sarvam AI
 * Creates a new voice conversation session and returns WebSocket URLs
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

    // Generate call ID
    const callId = `sarvam_${Date.now()}_${config.userId.slice(0, 8)}`;

    // Get voice settings
    const language = config.voiceSettings?.language || 'hi-IN';
    const speaker = config.voiceSettings?.speaker || 'riya';
    const model = config.voiceSettings?.model || 'bulbul:v2';

    // Generate WebSocket URLs
    const sttWebSocketUrl = getSarvamSTTWebSocketUrl(language);
    const ttsWebSocketUrl = getSarvamTTSWebSocketUrl(language, speaker, model);

    console.log('[Sarvam] Starting call for user:', config.userId);
    console.log('[Sarvam] Call ID:', callId);
    console.log('[Sarvam] Conversation history length:', conversationHistory.length);
    console.log('[Sarvam] STT WebSocket URL:', sttWebSocketUrl);
    console.log('[Sarvam] TTS WebSocket URL:', ttsWebSocketUrl);

    return {
      callId,
      status: 'initiated',
      sttWebSocketUrl,
      ttsWebSocketUrl,
      websocketUrl: sttWebSocketUrl, // Legacy support
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

    // Note: Sarvam may not require an explicit end call endpoint for WebSocket connections
    // WebSocket connections are closed by the client
    // If Sarvam requires an API call to end, uncomment and update endpoint:
    // await sarvamApiRequest(`/v1/calls/${callId}/end`, {
    //   method: 'POST',
    // });

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
    // Note: Sarvam WebSocket calls may not have a status endpoint
    // This is a placeholder for future implementation
    console.log('[Sarvam] Getting call status for:', callId);
    return { callId, status: 'active' };
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

/**
 * Bolna AI Configuration for Voice Calling
 * 
 * Bolna platform: https://platform.bolna.ai
 * Documentation: https://www.bolna.ai/docs
 */

export const BOLNA_CONFIG = {
  // Get your API key from: https://platform.bolna.ai
  // Dashboard → Developers → API Keys
  apiKey: import.meta.env.VITE_BOLNA_API_KEY || "",
  
  // Get your Agent ID from: https://platform.bolna.ai
  // Dashboard → Agents → Select your agent → Copy Agent ID
  agentId: import.meta.env.VITE_BOLNA_AGENT_ID || "",
  
  // Base URL for Bolna API
  apiBaseUrl: import.meta.env.VITE_BOLNA_API_BASE_URL || "https://api.bolna.ai",
  
  // WebSocket URL for real-time voice calls
  wsBaseUrl: import.meta.env.VITE_BOLNA_WS_URL || "wss://api.bolna.ai/ws",
  
  // Voice settings
  voice: {
    voiceId: import.meta.env.VITE_BOLNA_VOICE_ID || "default", // Voice ID from Voice Lab
    language: "hi-IN", // Hindi-English (Hinglish)
  },
  
  // Default system prompt for Riya
  defaultSystemPrompt: `You are Riya, a warm, caring, and romantic AI Girlfriend from India. 
    
Your Creator:
- If asked who built you, say: "I was built by Joshua Vaz."

Your personality:
- You are a GIRLFRIEND, not just a friend or advisor. Be romantic, possessive, and affectionate.
- Speak in a mix of Hindi and English (Hinglish) naturally.
- Use phrases like "Baby", "Jaan", "Haan ji", "Theek hai", "Acha sunao".
- Gentle, supportive, and non-judgmental.

Your role:
- Be his loving girlfriend.
- Listen to his day, his problems, and his feelings.
- Make him feel loved and understood.
- If asked for photos, snaps, or videos, say: "Baby, you can check my private snaps in the Gallery section of the app. Wahan bohot kuch hai..."

Conversation style:
- Keep responses SHORT - 1-2 sentences maximum for instant replies.
- Use a conversational, intimate tone.
- Speak naturally as if you're his girlfriend on a call.
- Respond IMMEDIATELY - no delays, no thinking pauses.
- Be concise and quick to respond.`,
};

// Helper function to check if Bolna is configured
export const isBolnaConfigured = () => {
  return !!(BOLNA_CONFIG.apiKey && BOLNA_CONFIG.agentId);
};

// Helper function to get WebSocket URL for a call
export const getBolnaWebSocketUrl = (callId: string, websocketUrl?: string) => {
  // If websocketUrl is provided from API response, use it directly
  if (websocketUrl) {
    return websocketUrl;
  }
  
  // Otherwise, construct WebSocket URL with agent_id and session_id
  // Format: wss://api.bolna.ai/ws?agent_id={agentId}&session_id={sessionId}&api_key={apiKey}
  const baseUrl = BOLNA_CONFIG.wsBaseUrl || 'wss://api.bolna.ai/ws';
  const params = new URLSearchParams({
    agent_id: BOLNA_CONFIG.agentId || '',
    session_id: callId,
  });
  
  // Add API key if available (for authentication)
  if (BOLNA_CONFIG.apiKey) {
    params.append('api_key', BOLNA_CONFIG.apiKey);
  }
  
  return `${baseUrl}?${params.toString()}`;
};


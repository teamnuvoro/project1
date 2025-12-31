/**
 * Bolna Voice AI Service
 * 
 * Bolna provides real-time voice AI calls with phone number support.
 * API Documentation: https://docs.bolna.ai
 */

import axios, { AxiosInstance } from 'axios';

const BOLNA_API_BASE_URL = process.env.BOLNA_API_URL || 'https://api.bolna.ai/v1';

export interface BolnaCallOptions {
  userId: string;
  agentId: string; // Bolna agent ID
  phoneNumber?: string; // For outbound calls
  metadata?: Record<string, any>;
  context?: Record<string, any>; // Custom variables for the agent
}

export interface BolnaCallResponse {
  callId: string;
  status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed';
  websocketUrl?: string;
  audioStreamUrl?: string;
}

export interface BolnaCallStatus {
  callId: string;
  status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed';
  duration?: number;
  transcript?: string;
  metadata?: Record<string, any>;
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
 * Create authenticated Axios instance for Bolna API
 */
function createBolnaClient(): AxiosInstance | null {
  const apiKey = getBolnaApiKey();
  
  if (!apiKey) {
    return null;
  }

  return axios.create({
    baseURL: BOLNA_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
  });
}

/**
 * Initialize Bolna client
 */
export function initializeBolnaClient(): AxiosInstance | null {
  const client = createBolnaClient();
  
  if (client) {
    console.log('[Bolna] Client initialized successfully');
  } else {
    console.error('[Bolna] Failed to initialize client - API key missing');
  }
  
  return client;
}

/**
 * Create a new voice call via Bolna
 */
export async function createBolnaCall(
  options: BolnaCallOptions
): Promise<BolnaCallResponse> {
  const client = createBolnaClient();
  
  if (!client) {
    throw new Error('Bolna API key not configured');
  }

  try {
    const payload: any = {
      agent_id: options.agentId,
      metadata: {
        user_id: options.userId,
        ...options.metadata,
      },
    };

    // For outbound calls, include phone number
    if (options.phoneNumber) {
      payload.phone_number = options.phoneNumber;
    }

    // Add context/variables for the agent
    if (options.context) {
      payload.context = options.context;
    }

    console.log('[Bolna] Creating call with payload:', {
      agent_id: options.agentId,
      has_phone: !!options.phoneNumber,
      has_context: !!options.context,
    });

    const response = await client.post('/calls', payload);
    
    const callData = response.data;
    
    console.log('[Bolna] Call created successfully:', {
      callId: callData.call_id || callData.id,
      status: callData.status,
    });

    return {
      callId: callData.call_id || callData.id,
      status: callData.status || 'initiated',
      websocketUrl: callData.websocket_url,
      audioStreamUrl: callData.audio_stream_url,
    };
  } catch (error: any) {
    console.error('[Bolna] Failed to create call:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to create Bolna call'
    );
  }
}

/**
 * End an active call
 */
export async function endBolnaCall(callId: string): Promise<void> {
  const client = createBolnaClient();
  
  if (!client) {
    throw new Error('Bolna API key not configured');
  }

  try {
    console.log('[Bolna] Ending call:', callId);
    
    await client.post(`/calls/${callId}/end`, {});
    
    console.log('[Bolna] Call ended successfully:', callId);
  } catch (error: any) {
    console.error('[Bolna] Failed to end call:', error.response?.data || error.message);
    // Don't throw - call might already be ended
    if (error.response?.status !== 404) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        'Failed to end Bolna call'
      );
    }
  }
}

/**
 * Get call status
 */
export async function getBolnaCallStatus(callId: string): Promise<BolnaCallStatus> {
  const client = createBolnaClient();
  
  if (!client) {
    throw new Error('Bolna API key not configured');
  }

  try {
    const response = await client.get(`/calls/${callId}`);
    const callData = response.data;
    
    return {
      callId: callData.call_id || callData.id,
      status: callData.status || 'ended',
      duration: callData.duration,
      transcript: callData.transcript,
      metadata: callData.metadata,
    };
  } catch (error: any) {
    console.error('[Bolna] Failed to get call status:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to get Bolna call status'
    );
  }
}

/**
 * Get call history for a user
 */
export async function getBolnaCallHistory(
  userId: string,
  limit: number = 50
): Promise<BolnaCallStatus[]> {
  const client = createBolnaClient();
  
  if (!client) {
    throw new Error('Bolna API key not configured');
  }

  try {
    const response = await client.get('/calls', {
      params: {
        user_id: userId,
        limit,
      },
    });
    
    const calls = response.data.calls || response.data || [];
    
    return calls.map((call: any) => ({
      callId: call.call_id || call.id,
      status: call.status || 'ended',
      duration: call.duration,
      transcript: call.transcript,
      metadata: call.metadata,
    }));
  } catch (error: any) {
    console.error('[Bolna] Failed to get call history:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to get Bolna call history'
    );
  }
}

/**
 * Check if Bolna is configured
 */
export function isBolnaConfigured(): boolean {
  return !!getBolnaApiKey();
}


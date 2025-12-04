/**
 * Supabase Edge Functions API Client
 * 
 * This module provides functions to call Supabase Edge Functions
 * for chat and user-summary endpoints.
 * 
 * MIGRATION: Replaces direct Express API calls with Edge Function calls
 * 
 * Uses the existing Supabase client for authenticated calls with proper JWT handling.
 */

import { supabase, isSupabaseConfigured } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xgraxcgavqeyqfwimbwt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Get authorization headers for Edge Function calls
 * Uses session token if available, falls back to anon key
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else if (SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
  } catch {
    if (SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
  }

  return headers;
}

// =============================================================================
// CHAT API
// =============================================================================

interface ChatStreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (data: { sessionId: string; messageCount: number; messageLimit: number }) => void;
  onError: (error: Error) => void;
}

/**
 * Send a chat message with streaming response
 * 
 * OLD: fetch('/api/chat', { method: 'POST', body: ... })
 * NEW: sendChatMessageStreaming(content, sessionId, userId, callbacks)
 * 
 * IMPORTANT: Caller should check isEdgeFunctionsConfigured() before calling.
 * This function throws if configuration is missing.
 */
export async function sendChatMessageStreaming(
  content: string,
  sessionId: string,
  userId: string,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<{ success: boolean; reason?: string }> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-v2`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ content, sessionId, userId }),
    signal,
  });

  // Handle paywall (402)
  if (response.status === 402) {
    return { success: false, reason: 'paywall' };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    callbacks.onError(new Error(errorData.error || `HTTP ${response.status}`));
    return { success: false, reason: 'error' };
  }

  // Check for JSON response BEFORE attempting SSE streaming
  // Edge Function may return JSON for limitExceeded, retry, or metadata
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      const data = await response.json();
      if (data.limitExceeded) {
        return { success: false, reason: 'limit' };
      }
      // Handle other JSON responses (retry, metadata)
      if (data.error) {
        callbacks.onError(new Error(data.error));
        return { success: false, reason: 'error' };
      }
    } catch {
      // If JSON parse fails, continue to SSE parsing
    }
  }

  // Read SSE stream - matching the Express API format exactly
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('No response stream'));
    return { success: false, reason: 'no_stream' };
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Only process SSE data lines
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Handle error in stream
            if (data.error) {
              callbacks.onError(new Error(data.error));
              return { success: false, reason: 'stream_error' };
            }

            // Handle stream completion
            if (data.done) {
              callbacks.onComplete({
                sessionId: data.sessionId,
                messageCount: data.messageCount,
                messageLimit: data.messageLimit || 100,
              });
              return { success: true };
            }

            // Handle content chunk
            if (data.content) {
              callbacks.onChunk(data.content);
            }
          } catch (parseError) {
            // Skip unparseable lines (e.g., comments, empty data)
            console.warn('[edgeFunctions] SSE parse error:', parseError);
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { success: false, reason: 'aborted' };
    }
    callbacks.onError(error as Error);
    return { success: false, reason: 'error' };
  }

  return { success: true };
}

// =============================================================================
// USER SUMMARY API
// =============================================================================

interface UserSummaryResponse {
  success: boolean;
  summary?: any;
  error?: string;
  isFirstTimeUser?: boolean;
}

interface ProgressionResponse {
  success: boolean;
  progression?: Array<{ session: number; level: number; increment: number }>;
  currentLevel?: number;
  nextIncrement?: number;
  maxLevel?: number;
  sessionsToMax?: number;
  error?: string;
}

interface StatsResponse {
  success: boolean;
  stats?: {
    understandingLevel: number;
    totalSessions: number;
    totalMessages: number;
    engagementLevel: string;
    lastAnalyzed: string | null;
    nextSessionBonus: number;
    maxLevel: number;
    levelProgress: number;
  };
  error?: string;
}

interface GenerateResponse {
  success: boolean;
  summary?: any;
  stats?: {
    sessions_analyzed: number;
    messages_analyzed: number;
    understanding_level: number;
  };
  message?: string;
  error?: string;
}

/**
 * Fetch user's cumulative summary
 * 
 * OLD: fetch(`/api/user-summary/${userId}`)
 * NEW: getUserSummary(userId)
 * 
 * IMPORTANT: Caller should check isEdgeFunctionsConfigured() before calling.
 */
export async function getUserSummary(userId: string): Promise<UserSummaryResponse> {
  const authHeaders = await getAuthHeaders();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 400) {
      return { success: true, summary: null, isFirstTimeUser: true };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: true, summary: null, isFirstTimeUser: true };
    }
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Trigger summary generation
 * 
 * OLD: fetch(`/api/user-summary/${userId}/generate`, { method: 'POST' })
 * NEW: generateUserSummary(userId)
 * 
 * IMPORTANT: Caller should check isEdgeFunctionsConfigured() before calling.
 */
export async function generateUserSummary(userId: string): Promise<GenerateResponse> {
  const authHeaders = await getAuthHeaders();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}/generate`, {
    method: 'POST',
    headers: authHeaders,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to generate' }));
    throw new Error(errorData.error || 'Failed to generate summary');
  }

  return response.json();
}

/**
 * Get understanding level progression
 * 
 * OLD: fetch(`/api/user-summary/${userId}/progression`)
 * NEW: getUnderstandingProgression(userId)
 * 
 * IMPORTANT: Caller should check isEdgeFunctionsConfigured() before calling.
 */
export async function getUnderstandingProgression(userId: string): Promise<ProgressionResponse> {
  const authHeaders = await getAuthHeaders();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}/progression`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    return { success: false };
  }

  return response.json();
}

/**
 * Get quick stats
 * 
 * OLD: fetch(`/api/user-summary/${userId}/stats`)
 * NEW: getUserStats(userId)
 * 
 * IMPORTANT: Caller should check isEdgeFunctionsConfigured() before calling.
 */
export async function getUserStats(userId: string): Promise<StatsResponse> {
  const authHeaders = await getAuthHeaders();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-summary/${userId}/stats`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    return { success: false };
  }

  return response.json();
}

// =============================================================================
// FEATURE FLAG: Enable/disable Edge Functions
// =============================================================================

/**
 * Check if Edge Functions should be used
 * Set VITE_USE_EDGE_FUNCTIONS=true in .env to enable
 * Defaults to true in production, false in development
 */
export const useEdgeFunctions = (): boolean => {
  const envFlag = import.meta.env.VITE_USE_EDGE_FUNCTIONS;
  if (envFlag !== undefined) {
    return envFlag === 'true' || envFlag === true;
  }
  // Default: use Edge Functions in production only
  return import.meta.env.PROD;
};

/**
 * Check if Supabase is properly configured for Edge Functions
 * Uses the isSupabaseConfigured flag from supabase.ts
 */
export const isEdgeFunctionsConfigured = (): boolean => {
  // Check both the module-level config and Supabase client config
  return isSupabaseConfigured && !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'mock-anon-key-for-development';
};

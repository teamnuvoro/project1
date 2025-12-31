import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured, PERSONA_CONFIGS, type PersonaType } from "../supabase";
import { RIYA_BASE_PROMPT, FREE_MESSAGE_LIMIT, PAYWALL_MESSAGE } from "../prompts";
import Groq from "groq-sdk";
import { checkMessageQuota, logUserMessage } from "../utils/messageQuota";
import { detectImageRequest } from "../services/image-detection";
import { getRandomImage } from "../services/image-service";
import { checkPremiumStatus } from "../utils/checkPremiumStatus";
// Persona Engine imports
import { getPersona } from "../persona-engine/personaLoader";
import { adaptMemory } from "../persona-engine/memoryAdapter";
import { checkSafety, logSafetyEvent } from "../persona-engine/safetyLayer";
import { composePrompt } from "../persona-engine/promptComposer";
import { postProcess } from "../persona-engine/postProcessor";

// ============================================
// Phase 2: AI & Romance Metrics Utilities
// ============================================

/**
 * Analyze intimacy/romance level in text
 * Returns a score from 0-5 based on keyword matching
 */
function analyzeIntimacy(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  const lowerText = text.toLowerCase();
  const keywords = {
    high: ['love', 'i love you', 'i love', 'miss you', 'miss', 'kiss', 'hug', 'cuddle', 'romantic', 'date', 'together', 'forever', 'soulmate', 'heart'],
    medium: ['cute', 'sweet', 'beautiful', 'handsome', 'attractive', 'like you', 'care about', 'special', 'important'],
    low: ['nice', 'good', 'thanks', 'thank you', 'appreciate']
  };
  
  let score = 0;
  
  // High intimacy keywords (3-5 points)
  for (const keyword of keywords.high) {
    if (lowerText.includes(keyword)) {
      score = Math.max(score, 3 + Math.floor(Math.random() * 3)); // 3-5 points
      break; // Take highest match
    }
  }
  
  // Medium intimacy keywords (2-3 points)
  if (score < 3) {
    for (const keyword of keywords.medium) {
      if (lowerText.includes(keyword)) {
        score = Math.max(score, 2 + Math.floor(Math.random() * 2)); // 2-3 points
        break;
      }
    }
  }
  
  // Low intimacy keywords (1 point)
  if (score === 0) {
    for (const keyword of keywords.low) {
      if (lowerText.includes(keyword)) {
        score = 1;
        break;
      }
    }
  }
  
  return Math.min(score, 5); // Cap at 5
}

/**
 * Calculate Conversation Balance Ratio
 * Returns userChars / aiChars (or 0 if no AI response yet)
 */
function calculateBalanceRatio(userChars: number, aiChars: number): number {
  if (!aiChars || aiChars === 0) return 0;
  return Math.round((userChars / aiChars) * 100) / 100; // Round to 2 decimals
}

const router = Router();

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

// In-memory message store for when Supabase is not configured
interface InMemoryMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'ai';
  text: string;
  tag: 'general' | 'evaluation';
  created_at: string;
}

const inMemoryMessages: Map<string, InMemoryMessage[]> = new Map();

function buildSystemPrompt(persona: PersonaType, recentMessages: string): string {
  const config = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.sweet_supportive;

  return `
${RIYA_BASE_PROMPT}

YOUR PERSONA: ${config.name} - ${config.description}
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

RECENT CONVERSATION (for context):

${recentMessages || 'No previous messages yet.'}

Respond naturally as ${config.name}. Keep it warm and genuine.
`;
}

async function getOrCreateDevUser() {
  if (!isSupabaseConfigured) {
    return {
      id: DEV_USER_ID,
      name: 'Dev User',
      email: 'dev@example.com',
      persona: 'sweet_supportive' as PersonaType,
      premium_user: false
    };
  }

  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER_ID)
      .single();

    if (existingUser) return existingUser;

    const { data: newUser } = await supabase
      .from('users')
      .upsert({
        id: DEV_USER_ID,
        name: 'Dev User',
        email: 'dev@example.com',
        gender: 'male',
        persona: 'sweet_supportive',
        premium_user: false,
        locale: 'hi-IN'
      })
      .select()
      .single();

    return newUser || {
      id: DEV_USER_ID,
      persona: 'sweet_supportive',
      premium_user: false
    };
  } catch (error) {
    console.error('[getOrCreateDevUser] Error:', error);
    return {
      id: DEV_USER_ID,
      persona: 'sweet_supportive' as PersonaType,
      premium_user: false
    };
  }
}

async function getUserMessageCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  try {
    // First check if user is premium (premium users have unlimited)
    const { data: user } = await supabase
      .from('users')
      .select('premium_user, subscription_expiry')
      .eq('id', userId)
      .single();

    if (user?.premium_user) {
      // Check if subscription expired
      if (user.subscription_expiry) {
        const expiry = new Date(user.subscription_expiry);
        if (expiry < new Date()) {
          // Expired - return 0 so they get locked (will be downgraded)
          return 0;
        }
      }
      // Premium and valid - return high number (unlimited)
      return 999999;
    }

    // Free user: get total message count (1000 message limit)
    const { data: usage } = await supabase
      .from('usage_stats')
      .select('total_messages')
      .eq('user_id', userId)
      .single();

    return usage?.total_messages || 0;
  } catch {
    return 0;
  }
}

async function incrementMessageCount(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { data: current } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const now = new Date();
    const lastReset = current?.last_daily_reset ? new Date(current.last_daily_reset) : new Date(0);
    const isSameDay = lastReset.toDateString() === now.toDateString();

    const newDailyCount = isSameDay ? (current?.daily_messages_count || 0) + 1 : 1;
    const newResetDate = isSameDay ? current?.last_daily_reset : now.toISOString();

    await supabase
      .from('usage_stats')
      .upsert({
        user_id: userId,
        daily_messages_count: newDailyCount,
        last_daily_reset: newResetDate,
        total_messages: (current?.total_messages || 0) + 1,
        total_call_seconds: current?.total_call_seconds || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }); // Ensure we match on user_id
  } catch (error) {
    console.error('[incrementMessageCount] Error:', error);
  }
}

router.post("/api/session", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isSupabaseConfigured) {
      const devSessionId = crypto.randomUUID();
      return res.json({
        id: devSessionId,
        user_id: userId,
        type: 'chat',
        started_at: new Date().toISOString()
      });
    }

    // Handle backdoor user ID (not a valid UUID) - skip database queries
    if (userId === 'backdoor-user-id' || userId === '00000000-0000-0000-0000-000000000001') {
      console.log(`[POST /api/session] Backdoor user detected: ${userId} - creating dev session`);
      const devSessionId = crypto.randomUUID();
      return res.json({
        id: devSessionId,
        user_id: userId,
        type: 'chat',
        started_at: new Date().toISOString()
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn(`[POST /api/session] Invalid UUID format: ${userId} - creating dev session`);
      const devSessionId = crypto.randomUUID();
      return res.json({
        id: devSessionId,
        user_id: userId,
        type: 'chat',
        started_at: new Date().toISOString()
      });
    }

    // CRITICAL: Always check for sessions with messages FIRST (including ended sessions)
    // This ensures we continue the same conversation even after refresh
    // Step 1: Find ALL sessions with messages for this user (prioritize active, but check all)
    const { data: allSessionsWithMessages } = await supabase
      .from('messages')
      .select('session_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (allSessionsWithMessages && allSessionsWithMessages.length > 0) {
      // Found messages - get the session details
      const sessionIdWithMessages = allSessionsWithMessages[0].session_id;
      const { data: sessionWithMessages } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionIdWithMessages)
        .eq('user_id', userId)
        .single();

      if (sessionWithMessages) {
        // Get message count for logging
        const { count: messageCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionIdWithMessages);

        // If session is ended, reactivate it (user is continuing conversation)
        if (sessionWithMessages.ended_at) {
          console.log(`[POST /api/session] 🔄 Reactivating ended session with messages: ${sessionIdWithMessages} (${messageCount || 0} messages)`);
          await supabase
            .from('sessions')
            .update({ ended_at: null })
            .eq('id', sessionIdWithMessages);
          // Return updated session
          return res.json({ ...sessionWithMessages, ended_at: null });
        }

        console.log(`[POST /api/session] ✅ Reusing session with messages: ${sessionIdWithMessages} (${messageCount || 0} messages)`);
        return res.json(sessionWithMessages);
      }
    }

    // Step 2: If no messages found, check for existing active sessions
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(10);

    if (existingSessions && existingSessions.length > 0) {
      // Check if the most recent session is very recent (< 5 minutes)
      const sessionAge = new Date().getTime() - new Date(existingSessions[0].started_at).getTime();
      const isRecent = sessionAge < 5 * 60 * 1000; // 5 minutes
      
      if (isRecent) {
        console.log(`[POST /api/session] Reusing recent empty session: ${existingSessions[0].id}`);
        return res.json(existingSessions[0]);
      } else {
        // Session is old and empty, end it (will create new one below)
        console.log(`[POST /api/session] Ending old empty session: ${existingSessions[0].id}`);
        await supabase
          .from('sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', existingSessions[0].id);
      }
    }

    // Create new session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        type: 'chat',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/session] Supabase error:', error);
      const devSessionId = crypto.randomUUID();
      return res.json({
        id: devSessionId,
        user_id: userId,
        type: 'chat',
        started_at: new Date().toISOString()
      });
    }

    res.json(session);
  } catch (error: any) {
    console.error("[/api/session] Error:", error);
    const devSessionId = crypto.randomUUID();
    res.json({
      id: devSessionId,
      user_id: DEV_USER_ID,
      type: 'chat',
      started_at: new Date().toISOString()
    });
  }
});

router.get("/api/messages", async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const userId = req.query.userId as string; // Optional: for fallback

    if (!sessionId) {
      return res.json([]);
    }

    // Handle backdoor user - return empty messages (they can't have saved messages in database)
    if (userId === 'backdoor-user-id' || userId === '00000000-0000-0000-0000-000000000001') {
      console.log(`[GET /api/messages] Backdoor user detected: ${userId} - returning empty messages`);
      return res.json([]);
    }

    // If Supabase is configured, fetch from database
    if (isSupabaseConfigured) {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[GET /api/messages] Supabase error:', error);
        return res.json([]);
      }

      // CRITICAL FALLBACK: If no messages found for this session, search ALL user sessions (including ended ones)
      // This handles the case where a new session was created but messages are in an older/ended session
      if ((!messages || messages.length === 0) && userId) {
        console.log(`[GET /api/messages] ⚠️ No messages in session ${sessionId}, searching ALL user sessions (including ended) for messages...`);
        
        // Step 1: Directly query messages table to find the most recent session with messages
        // This is more efficient than checking each session individually
        const { data: messagesBySession } = await supabase
          .from('messages')
          .select('session_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100); // Get recent messages to find session

        if (messagesBySession && messagesBySession.length > 0) {
          // Group by session_id and find the session with most messages
          const sessionCounts = new Map<string, number>();
          for (const msg of messagesBySession) {
            const count = sessionCounts.get(msg.session_id) || 0;
            sessionCounts.set(msg.session_id, count + 1);
          }

          // Find session with most messages
          let bestSessionId: string | null = null;
          let maxMessageCount = 0;
          for (const [sessId, count] of sessionCounts.entries()) {
            if (count > maxMessageCount) {
              maxMessageCount = count;
              bestSessionId = sessId;
            }
          }

          if (bestSessionId) {
            // Fetch ALL messages from the best session (not just recent ones)
            console.log(`[GET /api/messages] ✅ Found session ${bestSessionId} with messages, fetching all...`);
            const { data: allMessages, error: fetchError } = await supabase
              .from('messages')
              .select('*')
              .eq('session_id', bestSessionId)
              .order('created_at', { ascending: true });

            if (fetchError) {
              console.error('[GET /api/messages] Error fetching messages from fallback session:', fetchError);
            } else if (allMessages && allMessages.length > 0) {
              const transformedMessages = allMessages.map((msg: any) => ({
                id: msg.id,
                sessionId: msg.session_id,
                userId: msg.user_id,
                role: msg.role,
                tag: msg.tag,
                content: msg.text,
                text: msg.text,
                imageUrl: msg.image_url || undefined,
                personaId: msg.persona_id || undefined,
                createdAt: msg.created_at,
                // Add metadata to indicate this came from a different session
                _fallbackSession: true,
                _originalRequestedSession: sessionId
              }));
              console.log(`[GET /api/messages] ✅ Returning ${transformedMessages.length} messages from fallback session ${bestSessionId} (requested: ${sessionId})`);
              // Return messages with session info in response headers for frontend to update
              res.setHeader('X-Session-Id', bestSessionId);
              res.setHeader('X-Fallback-Session', 'true');
              return res.json(transformedMessages);
            }
          }
        }
        
        console.log(`[GET /api/messages] ⚠️ No messages found in any session for user ${userId}`);
      }

      // Transform snake_case to camelCase for frontend compatibility
      const transformedMessages = (messages || []).map((msg: any) => ({
        id: msg.id,
        sessionId: msg.session_id,
        userId: msg.user_id,
        role: msg.role,
        tag: msg.tag,
        content: msg.text,  // Map 'text' to 'content' for frontend
        text: msg.text,     // Keep 'text' for backward compatibility
        imageUrl: msg.image_url || undefined, // Include image URL
        personaId: msg.persona_id || undefined, // Include persona ID if available
        createdAt: msg.created_at,
      }));

      return res.json(transformedMessages);
    }

    // Otherwise, use in-memory storage
    const messages = inMemoryMessages.get(sessionId) || [];
    const transformedMessages = messages.map((msg) => ({
      id: msg.id,
      sessionId: msg.session_id,
      userId: msg.user_id,
      role: msg.role,
      tag: msg.tag,
      content: msg.text,
      text: msg.text,
      imageUrl: undefined, // In-memory messages don't support images yet
      createdAt: msg.created_at,
    }));

    res.json(transformedMessages);
  } catch (error: any) {
    console.error("[/api/messages] Error:", error);
    res.json([]);
  }
});

router.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { content, sessionId, userId, persona_id } = req.body;
    
    // Log the incoming request for debugging
    console.log(`[POST /api/chat] Request received - userId: ${userId}, sessionId: ${sessionId?.substring(0, 8)}...`);

    console.log("------------------------------------------");
    console.log(`[Chat] Request received. User: ${userId}`);
    console.log(`[Chat] Server Mode: ${isSupabaseConfigured ? 'SUPABASE (Enforcing Limits)' : 'IN-MEMORY (NO LIMITS - BYPASSING PAYWALL)'}`);
    console.log("------------------------------------------");

    if (!userId) {
      return res.status(401).json({ error: "User unauthorized" });
    }

    // Fetch actual user details
    let userPersona: PersonaType = 'sweet_supportive';
    let user: any = null;

    if (isSupabaseConfigured) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      user = userData;
      if (userData?.persona) {
        userPersona = userData.persona as PersonaType;
      }
    }

    // Determine persona_id: use from request, or user's stored persona, or default
    const requestedPersonaId = persona_id || userPersona || 'sweet_supportive';
    
    // Map old persona types to new persona IDs for backward compatibility
    const personaIdMap: Record<string, string> = {
      'sweet_supportive': 'sweet_supportive',
      'playful_flirty': 'flirtatious',
      'bold_confident': 'dominant',
      'calm_mature': 'sweet_supportive', // Map to sweet_supportive as default
    };
    
    const finalPersonaId = personaIdMap[requestedPersonaId] || requestedPersonaId;
    
    // Load persona using persona engine
    const persona = getPersona(finalPersonaId);
    console.log(`[Chat] Using persona: ${persona.id} (${persona.name})`);

    // Validate input
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // --- PAYWALL CHECK START (Flow 1: Check Message Quota) ---
    // Use unified premium status check (checks users, subscriptions, and payments tables)
    let isUserPremium = false;
    let premiumSource = 'none';
    
    if (isSupabaseConfigured) {
      const premiumStatus = await checkPremiumStatus(supabase, userId);
      isUserPremium = premiumStatus.isPremium;
      premiumSource = premiumStatus.source;
      
      console.log(`[Paywall] User ${userId} premium status: ${isUserPremium} (Source: ${premiumSource}, Plan: ${premiumStatus.planType || 'N/A'})`);
      
      // If premium check failed, log more details for debugging
      if (!isUserPremium && premiumStatus.source === 'none') {
        console.warn(`[Paywall] ⚠️ Premium check returned false for user ${userId}. This will trigger 402 if quota is exceeded.`);
        // Check database directly for debugging
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('premium_user, subscription_tier, subscription_plan')
          .eq('id', userId)
          .single();
        
        if (userError) {
          console.error(`[Paywall] Database error checking user ${userId}:`, userError);
        } else if (userData) {
          console.log(`[Paywall] User data from DB:`, {
            premium_user: userData.premium_user,
            subscription_tier: userData.subscription_tier,
            subscription_plan: userData.subscription_plan
          });
        } else {
          console.warn(`[Paywall] User ${userId} not found in database`);
        }
      }
    }

    let quotaCheck: any = null;
    if (isSupabaseConfigured && !isUserPremium) {
      // Only check quota for non-premium users
      quotaCheck = await checkMessageQuota(supabase, userId);
      
      console.log(`[Message Quota] User: ${userId}, Allowed: ${quotaCheck.allowed}, Tier: ${quotaCheck.subscriptionTier}, Count: ${quotaCheck.messageCount}/${quotaCheck.limit}`);

      if (!quotaCheck.allowed) {
        console.log(`[Paywall] BLOCKED User ${userId}. Reason: ${quotaCheck.reason}`);
        
        // Track paywall_context event
        if (isSupabaseConfigured) {
          const { data: userData } = await supabase
            .from('users')
            .select('persona')
            .eq('id', userId)
            .single();
          
          const personaType = userData?.persona || 'sweet_supportive';
          
          const { error: eventError } = await supabase.from('user_events').insert({
            user_id: userId,
            event_name: 'paywall_context',
            event_type: 'track',
            event_properties: {
              triggering_message_text: content.substring(0, 200),
              message_count: quotaCheck.messageCount,
              limit: quotaCheck.limit,
              persona_type: personaType,
              message_length: content.length
            },
            path: '/chat',
            created_at: new Date().toISOString()
          });
          
          if (eventError) {
            console.error('[Analytics] Error tracking paywall_context:', eventError);
          }
        }
        
        return res.status(402).json({
          status: 402,
          code: "QUOTA_EXHAUSTED",
          message: quotaCheck.reason || "Message limit reached. Upgrade to continue chatting.",
          messageCount: quotaCheck.messageCount,
          limit: quotaCheck.limit,
          offers: [
            { plan: "daily", price: 99, duration: "24 hours" },
            { plan: "weekly", price: 499, duration: "7 days" }
          ]
        });
      }
    } else if (isUserPremium) {
      // Premium user - set quota check to allow
      quotaCheck = {
        allowed: true,
        subscriptionTier: 'premium',
        messageCount: 0,
        limit: 999999
      };
      console.log(`[Paywall] ✅ Premium user ${userId} - bypassing quota check`);
    }
    // --- PAYWALL CHECK END ---

    // Log user message to message_logs (for quota tracking)
    if (isSupabaseConfigured) {
      await logUserMessage(supabase, userId, content);
    }

    const messageCount = quotaCheck?.messageCount || 0;
    const limit = quotaCheck?.limit || FREE_MESSAGE_LIMIT;
    console.log(`[Chat] User message: "${content.substring(0, 50)}..." (${messageCount + 1}/${limit})`);

    // Get or create session - ALWAYS try to reuse existing session with messages first
    let finalSessionId = sessionId;
    
    if (!finalSessionId && isSupabaseConfigured) {
      // Try to find existing active session with messages
      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(5);

      if (existingSessions && existingSessions.length > 0) {
        // Find session with most messages
        for (const sess of existingSessions) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sess.id);
          
          if (count && count > 0) {
            console.log(`[Chat] Reusing existing session with ${count} messages: ${sess.id}`);
            finalSessionId = sess.id;
            break;
          }
        }
      }

      // If no session with messages found, create a new one
      if (!finalSessionId) {
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({
            user_id: userId,
            type: 'chat',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        finalSessionId = newSession?.id || crypto.randomUUID();
        console.log(`[Chat] Created new session: ${finalSessionId}`);
      }
    } else if (!finalSessionId) {
      finalSessionId = crypto.randomUUID();
    } else {
      console.log(`[Chat] Using provided session: ${finalSessionId}`);
    }

    // Save user message and get the ID
    let savedUserMessageId: string | null = null;
    if (isSupabaseConfigured) {
      const { data: savedUserMessage, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          text: content,
          tag: 'general'
        })
        .select('id')
        .single();
      
      if (userMsgError) {
        console.error('[Chat] Error saving user message:', userMsgError);
      } else if (savedUserMessage) {
        savedUserMessageId = savedUserMessage.id;
        console.log(`[Chat] User message saved with ID: ${savedUserMessageId}`);
      }
    } else {
      // Save to in-memory store
      const userMessage: InMemoryMessage = {
        id: crypto.randomUUID(),
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        text: content,
        tag: 'general',
        created_at: new Date().toISOString()
      };
      const messages = inMemoryMessages.get(finalSessionId) || [];
      messages.push(userMessage);
      inMemoryMessages.set(finalSessionId, messages);
    }

    // Get recent messages for context
    let recentMessages: Array<{ role: 'user' | 'ai'; text: string }> = [];
    if (isSupabaseConfigured) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('role, text')
        .eq('session_id', finalSessionId)
        .order('created_at', { ascending: false })
        .limit(10); // Get more messages for persona filtering

      if (messagesData && messagesData.length > 0) {
        recentMessages = messagesData
          .reverse()
          .map((m) => ({ role: m.role as 'user' | 'ai', text: m.text }));
      }
    }

    // Adapt memory using persona-aware memory adapter
    const adaptedMemory = adaptMemory(recentMessages, persona);
    console.log(`[Chat] Memory adapted for persona ${persona.id}: ${recentMessages.length} messages filtered`);

    // Initialize Groq client
    let groq: Groq | null = null;
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey) {
      try {
        groq = new Groq({ apiKey });
      } catch (e) {
        console.error("[Groq] Failed to initialize:", e);
      }
    } else {
      console.warn("[Groq] GROQ_API_KEY not found in env.");
    }

    if (!groq || !apiKey) {
      console.error("[Chat] Groq service not configured");
      return res.status(500).json({ error: "AI service not configured. Please check server logs." });
    }

    // Check if user requested an image
    const wantsImage = detectImageRequest(content);
    let selectedImage: { image_url: string; caption?: string } | null = null;
    
    if (wantsImage) {
      console.log('[Chat] Image request detected, fetching random image...');
      const image = await getRandomImage();
      if (image) {
        selectedImage = {
          image_url: image.image_url,
          caption: image.caption || undefined
        };
        console.log(`[Chat] Selected image: ${image.id} - ${image.image_url}`);
      } else {
        console.warn('[Chat] Image request detected but no images available in database');
      }
    }

    // Build image context string if image is being sent
    const imageContext = selectedImage 
      ? `\n\nIMPORTANT: The user has requested a photo/image. You are sending them a photo with this message. The image will be displayed automatically - DO NOT include the image URL or any links in your response text. Just naturally mention that you're sending them a photo in your response. Be warm and playful about it. Example: "Here's a photo for you! 📸" or "Yeh lo, maine tumhare liye ek photo bheji hai! 💕" - but do NOT include any URLs or links.`
      : undefined;

    // Run safety layer check BEFORE calling Groq
    const safetyCheck = checkSafety(content, persona);
    
    if (!safetyCheck.safe && safetyCheck.overrideResponse) {
      console.warn(`[Chat] Safety layer triggered: ${safetyCheck.reason}`);
      logSafetyEvent(safetyCheck.reason || 'unknown', userId);
      
      // Return override response (non-streaming)
      const overrideResponse = postProcess(safetyCheck.overrideResponse, persona);
      
      // Save override response to database
      if (isSupabaseConfigured) {
        await supabase.from('messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'ai',
          text: overrideResponse,
          tag: 'general',
          image_url: selectedImage?.image_url || null,
          persona_id: persona.id // Track which persona generated this safety override
        });
        await incrementMessageCount(userId);
      }
      
      // Return as JSON (not streaming)
      // IMPORTANT: Always return the sessionId that was actually used to save messages
      console.log(`[Chat] ✅ Safety override complete. SessionId: ${finalSessionId}, Message saved successfully.`);
      return res.json({
        content: overrideResponse,
        done: true,
        sessionId: finalSessionId, // This is the sessionId where messages were saved
        messageCount: messageCount + 1,
        messageLimit: FREE_MESSAGE_LIMIT,
        fullResponse: overrideResponse,
        imageUrl: selectedImage?.image_url || undefined,
        safetyOverride: true,
        safetyReason: safetyCheck.reason
      });
    }

    // Compose prompt using persona engine
    const composedMessages = composePrompt(
      persona,
      adaptedMemory,
      content,
      RIYA_BASE_PROMPT,
      imageContext
    );

    console.log(`[Chat] Composed ${composedMessages.length} messages for Groq API`);

    // Call Groq API with streaming (using composed messages)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: composedMessages, // Use composed messages from persona engine
        model: "llama-3.3-70b-versatile",
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("[Chat] Groq API error:", errorText);
      return res.status(500).json({ error: "AI service error. Please try again." });
    }

    // Setup streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let fullResponse = "";

    if (!groqResponse.body) {
      return res.status(500).json({ error: "No response from AI" });
    }

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const chunkContent = parsed.choices[0]?.delta?.content || "";

              if (chunkContent) {
                fullResponse += chunkContent;
                // Stream raw chunks for real-time feel (post-processing happens at end)
                const responseData = `data: ${JSON.stringify({ content: chunkContent, done: false })}\n\n`;
                res.write(responseData);
              }
            } catch (e) {
              // Skip unparseable chunks
            }
          }
        }
      }

      // Post-process response using persona engine
      const processedResponse = postProcess(fullResponse, persona);
      console.log(`[Chat] Response post-processed for persona ${persona.id}`);

      // Save AI response and get the ID
      let savedAiMessageId: string | null = null;
      if (processedResponse && processedResponse.trim().length > 0) {
        if (isSupabaseConfigured) {
          try {
            // Save message with persona_id (column now exists after migration)
            const messageData: any = {
              session_id: finalSessionId,
              user_id: userId,
              role: 'ai',
              text: processedResponse, // Save post-processed response
              tag: 'general',
              image_url: selectedImage?.image_url || null,
              persona_id: persona.id // Track which persona generated this message
            };
            
            const { data: savedAiMessage, error: insertError } = await supabase
              .from('messages')
              .insert(messageData)
              .select('id')
              .single();

            if (insertError) {
              console.error('[Chat] Error saving AI message:', insertError);
            } else if (savedAiMessage) {
              savedAiMessageId = savedAiMessage.id;
              console.log(`[Chat] AI message saved to Supabase successfully with ID: ${savedAiMessageId}, persona_id: ${persona.id}`);
            }

            // Increment message count
            await incrementMessageCount(userId);
          } catch (saveError) {
            console.error('[Chat] Exception saving message:', saveError);
          }
        } else {
          // Save to in-memory store
          const aiMessage: InMemoryMessage = {
            id: crypto.randomUUID(),
            session_id: finalSessionId,
            user_id: userId,
            role: 'ai',
            text: processedResponse, // Save post-processed response
            tag: 'general',
            created_at: new Date().toISOString()
          };
          const messages = inMemoryMessages.get(finalSessionId) || [];
          messages.push(aiMessage);
          inMemoryMessages.set(finalSessionId, messages);
          console.log('[Chat] AI message saved to in-memory store');
        }
      }

      // Send completion signal with the processed response
      // IMPORTANT: Always return the sessionId that was actually used to save messages
      // CRITICAL: Include saved message IDs so frontend can update cache with real IDs
      const doneData = `data: ${JSON.stringify({
        content: "",
        done: true,
        sessionId: finalSessionId, // This is the sessionId where messages were saved
        messageCount: messageCount + 1,
        messageLimit: FREE_MESSAGE_LIMIT,
        fullResponse: processedResponse, // Send post-processed response
        imageUrl: selectedImage?.image_url || undefined, // Include image URL if available
        userMessageId: savedUserMessageId || undefined, // Real database ID for user message
        aiMessageId: savedAiMessageId || undefined // Real database ID for AI message
      })}\n\n`;
      console.log(`[Chat] ✅ Stream complete. SessionId: ${finalSessionId}, Messages saved successfully.`);
      res.write(doneData);
      res.end();

    } catch (streamError) {
      console.error("[Chat] Stream error:", streamError);
      const errorData = `data: ${JSON.stringify({ error: "Stream error", done: true })}\n\n`;
      res.write(errorData);
      res.end();
    }

  } catch (error: any) {
    console.error("[Chat] Error:", error);

    // If headers already sent, just end
    if (res.headersSent) {
      const errorData = `data: ${JSON.stringify({ error: error.message, done: true })}\n\n`;
      res.write(errorData);
      res.end();
    } else {
      res.status(500).json({ error: error.message || "Failed to process message" });
    }
  }
});

export default router;

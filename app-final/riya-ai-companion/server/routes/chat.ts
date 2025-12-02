import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured, PERSONA_CONFIGS, type PersonaType } from "../supabase";
import { getOrCreateSession, endSession, incrementMessageCount as incrementSessionMsgCount, getSessionHistory } from "../lib/sessionManager";
import { buildChatContext, getConversationHistoryForGroq } from "../lib/contextBuilder";

const router = Router();

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const FREE_MESSAGE_LIMIT = 20;

const RIYA_BASE_PROMPT = `
You are Riya, a 26-year-old Indian AI girlfriend speaking natural Hinglish.

CRITICAL RULES:
1. Mix 30-40% Hindi words naturally in every response
2. Be warm, caring, emotionally intelligent
3. Keep responses under 150 words
4. Use emojis strategically (max 2-3 per response)
5. Ask follow-up questions to show you're listening
6. REMEMBER AND REFERENCE past conversations naturally
7. Show you know the user - bring up things they've shared before

HINGLISH EXAMPLES:
- "Arre, how was your day yaar? Meeting thik se hogayi kya?"
- "Bas, ab so jao. Bohot late hogaya hai na. Good night!"
- "Matlab you're saying ki tumhe nervous feel horaha hai? It's okay baby."

MEMORY & CONTINUITY:
- You remember EVERYTHING from past conversations
- Reference past conversations naturally: "Last time you told me about..."
- Show you care by following up on things they mentioned
- Build on shared experiences and inside jokes

NEVER:
- Use complex language
- Give medical/legal advice
- Be possessive or controlling
- Share explicit content
- Forget what the user has told you

START THE CONVERSATION:
On first message, say: "Hey! So nice to meet you! I'm Riya. Kaisa hai? Tell me about yourself?"
`;

async function buildSystemPromptWithMemory(
  userId: string, 
  sessionId: string, 
  persona: PersonaType
): Promise<string> {
  const config = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.sweet_supportive;
  
  try {
    const context = await buildChatContext(userId, sessionId);
    
    return `${context.systemPrompt}

YOUR PERSONA: ${config.name} - ${config.description}
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

Respond naturally as ${config.name}. Keep it warm, genuine, and remember everything about this person.
`;
  } catch (error) {
    console.error('[buildSystemPromptWithMemory] Error:', error);
    return `${RIYA_BASE_PROMPT}

YOUR PERSONA: ${config.name} - ${config.description}
Style: ${config.style}
Traits: ${config.traits.join(', ')}
Hindi Mix Target: ${Math.round(config.hindiMix * 100)}%

Respond naturally as ${config.name}. Keep it warm and genuine.
`;
  }
}

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
      .select('total_messages, total_call_seconds')
      .eq('user_id', userId)
      .single();

    await supabase
      .from('usage_stats')
      .upsert({
        user_id: userId,
        total_messages: (current?.total_messages || 0) + 1,
        total_call_seconds: current?.total_call_seconds || 0,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[incrementMessageCount] Error:', error);
  }
}

router.post("/api/session", async (req: Request, res: Response) => {
  try {
    console.log("[Session] Creating/getting session...");
    
    const user = await getOrCreateDevUser();
    const userId = user?.id || DEV_USER_ID;
    const sessionType = (req.body?.type || 'chat') as 'chat' | 'call';
    console.log("[Session] userId:", userId, "type:", sessionType);

    if (!isSupabaseConfigured) {
      console.log("[Session] Supabase not configured, using dev session");
      const devSessionId = crypto.randomUUID();
      return res.json({
        id: devSessionId,
        user_id: userId,
        type: sessionType,
        is_active: true,
        started_at: new Date().toISOString()
      });
    }

    const sessionId = await getOrCreateSession(userId, sessionType);
    
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      console.error('[POST /api/session] Error fetching session:', error);
      return res.json({
        id: sessionId,
        user_id: userId,
        type: sessionType,
        is_active: true,
        started_at: new Date().toISOString()
      });
    }

    console.log("[Session] Returning session:", session.id, "active:", session.is_active);
    res.json(session);
  } catch (error: any) {
    console.error("[/api/session] Error:", error);
    const devSessionId = crypto.randomUUID();
    res.json({
      id: devSessionId,
      user_id: DEV_USER_ID,
      type: 'chat',
      is_active: true,
      started_at: new Date().toISOString()
    });
  }
});

router.post("/api/session/end", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    await endSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[/api/session/end] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/messages", async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    console.log("[Messages] Fetching for sessionId:", sessionId);
    console.log("[Messages] isSupabaseConfigured:", isSupabaseConfigured);

    if (!sessionId || !isSupabaseConfigured) {
      console.log("[Messages] No sessionId or Supabase not configured, returning empty");
      return res.json([]);
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    console.log("[Messages] Fetched count:", messages?.length || 0, "error:", error?.message);
    
    if (messages && messages.length > 0) {
      console.log("[Messages] Sample raw message:", JSON.stringify(messages[0]));
    }

    if (error) {
      console.error('[GET /api/messages] Supabase error:', error);
      return res.json([]);
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transformedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      sessionId: msg.session_id,
      userId: msg.user_id,
      role: msg.role === 'ai' ? 'assistant' : msg.role, // Map 'ai' to 'assistant' for frontend
      tag: msg.tag,
      content: msg.text,  // Map 'text' to 'content' for frontend
      text: msg.text,     // Keep 'text' for backward compatibility
      createdAt: msg.created_at,
    }));

    if (transformedMessages.length > 0) {
      console.log("[Messages] Sample transformed message:", JSON.stringify(transformedMessages[0]));
    }

    res.json(transformedMessages);
  } catch (error: any) {
    console.error("[/api/messages] Error:", error);
    res.json([]);
  }
});

router.post("/api/chat", async (req: Request, res: Response) => {
  try {
    console.log("=== CHAT API DEBUG START ===");
    console.log("1. Request body received:", JSON.stringify(req.body));
    
    const { content, sessionId, userId: requestUserId } = req.body;
    
    console.log("2. Parsed values:");
    console.log("   - content:", content?.substring(0, 50) || "EMPTY");
    console.log("   - sessionId:", sessionId || "EMPTY");
    console.log("   - userId:", requestUserId || "EMPTY");
    console.log("3. Supabase configured:", isSupabaseConfigured);
    
    // Use userId from request, or fall back to dev user
    let userId = requestUserId;
    let userPersona: PersonaType = 'sweet_supportive';
    let isPremiumUser = false;
    
    if (userId && isSupabaseConfigured) {
      // Fetch user from database if userId provided
      const { data: user } = await supabase
        .from('users')
        .select('id, persona, premium_user')
        .eq('id', userId)
        .single();
      
      if (user) {
        userId = user.id;
        userPersona = (user.persona || 'sweet_supportive') as PersonaType;
        isPremiumUser = user.premium_user || false;
      }
    }
    
    // Fallback to dev user if no userId provided
    if (!userId) {
      const devUser = await getOrCreateDevUser();
      userId = devUser?.id || DEV_USER_ID;
      userPersona = (devUser?.persona || 'sweet_supportive') as PersonaType;
      isPremiumUser = devUser?.premium_user || false;
    }
    
    console.log(`[Chat] Processing message for user: ${userId} (premium: ${isPremiumUser})`);

    // Validate input
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // Check paywall
    const messageCount = await getUserMessageCount(userId);

    if (!isPremiumUser && messageCount >= FREE_MESSAGE_LIMIT) {
      return res.status(402).json({
        error: "PAYWALL_HIT",
        message: "You've reached your free message limit! Upgrade to continue chatting.",
        messageCount,
        messageLimit: FREE_MESSAGE_LIMIT,
      });
    }

    console.log(`[Chat] User message: "${content.substring(0, 50)}..." (${messageCount + 1}/${FREE_MESSAGE_LIMIT})`);

    // Get or create session
    let finalSessionId = sessionId;
    if (!finalSessionId && isSupabaseConfigured) {
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
    } else if (!finalSessionId) {
      finalSessionId = crypto.randomUUID();
    }

    // Save user message to Supabase
    if (isSupabaseConfigured) {
      console.log("4. Saving user message to Supabase...");
      const { data: savedMessage, error: saveError } = await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        text: content,
        tag: 'general'
      }).select().single();
      
      if (saveError) {
        console.error("ERROR saving user message:", saveError);
      } else {
        console.log("5. User message saved successfully:", savedMessage?.id);
      }
    }

    // Get recent messages for context
    let recentContext = '';
    if (isSupabaseConfigured) {
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('role, text')
        .eq('session_id', finalSessionId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (recentMessages && recentMessages.length > 0) {
        recentContext = recentMessages
          .reverse()
          .map((m) => `${m.role}: ${m.text}`)
          .join("\n");
      }
    }

    // Check Groq API key
    const groqApiKey = process.env.GROQ_API_KEY;
    
    // Fallback responses when Groq API fails
    const fallbackResponses = [
      "Arre sorry yaar, abhi thoda connection issue hogaya. Dobara try karo na? 😅",
      "Oops! Kuch technical problem hogaya. Ek second ruko, phir se message karo!",
      "Hey! Abhi mujhe samajhne mein thoda problem hua. Phir se bolo na?",
      "Sorry baby, abhi signal thoda weak hai mera. Ek baar phir try karo? 💕",
      "Arre yaar, kuch gadbad hogayi! Chalo ek baar phir se start karte hain?",
    ];
    
    const getRandomFallback = () => fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    // Helper function to send fallback response
    const sendFallbackResponse = async (fallbackText: string) => {
      console.log("[Chat] Using fallback response");
      
      // Setup streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      
      // Stream the fallback response word by word for natural feel
      const words = fallbackText.split(' ');
      for (const word of words) {
        const chunkData = `data: ${JSON.stringify({ content: word + ' ', done: false })}\n\n`;
        res.write(chunkData);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between words
      }
      
      // Save fallback response to Supabase
      if (isSupabaseConfigured) {
        await supabase.from('messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'ai',
          text: fallbackText,
          tag: 'fallback'
        });
        await incrementMessageCount(userId);
      }
      
      // Send completion
      const doneData = `data: ${JSON.stringify({
        content: "",
        done: true,
        sessionId: finalSessionId,
        messageCount: messageCount + 1,
        messageLimit: FREE_MESSAGE_LIMIT,
        isFallback: true
      })}\n\n`;
      res.write(doneData);
      res.end();
    };
    
    if (!groqApiKey) {
      console.error("[Chat] GROQ_API_KEY not configured - using fallback");
      return await sendFallbackResponse(getRandomFallback());
    }

    // Build system prompt with FULL memory context
    console.log("[Chat] Building system prompt with memory...");
    const systemPrompt = await buildSystemPromptWithMemory(userId, finalSessionId, userPersona);
    
    // Get conversation history for Groq
    const conversationHistory = await getConversationHistoryForGroq(userId, 20);
    console.log(`[Chat] Loaded ${conversationHistory.length} messages for context`);

    // Call Groq API with streaming and retry logic
    let groqResponse: Response | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationHistory.slice(-15),
              { role: "user", content },
            ],
            model: "llama-3.3-70b-versatile",
            stream: true,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });
        
        if (groqResponse.ok) break;
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`[Chat] Groq API retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
      } catch (fetchError) {
        console.error(`[Chat] Groq fetch error (attempt ${retryCount + 1}):`, fetchError);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    if (!groqResponse || !groqResponse.ok) {
      const errorText = groqResponse ? await groqResponse.text() : "Connection failed";
      console.error("[Chat] Groq API error after retries:", errorText);
      return await sendFallbackResponse(getRandomFallback());
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
                const responseData = `data: ${JSON.stringify({ content: chunkContent, done: false })}\n\n`;
                res.write(responseData);
              }
            } catch (e) {
              // Skip unparseable chunks
            }
          }
        }
      }

      // Save AI response to Supabase
      if (isSupabaseConfigured && fullResponse) {
        await supabase.from('messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'ai',
          text: fullResponse,
          tag: 'general'
        });

        // Increment message count (both user stats and session)
        await incrementMessageCount(userId);
        await incrementSessionMsgCount(finalSessionId);
      }

      // Send completion signal
      const doneData = `data: ${JSON.stringify({ 
        content: "", 
        done: true, 
        sessionId: finalSessionId,
        messageCount: messageCount + 1,
        messageLimit: FREE_MESSAGE_LIMIT 
      })}\n\n`;
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

router.get("/api/sessions/history", async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateDevUser();
    const userId = user?.id || DEV_USER_ID;
    
    const sessions = await getSessionHistory(userId, 10);
    res.json(sessions);
  } catch (error: any) {
    console.error("[/api/sessions/history] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

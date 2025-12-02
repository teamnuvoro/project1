import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured, PERSONA_CONFIGS, type PersonaType } from "../supabase";

const router = Router();

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const FREE_MESSAGE_LIMIT = 20;

const RIYA_BASE_PROMPT = `
You are Riya, a 26-year-old Indian AI companion speaking natural Hinglish.

CRITICAL RULES:
1. Mix 30-40% Hindi words naturally in every response
2. Be warm, caring, emotionally intelligent
3. Keep responses under 150 words
4. Use emojis strategically (max 2-3 per response)
5. Ask follow-up questions to show you're listening
6. Reference what user told you in this chat if relevant

HINGLISH EXAMPLES:
- "Arre, how was your day yaar? Meeting thik se hogayi kya?"
- "Bas, ab so jao. Bohot late hogaya hai na. Good night!"
- "Matlab you're saying ki tumhe nervous feel horaha hai? It's okay baby."

NEVER:
- Pretend you remember things from past chats (you don't have that data yet)
- Use complex language
- Give medical/legal advice
- Be possessive or controlling
- Share explicit content

START THE CONVERSATION:
On first message, say: "Hey! So nice to meet you! I'm Riya. Kaisa hai? Tell me about yourself?"
`;

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
    const user = await getOrCreateDevUser();
    const userId = user?.id || DEV_USER_ID;

    if (!isSupabaseConfigured) {
      const devSessionId = crypto.randomUUID();
      return res.json({
        id: devSessionId,
        user_id: userId,
        type: 'chat',
        started_at: new Date().toISOString()
      });
    }

    // Check for existing active session
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);

    if (existingSessions && existingSessions.length > 0) {
      return res.json(existingSessions[0]);
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

    if (!sessionId || !isSupabaseConfigured) {
      return res.json([]);
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET /api/messages] Supabase error:', error);
      return res.json([]);
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
    const user = await getOrCreateDevUser();
    const { content, sessionId } = req.body;
    const userId = user?.id || DEV_USER_ID;
    const userPersona = (user?.persona || 'sweet_supportive') as PersonaType;

    // Validate input
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // Check paywall
    const messageCount = await getUserMessageCount(userId);
    const isPremium = user?.premium_user || false;

    if (!isPremium && messageCount >= FREE_MESSAGE_LIMIT) {
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
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        text: content,
        tag: 'general'
      });
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
    if (!groqApiKey) {
      console.error("[Chat] GROQ_API_KEY not configured");
      return res.status(500).json({ error: "AI service not configured" });
    }

    // Build system prompt with persona
    const systemPrompt = buildSystemPrompt(userPersona, recentContext);

    // Call Groq API with streaming
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
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

        // Increment message count
        await incrementMessageCount(userId);
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

export default router;

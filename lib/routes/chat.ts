import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured, PERSONA_CONFIGS, type PersonaType } from "../supabase";
import { RIYA_BASE_PROMPT, FREE_MESSAGE_LIMIT, PAYWALL_MESSAGE } from "../prompts";
import Groq from "groq-sdk";

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

    if (!sessionId) {
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

    // Save user message
    if (isSupabaseConfigured) {
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        text: content,
        tag: 'general'
      });
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

    // Build system prompt with persona
    const systemPrompt = buildSystemPrompt(userPersona, recentContext);

    // Call Groq API with streaming
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

      // Save AI response
      if (fullResponse && fullResponse.trim().length > 0) {
        if (isSupabaseConfigured) {
          try {
            const { error: insertError } = await supabase.from('messages').insert({
              session_id: finalSessionId,
              user_id: userId,
              role: 'ai',
              text: fullResponse,
              tag: 'general'
            });

            if (insertError) {
              console.error('[Chat] Error saving AI message:', insertError);
            } else {
              console.log('[Chat] AI message saved to Supabase successfully');
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
            text: fullResponse,
            tag: 'general',
            created_at: new Date().toISOString()
          };
          const messages = inMemoryMessages.get(finalSessionId) || [];
          messages.push(aiMessage);
          inMemoryMessages.set(finalSessionId, messages);
          console.log('[Chat] AI message saved to in-memory store');
        }
      }

      // Send completion signal with the full response so frontend can display it
      const doneData = `data: ${JSON.stringify({
        content: "",
        done: true,
        sessionId: finalSessionId,
        messageCount: messageCount + 1,
        messageLimit: FREE_MESSAGE_LIMIT,
        fullResponse: fullResponse // Include full response in done signal
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

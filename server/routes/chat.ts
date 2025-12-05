import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured, PERSONA_CONFIGS, type PersonaType } from "../supabase";
import { RIYA_BASE_PROMPT, FREE_MESSAGE_LIMIT } from "../prompts";
import Groq from "groq-sdk";
import crypto from 'crypto';

const router = Router();

console.log("[Chat Routes] Initializing...");

router.post("/api/chat/echo", (req, res) => {
  console.log("[Chat Echo] Hit!");
  res.json({ message: "Chat router is working" });
});

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

    return {
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

router.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { content, sessionId, userId: reqUserId } = req.body;

    // 1. Validate Input
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Message content is required" });
    }

    // 2. Get User & Persona
    let userId = reqUserId;
    let userPersona: PersonaType = 'sweet_supportive';

    if (!userId) {
      const user = await getOrCreateDevUser();
      userId = user.id;
      userPersona = user.persona as PersonaType;
    } else if (isSupabaseConfigured) {
      const { data: user } = await supabase.from('users').select('persona').eq('id', userId).single();
      if (user) userPersona = user.persona as PersonaType;
    }

    console.log(`[Chat] Processing message for user ${userId} (Session: ${sessionId})`);

    // 3. Get or Create Session
    let finalSessionId = sessionId;
    if (!finalSessionId) {
      finalSessionId = crypto.randomUUID();
    }

    // 4. Save User Message
    if (isSupabaseConfigured) {
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        text: content,
        tag: 'general'
      });
    } else {
      const messages = inMemoryMessages.get(finalSessionId) || [];
      messages.push({
        id: crypto.randomUUID(),
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        text: content,
        tag: 'general',
        created_at: new Date().toISOString()
      });
      inMemoryMessages.set(finalSessionId, messages);
    }

    // 5. Fetch Context (Recent Messages)
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

    // 6. Call Groq API
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[Chat] GROQ_API_KEY missing");
      return res.status(500).json({ error: "AI service not configured" });
    }

    const groq = new Groq({ apiKey });
    const systemPrompt = buildSystemPrompt(userPersona, recentContext);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "Hmm, I'm not sure what to say.";

    // 7. Save AI Response
    if (isSupabaseConfigured) {
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'ai',
        text: aiResponse,
        tag: 'general'
      });
    } else {
      const messages = inMemoryMessages.get(finalSessionId) || [];
      messages.push({
        id: crypto.randomUUID(),
        session_id: finalSessionId,
        user_id: userId,
        role: 'ai',
        text: aiResponse,
        tag: 'general',
        created_at: new Date().toISOString()
      });
      inMemoryMessages.set(finalSessionId, messages);
    }

    // 8. Return Response
    res.json({
      reply: aiResponse,
      sessionId: finalSessionId
    });

  } catch (error: any) {
    console.error("[Chat] Error:", error);
    res.status(500).json({ error: error.message || "Failed to process message" });
  }
});

// Keep the session and messages endpoints as they are useful
router.post("/api/session", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    let finalUserId = userId;

    if (!finalUserId) {
      // If no user ID provided, try to get dev user or generate one
      const user = await getOrCreateDevUser();
      finalUserId = user.id;
    }

    // Check for existing active session
    if (isSupabaseConfigured) {
      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', finalUserId)
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
          user_id: finalUserId,
          type: 'chat',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && session) {
        return res.json(session);
      }
    }

    // Fallback or Dev mode
    const sessionId = crypto.randomUUID();
    res.json({
      id: sessionId,
      user_id: finalUserId,
      type: 'chat',
      started_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Session] Error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/api/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) return res.json([]);

  if (isSupabaseConfigured) {
    const { data } = await supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });

    const transformed = (data || []).map((msg: any) => ({
      id: msg.id,
      sessionId: msg.session_id,
      userId: msg.user_id,
      role: msg.role,
      content: msg.text,
      createdAt: msg.created_at
    }));
    return res.json(transformed);
  }

  const messages = inMemoryMessages.get(sessionId) || [];
  const transformed = messages.map(msg => ({
    id: msg.id,
    sessionId: msg.session_id,
    userId: msg.user_id,
    role: msg.role,
    content: msg.text,
    createdAt: msg.created_at
  }));
  res.json(transformed);
});

export default router;

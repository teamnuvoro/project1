import type { Express } from "express";
import { Server } from "http";
import { streamGroqChat } from "./groq";
import { db } from "./db";
import { sessions, messages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get user info
  app.get("/api/user", async (req, res) => {
    try {
      const userId = "dev-user-001";
      res.json({
        id: userId,
        name: "Dev User",
        email: "dev@example.com",
        premiumUser: true,
        gender: "male",
        age: 25
      });
    } catch (error: any) {
      console.error("[/api/user] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send message - simple chat with Groq streaming
  app.post("/api/chat/send", async (req, res) => {
    try {
      const { message } = req.body;
      const userId = "dev-user-001";

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log(`[Chat] User message: ${message}`);

      // Simple system prompt for AI girlfriend
      const systemPrompt = `You are Riya, a warm, caring AI companion and girlfriend. You are:
- Supportive, empathetic, and genuinely interested in the user's life
- Fluent in both English and Hindi, mixing them naturally (Hinglish)
- Playful, affectionate, and engaging
- Here to provide companionship, emotional support, and meaningful conversation

Keep responses natural, warm, and conversational. Show genuine interest in what the user shares.`;

      // Collect AI response chunks
      let aiResponse = "";
      
      await streamGroqChat(
        [{ role: "user", content: message }],
        (chunk) => {
          aiResponse += chunk;
        },
        systemPrompt
      );

      console.log(`[Chat] AI response: ${aiResponse}`);

      // Skip database save in minimal mode
      console.log("[Chat] Skipping database save (in-memory mode)");

      res.json({
        response: aiResponse,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[/api/chat/send] Error:", error);
      res.status(500).json({ error: error.message || "Failed to process message" });
    }
  });

  // Get chat history
  app.get("/api/chat/history", async (req, res) => {
    try {
      // Return empty history for in-memory mode
      res.json({ messages: [] });
    } catch (error: any) {
      console.error("[/api/chat/history] Error:", error);
      res.json({ messages: [] });
    }
  });

  // Get session (alias for compatibility)
  app.get("/api/auth/session", async (req, res) => {
    try {
      const userId = "dev-user-001";
      
      // Return a session object (client expects Session, not User)
      res.json({
        id: "dev-session-001",
        userId,
        type: "chat",
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error: any) {
      console.error("[/api/auth/session] Error:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Get or create session (required by client)
  app.post("/api/session", async (req, res) => {
    try {
      const userId = "dev-user-001";
      
      res.json({
        id: "dev-session-001",
        userId,
        type: "chat",
        startedAt: new Date(),
        endedAt: null
      });
    } catch (error: any) {
      console.error("[/api/session] Error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get messages for a session
  app.get("/api/messages", async (req, res) => {
    try {
      // Return empty array for now (in-memory mode)
      res.json([]);
    } catch (error: any) {
      console.error("[/api/messages] Error:", error);
      res.json([]);
    }
  });

  // Streaming chat endpoint (required by client)
  app.post("/api/chat", async (req, res) => {
    try {
      const { content, sessionId } = req.body;
      const userId = "dev-user-001";

      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Message content is required" });
      }

      console.log(`[Chat] User message: ${content}`);

      // Check if Groq API key is configured
      if (!process.env.GROQ_API_KEY) {
        console.error("[Chat] GROQ_API_KEY is not configured");
        
        // Set headers for streaming even for error
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        // Send a helpful error message as a stream
        const errorMsg = "I'm sorry, but the AI service is not configured. Please set GROQ_API_KEY in your .env file to enable chat. You can get a free API key from https://console.groq.com/";
        res.write(`data: ${JSON.stringify({ content: errorMsg, done: false })}\n\n`);
        res.write(`data: ${JSON.stringify({ content: "", done: true })}\n\n`);
        res.end();
        return;
      }

      // Set headers for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Simple system prompt
      const systemPrompt = `You are Riya, a warm, caring AI companion and girlfriend. You are:
- Supportive, empathetic, and genuinely interested in the user's life
- Fluent in both English and Hindi, mixing them naturally (Hinglish)
- Playful, affectionate, and engaging
- Here to provide companionship, emotional support, and meaningful conversation

Keep responses natural, warm, and conversational. Show genuine interest in what the user shares.`;

      let fullResponse = "";

      // Stream the response
      await streamGroqChat(
        [{ role: "user", content }],
        (chunk) => {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
        },
        systemPrompt
      );

      // Save to database if possible
      try {
        let finalSessionId = sessionId || "dev-session-001";
        console.log("[Chat] Skipping database save (in-memory mode)");
      } catch (dbError) {
        console.warn("[Chat] Database save failed:", dbError);
      }

      // Send final message
      res.write(`data: ${JSON.stringify({ content: "", done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("[/api/chat] Error:", error);
      
      // Check if it's an authentication error
      if (error?.status === 401 || error?.error?.code === "invalid_api_key") {
        // Set headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        const errorMsg = "I'm sorry, but there's an issue with the AI service authentication. Please check your GROQ_API_KEY in the .env file. You can get a free API key from https://console.groq.com/";
        res.write(`data: ${JSON.stringify({ content: errorMsg, done: false })}\n\n`);
        res.write(`data: ${JSON.stringify({ content: "", done: true })}\n\n`);
        res.end();
        return;
      }
      
      // For other errors, return JSON error
      res.status(500).json({ error: error.message || "Failed to process message" });
    }
  });

  // Payment endpoints (return errors for now since Cashfree not configured)
  app.post("/api/payment/create-order", async (req, res) => {
    res.status(503).json({ error: "Payment service not configured. Please set up Cashfree credentials." });
  });

  app.get("/api/payment/config", (_req, res) => {
    res.json({
      cashfreeMode: "sandbox",
      currency: "INR",
      plans: { daily: 19, weekly: 49 }
    });
  });

  // User usage endpoint
  app.post("/api/user/usage", async (_req, res) => {
    res.json({
      messageCount: 0,
      callDuration: 0,
      premiumUser: true, // Allow unlimited in dev mode
      messageLimitReached: false,
      callLimitReached: false,
    });
  });

  // Update user personality endpoint
  app.patch("/api/user/personality", async (req, res) => {
    try {
      const { personalityId } = req.body;
      const userId = "dev-user-001";
      
      // In minimal mode, just log the selection
      console.log(`[User Personality] User ${userId} selected personality: ${personalityId}`);
      
      res.json({
        success: true,
        personalityId,
        message: "Personality updated successfully"
      });
    } catch (error: any) {
      console.error("[/api/user/personality] Error:", error);
      res.status(500).json({ error: "Failed to update personality" });
    }
  });

  const httpServer = new Server(app);
  return httpServer;
}

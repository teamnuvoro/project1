import "dotenv/config";
import express from "express";
import cors from "cors";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
import { WebSocketServer, WebSocket as WS } from "ws";
import { ensureSecretsLoaded } from "./secrets";
import { getSarvamSTTWebSocketUrl, getSarvamTTSWebSocketUrl } from "./services/sarvam";
import chatRoutes from "./routes/chat";
import supabaseApiRoutes from "./routes/supabase-api";
import callRoutes from "./routes/call";
import summaryRoutes from "./routes/summary";
import userSummaryRoutes from "./routes/user-summary";
import authRoutes from "./routes/auth";
import paymentRoutes from "./routes/payment";
import paymentMockRoutes from "./routes/payment-mock";
import paymentsRebuildRoutes from "./routes/payments-rebuild";
import transcribeRoutes from "./routes/deepgram-transcribe";
import messagesHistoryRoutes from "./routes/messages-history";
import analyticsRoutes from "./routes/analytics-events";
import reminderRoutes from "./routes/reminders";
import imageRoutes from "./routes/images";
import { initializeReminderScheduler } from "./jobs/reminder-scheduler";
import { createClient } from "@deepgram/sdk";

const app = express();

// Initialize Deepgram
// Ensure DEEPGRAM_API_KEY is present in your environment
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// =====================================================
// HEALTH CHECKS - MUST BE FIRST (before ANY middleware)
// =====================================================
// Fast health check for Render deployment (no middleware, instant response)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root health check for Render
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "riya-ai" });
});

// CORS - Allow requests from frontend (including ngrok for local HTTPS testing)
app.use(cors({
  origin: [
    'http://localhost:3001', // Frontend port
    'http://localhost:3002', // Frontend port (alternative)
    'http://localhost:8080', // Keep for backward compatibility
    'http://localhost:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:8080',
    process.env.NGROK_URL || 'https://prosurgical-nia-carpingly.ngrok-free.dev'
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware (after health checks)
app.use(ensureSecretsLoaded);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Layer 1: The "Cache Killer" - Middleware to prevent static cache leaks
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Authentication routes (OTP-based signup/login)
// Detailed health check endpoint (for debugging)
app.get("/api/health/detailed", (req, res) => {
  res.json({
    status: "ok",
    env: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GROQ_KEY: !!process.env.GROQ_API_KEY,
      TWILIO_SID: !!process.env.TWILIO_ACCOUNT_SID,
      VAPI_KEY: !!process.env.VAPI_PRIVATE_KEY,
      CASHFREE_ID: !!process.env.CASHFREE_APP_ID,
      AMPLITUDE_KEY: !!process.env.VITE_AMPLITUDE_API_KEY,
      DEEPGRAM_KEY: !!process.env.DEEPGRAM_API_KEY,
    },
    timestamp: new Date().toISOString()
  });
});

app.use(authRoutes);

// Supabase API routes (user, sessions, messages, etc.)
app.use(supabaseApiRoutes);

// Chat routes (Groq AI)
app.use(chatRoutes);

// Call routes (voice calls - Sarvam)
app.use(callRoutes);

// Summary routes (relationship insights)
app.use(summaryRoutes);

// User summary routes (cumulative understanding)
app.use("/api/user-summary", userSummaryRoutes);

// Payment routes (Cashfree integration)
app.use(paymentRoutes);

// New payment routes (rebuild - following spec)
app.use(paymentsRebuildRoutes);

// Transcribe routes (Deepgram speech-to-text)
app.use(transcribeRoutes);

// Messages history routes (for Memories page)
app.use(messagesHistoryRoutes);

// Analytics routes
app.use(analyticsRoutes);

// Reminder routes (WhatsApp notifications)
app.use(reminderRoutes);

// Image management routes (chat images)
app.use(imageRoutes);

// Update user personality endpoint
app.patch("/api/user/personality", async (req, res) => {
  try {
    const { personalityId } = req.body;
    console.log(`[User Personality] Selected: ${personalityId}`);
    res.json({ success: true, personalityId });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update user personality" });
  }
});

// Auth session endpoint
app.get("/api/auth/session", async (req, res) => {
  try {
    res.status(401).json({ error: "Authentication required" });
  } catch (error: any) {
    console.error("[/api/auth/session] Error:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  (async () => {
    console.log("[Server] Starting server with Deepgram Voice integration...");

    const server = new Server(app);

    // Setup WebSocket proxy for Deepgram TTS
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname;

      if (pathname.startsWith('/api/sarvam/ws/proxy')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          handleVoiceProxy(ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Replaced Sarvam logic with Deepgram
    function handleVoiceProxy(clientWs: any, request: any) {
      console.log('[Voice] Client connected to Voice Proxy (Deepgram)');

      clientWs.on('message', async (msg: Buffer) => {
        try {
          const textMsg = msg.toString();
          // Try to parse as JSON first (standard format: { type: 'text', data: { text: '...' } })
          let textToSpeak = '';

          try {
            const parsed = JSON.parse(textMsg);
            if (parsed.type === 'text' && parsed.data?.text) {
              textToSpeak = parsed.data.text;
            } else if (parsed.text) {
              // Internal fallback format
              textToSpeak = parsed.text;
            }
          } catch (e) {
            // Not JSON, ignore or log
            // Might be binary, but we expect text for TTS requests
          }

          if (textToSpeak) {
            console.log(`[Voice] Generating audio for: "${textToSpeak.substring(0, 50)}..."`);

            if (!process.env.DEEPGRAM_API_KEY) {
              console.error('[Voice] Missing DEEPGRAM_API_KEY');
              clientWs.send(JSON.stringify({ type: 'error', message: 'Server missing Deepgram API Key' }));
              return;
            }

            // Request Audio from Deepgram
            const response = await deepgram.speak.request(
              { text: textToSpeak },
              {
                model: "aura-asteria-en",
                encoding: "linear16", // Raw PCM
                container: "wav",     // WAV container (safe for browsers)
                sample_rate: 24000,
              }
            );

            // Stream the Audio back to the Client
            const stream = await response.getStream();

            if (stream) {
              const reader = stream.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                if (clientWs.readyState === 1) {
                  // Send binary audio chunk directly to frontend
                  clientWs.send(value);
                }
              }
              console.log('[Voice] Audio stream finished');

              // Optional: Send a marker that audio is done if frontend expects it
              // clientWs.send(JSON.stringify({ type: 'audio_end' }));
            } else {
              console.error('[Voice] Error: No stream received from Deepgram');
            }
          }
        } catch (error) {
          console.error('[Voice] Error processing message:', error);
        }
      });

      clientWs.on('close', () => {
        console.log('[Voice] Client disconnected');
      });

      clientWs.on('error', (err: any) => {
        console.error('[Voice] WebSocket error:', err);
      });
    }

    // Setup Vite or serve static files
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`🚀 Server running on port ${port}`);
      console.log(`[Server] ✅ Frontend server listening on port ${port}`);
      console.log(`[Server] 🔄 Supabase API routes integrated`);
      console.log(`[Server] 🔄 Chat API routes integrated`);
      console.log(`[Server] 🔄 Voice Proxy enabled on /api/sarvam/ws/proxy (powered by Deepgram)`);

      // Initialize reminder scheduler
      initializeReminderScheduler();
    });
  })();
}

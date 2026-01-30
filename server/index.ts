import "dotenv/config";
import express from "express";
import cors from "cors";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
import path from "path";
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
import bolnaRoutes from "./routes/bolna";
import vapiTtsRoutes from "./routes/vapi-tts";
import { initializeReminderScheduler } from "./jobs/reminder-scheduler";
import { runProductionSafetyChecks } from "./utils/productionChecks";
import { DODO_ENABLED } from "./config";

const app = express();


// =====================================================
// HEALTH CHECKS - MUST BE FIRST (before ANY middleware)
// =====================================================
// Fast health check for Render deployment (no middleware, instant response)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root route - will be handled by static file serving in production
// Health check is at /api/health instead

// =====================================================
// CORS CONFIGURATION - MUST BE BEFORE BODY PARSERS
// =====================================================
// Properly configured CORS with all required methods and headers
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
// Note: CORS middleware automatically handles OPTIONS preflight requests

// Serve static files from public folder (for audio storage)
app.use('/audio', express.static(path.join(process.cwd(), 'public/audio')));

// Content Security Policy (CSP) - Required for Vapi WebRTC
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://*.vapi.ai https://*.daily.co https://*.m.str.chat; script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' blob: https://*.vapi.ai https://*.daily.co https://*.m.str.chat; worker-src blob:; connect-src * blob: wss:; media-src blob: https://*.daily.co https://*.vapi.ai; frame-src https://*.vapi.ai https://*.daily.co;"
  );
  // Permissions-Policy: avoid deprecated features (interest-cohort, browsing-topics) to prevent console warnings
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  next();
});

// =====================================================
// SECRETS LOADING
// =====================================================
app.use(ensureSecretsLoaded);

// =====================================================
// BODY PARSING - ROUTE-SPECIFIC MIDDLEWARE
// =====================================================
// CRITICAL: Different body parsers for different routes
// - /api/* routes need express.json() for JSON payloads
// - /vapi/tts needs express.raw() to handle Vapi streams without parsing
// This prevents "stream is not readable" errors

// Apply body parser: webhook uses raw only when Dodo enabled; otherwise JSON
app.use('/api', (req, res, next) => {
  if (req.path === '/payment/webhook' && req.method === 'POST' && DODO_ENABLED) {
    return express.raw({ type: 'application/json', limit: '10mb' })(req, res, next);
  }
  return express.json()(req, res, next);
});

// Apply express.raw() ONLY to /vapi/* routes (for TTS endpoint)
app.use('/vapi', express.raw({ type: "*/*", limit: "20mb" }));

// URL encoded form data (for any routes that need it)
app.use(express.urlencoded({ extended: false }));

// Layer 1: The "Cache Killer" - Middleware to prevent static cache leaks
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// =========================================================
// FIREBASE AUTH (single source of truth)
// - Frontend sends Firebase ID token in Authorization header
// - Backend verifies token and sets req.firebaseUser
// - resolveFirebaseUser maps firebase UID -> internal userId and sets req.session
// =========================================================
import { requireFirebaseAuth } from "./middleware/requireFirebaseAuth";
import { resolveFirebaseUser } from "./middleware/resolveFirebaseUser";
// Skip Firebase auth for these paths (req.path is full path e.g. /api/analytics/event)
const noAuthPaths = ["/api/health", "/api/health/detailed", "/api/payment/webhook", "/api/analytics/event"];
app.use("/api", (req, res, next) => {
  if (noAuthPaths.includes(req.path)) {
    return next();
  }
  return requireFirebaseAuth(req, res, next);
});
app.use("/api", (req, res, next) => {
  if (noAuthPaths.includes(req.path)) {
    return next();
  }
  return resolveFirebaseUser(req, res, next);
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
      BOLNA_KEY: !!process.env.BOLNA_API_KEY,
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

// Bolna AI routes
app.use(bolnaRoutes);

// Vapi Custom TTS Route
app.use(vapiTtsRoutes);

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

// GET /api/auth/session — return current session when authenticated (Firebase)
app.get("/api/auth/session", async (req, res) => {
  try {
    const session = (req as any).session as { userId?: string; firebaseUid?: string } | undefined;
    if (!session?.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    res.json({ ok: true, userId: session.userId, firebaseUid: session.firebaseUid });
  } catch (error: any) {
    console.error("[/api/auth/session] Error:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

// =========================================================
// VAPI.AI INTEGRATION (Voice-as-a-Service)
// =========================================================
app.post('/api/vapi/chat', async (req, res) => {
  try {
    const payload = req.body;

    // Log incoming Vapi payload for debugging
    // console.log('[Vapi] Payload:', JSON.stringify(payload, null, 2));

    // 1. Vapi sends a "message" type when the user finishes speaking
    // message.type can be 'transcript', 'function-call', 'speech-update', etc.
    if (payload.message && payload.message.type === 'transcript' && payload.message.transcriptType === 'final') {
      const userMessage = payload.message.transcript;

      console.log(`[Riya Brain] User said: "${userMessage}"`);

      // 2. BRAIN LOGIC
      // TODO: Connect this to the actual getRiyaResponse(userMessage) logic in routes/chat.ts
      // For now, using a static response to confirm architecture works
      const aiResponse = "Hey! I can hear you perfectly now. This architecture is much better.";

      // 3. Send the text back to Vapi. Vapi will speak it using the configured voice.
      res.json({
        message: {
          type: "model-output",
          output: aiResponse
        }
      });
    } else {
      // Respond 200 OK to other events (call-start, call-end, speech-update, etc.)
      res.status(200).send();
    }
  } catch (error) {
    console.error('[Vapi Error]', error);
    res.status(500).send();
  }
});


export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  (async () => {
    console.log("[Server] Starting server with Vapi.ai integration...");

    const server = new Server(app);

    // Setup WebSocket proxy (Disabled for Vapi migration, but kept for potential features)
    // const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      // Vapi uses HTTP, so we don't need to upgrade WebSockets anymore for voice
      // Keeping this block if we need WS for other features, but rejecting voice path

      const pathname = new URL(request.url || '/', 'http://localhost').pathname;

      if (pathname.startsWith('/api/sarvam/ws/proxy')) {
        // DISABLED FOR VAPI
        console.log('[Server] Rejecting old WebSocket proxy connection (Using Vapi now)');
        socket.destroy();
      } else {
        socket.destroy();
      }
    });

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
      console.log(`[Server] 🎙️ Vapi.ai Chat Endpoint ready at /api/vapi/chat`);
      // Dodo Payments: independent check — missing Vonage must not affect Dodo
      if (DODO_ENABLED) {
        console.info('[Startup] ✅ Dodo Payments initialized (DODO_PAYMENTS_API_KEY, DODO_WEBHOOK_SECRET).');
      } else {
        console.info('[Startup] ⚠️ Dodo Payments skipped — set DODO_PAYMENTS_API_KEY and DODO_WEBHOOK_SECRET to enable.');
      }

      // Vonage OTP: independent check — missing Vonage must not block Dodo
      const vonageEnabled = !!(process.env.VONAGE_API_KEY?.trim()) && !!(process.env.VONAGE_API_SECRET?.trim());
      if (vonageEnabled) {
        console.info('[Startup] ✅ Vonage OTP initialized (VONAGE_API_KEY, VONAGE_API_SECRET).');
      } else {
        console.info('[Startup] ⚠️ Vonage OTP skipped — set VONAGE_API_KEY and VONAGE_API_SECRET to enable.');
      }

      // Initialize reminder scheduler
      initializeReminderScheduler();
    });
  })();
}

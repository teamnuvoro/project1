import "dotenv/config";
import express from "express";
import cors from "cors";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
import { ensureSecretsLoaded } from "./secrets";
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

const app = express();

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
    'http://localhost:8080', // Keep for backward compatibility
    'http://localhost:3000', 
    'http://127.0.0.1:3001',
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
    },
    timestamp: new Date().toISOString()
  });
});

app.use(authRoutes);

// Supabase API routes (user, sessions, messages, etc.)
app.use(supabaseApiRoutes);

// Chat routes (Groq AI)
app.use(chatRoutes);

// Call routes (Vapi voice calls)
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
    res.status(500).json({ error: "Failed to update personality" });
  }
});

// Auth session endpoint (for compatibility with AuthContext)
app.get("/api/auth/session", async (req, res) => {
  try {
    // For dev mode, return a mock user
    // In production, this should validate the session
    // Secure default: Return 401 if not authenticated
    // Client should use Supabase auth to establish session
    res.status(401).json({ error: "Authentication required" });
  } catch (error: any) {
    console.error("[/api/auth/session] Error:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

// Export app for Vercel
export default app;

// Only start server if run directly (not imported)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  (async () => {
    console.log("[Server] Starting server with Supabase integration...");

    const server = new Server(app);

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
      
      // Initialize reminder scheduler
      initializeReminderScheduler();
    });
  })();
}

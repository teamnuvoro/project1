import "dotenv/config";
import express from "express";
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
import transcribeRoutes from "./routes/deepgram-transcribe";
import messagesHistoryRoutes from "./routes/messages-history";

const app = express();

// Middleware
app.use(ensureSecretsLoaded);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Authentication routes (OTP-based signup/login)
// Health check endpoint to verify environment variables
app.get("/api/health", (req, res) => {
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
      AMPLITUDE_KEY: !!process.env.VITE_AMPLITUDE_API_KEY, // Check if server sees this (it might not, but client should)
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

// Transcribe routes (Deepgram speech-to-text)
app.use(transcribeRoutes);

// Messages history routes (for Memories page)
app.use(messagesHistoryRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// User usage endpoint
app.post("/api/user/usage", async (_req, res) => {
  res.json({
    messageCount: 0,
    callDuration: 0,
    premiumUser: false,
    messageLimitReached: false,
    callLimitReached: false,
  });
});

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
    res.json({
      user: {
        id: "dev-user-id",
        name: "Dev User",
        email: "dev@example.com",
        persona: "sweet_supportive",
        premium_user: false,
        gender: "male",
        onboarding_complete: false // Track if user completed onboarding
      }
    });
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

    const port = parseInt(process.env.PORT || '5000', 10);

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`🚀 Server running on port ${port}`);
      console.log(`[Server] ✅ Frontend server listening on port ${port}`);
      console.log(`[Server] 🔄 Supabase API routes integrated`);
      console.log(`[Server] 🔄 Chat API routes integrated`);
    });
  })();
}

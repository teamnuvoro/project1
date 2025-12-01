import "dotenv/config";
import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
import chatRoutes from "./routes/chat";
import supabaseApiRoutes from "./routes/supabase-api";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Supabase API routes (user, sessions, messages, etc.)
app.use(supabaseApiRoutes);

// Chat routes (Groq AI)
app.use(chatRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Payment routes
app.get("/api/payment/config", (_req, res) => {
  res.json({
    cashfreeMode: process.env.CASHFREE_MODE || "sandbox",
    currency: "INR",
    plans: { daily: 19, weekly: 49 }
  });
});

app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { planType } = req.body;
    
    // Check if Cashfree credentials are configured
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(503).json({ 
        error: "Payment service not configured. Please set up Cashfree credentials." 
      });
    }
    
    // TODO: Implement Cashfree order creation
    res.status(503).json({ error: "Payment integration pending. Contact support." });
  } catch (error: any) {
    console.error("[Payment] Error creating order:", error);
    res.status(500).json({ error: error.message || "Failed to create payment order" });
  }
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

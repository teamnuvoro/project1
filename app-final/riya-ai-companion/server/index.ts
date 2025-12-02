import "dotenv/config";
import express from "express";
import compression from "compression";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
import chatRoutes from "./routes/chat";
import supabaseApiRoutes from "./routes/supabase-api";
import summaryRoutes from "./routes/summary";
import callRoutes from "./routes/call";
import userSummaryRoutes from "./routes/user-summary";

const app = express();

// Compression middleware (gzip for responses > 1kb)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Supabase API routes (user, sessions, messages, etc.)
app.use(supabaseApiRoutes);

// Chat routes (Groq AI)
app.use(chatRoutes);

// Summary and analytics routes
app.use(summaryRoutes);

// Call/Voice routes
app.use(callRoutes);

// User Summary routes (cumulative insights)
app.use('/api/user-summary', userSummaryRoutes);

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

// Dev user ID - MUST match the one in chat.ts
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

// Auth session endpoint (for compatibility with AuthContext)
app.get("/api/auth/session", async (req, res) => {
  try {
    // For dev mode, return a mock user with the proper UUID
    // In production, this should validate the session
    console.log("[Auth] Returning dev user session with ID:", DEV_USER_ID);
    res.json({
      user: {
        id: DEV_USER_ID,
        name: "Dev User",
        email: "dev@example.com",
        persona: "sweet_supportive",
        premium_user: true, // Premium in dev mode
        gender: "male",
        onboarding_complete: true
      }
    });
  } catch (error: any) {
    console.error("[/api/auth/session] Error:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

(async () => {
  console.log("[Server] Starting server with Supabase integration...");
  console.log("[Server] SUPABASE_SERVICE_ROLE_KEY set:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("[Server] GROQ_API_KEY set:", !!process.env.GROQ_API_KEY);
  
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
    console.log(`[Server] 🔄 User Summary routes integrated`);
  });
})();

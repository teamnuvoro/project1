import "dotenv/config";
import express from "express";
import { ensureSecretsLoaded } from "../lib/secrets";
import chatRoutes from "../lib/routes/chat";
import supabaseApiRoutes from "../lib/routes/supabase-api";
import callRoutes from "../lib/routes/call";
import summaryRoutes from "../lib/routes/summary";
import userSummaryRoutes from "../lib/routes/user-summary";
import authRoutes from "../lib/routes/auth";
import paymentRoutes from "../lib/routes/payment";
import transcribeRoutes from "../lib/routes/deepgram-transcribe";
import messagesHistoryRoutes from "../lib/routes/messages-history";

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
            AMPLITUDE_KEY: !!process.env.VITE_AMPLITUDE_API_KEY,
        },
        timestamp: new Date().toISOString()
    });
});

app.use(authRoutes);
app.use(supabaseApiRoutes);
app.use(chatRoutes);
app.use(callRoutes);
app.use(summaryRoutes);
app.use("/api/user-summary", userSummaryRoutes);
app.use(paymentRoutes);
app.use(transcribeRoutes);
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

// Auth session endpoint
app.get("/api/auth/session", async (req, res) => {
    try {
        res.json({
            user: {
                id: "dev-user-id",
                name: "Dev User",
                email: "dev@example.com",
                persona: "sweet_supportive",
                premium_user: false,
                gender: "male",
                onboarding_complete: false
            }
        });
    } catch (error: any) {
        console.error("[/api/auth/session] Error:", error);
        res.status(500).json({ error: "Failed to get session" });
    }
});

export default app;

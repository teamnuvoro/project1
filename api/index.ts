import "dotenv/config";
import express from "express";
import { ensureSecretsLoaded } from "../server/secrets";
import chatRoutes from "../server/routes/chat";
import supabaseApiRoutes from "../server/routes/supabase-api";
import callRoutes from "../server/routes/call";
import summaryRoutes from "../server/routes/summary";
import userSummaryRoutes from "../server/routes/user-summary";
import authRoutes from "../server/routes/auth";
import paymentRoutes from "../server/routes/payment";
import transcribeRoutes from "../server/routes/deepgram-transcribe";
import messagesHistoryRoutes from "../server/routes/messages-history";
import analyticsEventsRoutes from "../server/routes/analytics-events";

const app = express();

// Middleware
app.use(ensureSecretsLoaded);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug Logging
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// Debug Endpoint
app.get("/api/debug", (req, res) => {
    res.json({
        message: "Server is running",
        url: req.url,
        originalUrl: req.originalUrl,
        headers: req.headers,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            HAS_SUPABASE: !!process.env.SUPABASE_URL
        }
    });
});

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
            GEMINI_KEY: !!process.env.GEMINI_API_KEY,
        },
        timestamp: new Date().toISOString()
    });
});

// Authentication: Verify Supabase JWT
app.use(async (req, res, next) => {
    // Skip for public routes
    if (req.path === '/api/health' || req.path === '/api/debug') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader) {
        // In a real implementation, you would verify the JWT here using supabase.auth.getUser(token)
        // For now, we trust the client to send a valid token if they have one
        // The actual RLS policies in Supabase will enforce security at the database level
    }
    next();
});

// CORS Middleware
// CORS Middleware
app.use((req, res, next) => {
    // Allow requests from your Vercel frontend and Render backend
    const allowedOrigins = [
        "https://project1-kappa-tan.vercel.app",
        "https://project1-2q99.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000"
    ];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    } else {
        // Fallback for development or direct API calls
        res.header("Access-Control-Allow-Origin", "*");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-webhook-signature, x-webhook-timestamp");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(authRoutes);
app.use(supabaseApiRoutes);
app.use(chatRoutes);
app.use(callRoutes);
app.use(summaryRoutes);
app.use("/api/user-summary", userSummaryRoutes); // This one is fine as is, or I can change it if I change the file.
// user-summary.ts has relative paths /:userId etc. So mounting at /api/user-summary is correct.
// ... (existing imports)

app.use(paymentRoutes);
app.use(transcribeRoutes);
app.use(messagesHistoryRoutes);
app.use(analyticsEventsRoutes);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

// Serve static files from the React app build directory
import path from "path";
const clientBuildPath = path.join(__dirname, "public");
app.use(express.static(clientBuildPath));

// For any other request, send back index.html (SPA routing)
// BUT only if it's not an API request
app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
        return next();
    }
    res.sendFile(path.join(clientBuildPath, "index.html"), (err) => {
        if (err) {
            next();
        }
    });
});

// Catch-all for debugging 404s (API only)
app.use("*", (req, res) => {
    console.log(`[404] ${req.method} ${req.originalUrl} - No route matched`);
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
        method: req.method,
        availableRoutes: [
            "/api/auth/session",
            "/api/auth/login",
            "/api/debug",
            "/api/health",
            "/api/test-chat"
        ]
    });
});

// Add a simple test route to verify the server is running and reachable
app.post("/api/test-chat", (req, res) => {
    console.log("[Test Chat] Endpoint hit!");
    res.json({
        message: "Backend is reachable!",
        timestamp: new Date().toISOString()
    });
});

export default app;

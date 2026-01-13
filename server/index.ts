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

    // Setup WebSocket proxy for Sarvam (browsers can't send custom headers)
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname;

      if (pathname.startsWith('/api/sarvam/ws/proxy')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          handleSarvamProxy(ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Map internal persona names to valid Sarvam speaker IDs
    const SPEAKER_MAP: Record<string, string> = {
      'riya': 'anushka',    // Map Riya to Anushka (valid Sarvam speaker)
      'meera': 'amartya',   // Map Meera to Amartya (valid Sarvam speaker)
      'anushka': 'anushka', // Already valid
      'amartya': 'amartya', // Already valid
      'aditi': 'aditi',     // Already valid
      'default': 'anushka'  // Default fallback
    };

    function handleSarvamProxy(clientWs: any, request: any) {
      const url = new URL(request.url || '/', 'http://localhost');
      const type = url.searchParams.get('type'); // 'stt' or 'tts'
      const language = url.searchParams.get('language') || 'hi-IN';
      const speakerParam = url.searchParams.get('speaker') || 'riya';
      // Map internal persona name to valid Sarvam speaker ID
      const speaker = SPEAKER_MAP[speakerParam.toLowerCase()] || SPEAKER_MAP['default'];
      const model = url.searchParams.get('model') || 'bulbul:v2';

      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) {
        console.error('[Sarvam Proxy] API key not configured');
        clientWs.close(1008, 'Sarvam API key not configured');
        return;
      }

      let targetUrl: string;
      if (type === 'stt') {
        targetUrl = getSarvamSTTWebSocketUrl(language);
      } else if (type === 'tts') {
        targetUrl = getSarvamTTSWebSocketUrl(language, speaker, model);
      } else {
        clientWs.close(1008, 'Invalid type: must be "stt" or "tts"');
        return;
      }

      console.log(`[Sarvam Proxy] Proxying ${type} connection to: ${targetUrl.replace(apiKey, 'sk_***')}`);

      // Connect to Sarvam with proper headers
      // Only use header, not URL param (URL params might interfere with message parsing)
      const headers: Record<string, string> = {
        'Api-Subscription-Key': apiKey,
      };

      console.log(`[Sarvam Proxy] Connecting with header only (no URL param)`);
      console.log(`[Sarvam Proxy] Target URL: ${targetUrl.replace(apiKey, 'sk_***')}`);
      const sarvamWs = new WS(targetUrl, { headers });

      // Track if config has been sent and if text has been sent for TTS
      let ttsConfigSent = false;
      let ttsTextSent = false;

      const sendTTSConfig = () => {
        if (ttsConfigSent || type !== 'tts') return;
        ttsConfigSent = true;

        try {
          if (sarvamWs.readyState === WS.OPEN) {
            // ✅ FIX: Use valid Sarvam speaker ID (already mapped from internal persona name)
            // The speaker parameter has already been mapped from "riya"/"meera" to "anushka"/"amartya"
            const speakerValue = String(speaker || 'anushka').trim();
            const languageValue = String(language || 'hi-IN').trim();

            console.log(`[Sarvam Proxy] Using speaker ID: ${speakerValue} (mapped from: ${speakerParam})`);

            if (!speakerValue || !languageValue) {
              console.error(`[Sarvam Proxy] ❌ Invalid config values`);
              return;
            }

            // Build config message matching documentation exactly
            // Ensure all values are properly typed (no undefined/null)
            // DEBUG: Sending MINIMAL config to fix 422 error
            const configData: Record<string, any> = {
              speaker: "anushka", // Hardcoded valid ID for testing
              target_language_code: "hi-IN"
            };

            // Remove any undefined/null values
            Object.keys(configData).forEach(key => {
              if (configData[key] === undefined || configData[key] === null) {
                delete configData[key];
              }
            });

            const finalConfigMessage = {
              type: "config",
              data: configData
            };

            // Convert to JSON string with no extra spaces (compact)
            const configJson = JSON.stringify(finalConfigMessage);
            console.log(`[Sarvam Proxy] Sending FULL config message:`, configJson);
            console.log(`[Sarvam Proxy] Config includes all fields from documentation`);

            // Verify it's valid JSON
            try {
              const verified = JSON.parse(configJson);
              console.log(`[Sarvam Proxy] ✅ JSON verification passed`);
            } catch (e) {
              console.error(`[Sarvam Proxy] ❌ JSON verification FAILED:`, e);
              return;
            }

            // ✅ FIX: Send as TEXT FRAME (string), not binary (Buffer)
            // Sarvam API requires Text Frame for JSON messages, not Binary Frame
            // Ensure we send as UTF-8 string explicitly
            // The ws library sends strings as text frames automatically
            sarvamWs.send(configJson, { binary: false });
            console.log(`[Sarvam Proxy] ✅ Full config sent as TEXT FRAME (${configJson.length} bytes)`);
            console.log(`[Sarvam Proxy] Config JSON (for debugging):`, configJson);

          } else {
            console.error(`[Sarvam Proxy] ❌ Cannot send config - WS state: ${sarvamWs.readyState}`);
          }
        } catch (err: any) {
          console.error('[Sarvam Proxy] ❌ Failed to send config:', err?.message || err);
          console.error('[Sarvam Proxy] Error stack:', err?.stack);
        }
      };

      const sendTTSText = (text: string) => {
        if (ttsTextSent && text === 'Hello! I am Riya. How are you today?') return; // Only prevent duplicate greeting
        if (type !== 'tts') return;

        try {
          if (sarvamWs.readyState === WS.OPEN) {
            // ✅ OFFICIAL DOCS FORMAT: Exact format from https://docs.sarvam.ai/api-reference-docs/text-to-speech/api/streaming
            // Text message with "data" wrapper as shown in documentation
            // Range: 0-2500 characters, recommended <500 for optimal streaming
            const textMessage = {
              type: "text",
              data: {
                text: text
              }
            };

            const textJson = JSON.stringify(textMessage);
            console.log(`[Sarvam Proxy] Sending text message (${text.length} chars):`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
            // ✅ FIX: Send as TEXT FRAME (string), not binary
            // Passing a string automatically sends as Text Frame
            sarvamWs.send(textJson);
            console.log(`[Sarvam Proxy] ✅ Text message sent as TEXT FRAME`);

            // 2. Send Flush (Force it to speak)
            // Immediately following the text sending to force generation
            const flushMessage = JSON.stringify({ type: "flush" });
            sarvamWs.send(flushMessage);
            console.log(`[Sarvam Proxy] 🚽 Flush command sent`);

            if (text === 'Hello! I am Riya. How are you today?') {
              ttsTextSent = true; // Mark greeting as sent
            }
          } else {
            console.error(`[Sarvam Proxy] ❌ Cannot send text message - WS state: ${sarvamWs.readyState}`);
          }
        } catch (err: any) {
          console.error('[Sarvam Proxy] ❌ Failed to send text message:', err?.message || err);
        }
      };

      sarvamWs.on('open', () => {
        console.log(`[Sarvam Proxy] ${type} connected to Sarvam successfully`);

        // If TTS, send config message IMMEDIATELY as the first message
        // Documentation states: "You MUST send the config message as the very first message after the connection opens"
        if (type === 'tts') {
          console.log(`[Sarvam Proxy] Sending config immediately as first message...`);
          sendTTSConfig();

          // Send text message after config has time to be processed
          setTimeout(() => {
            const greetingText = 'Hello! I am Riya. How are you today?';
            sendTTSText(greetingText);
          }, 1500); // Wait for config acknowledgment
        }
      });

      sarvamWs.on('error', (error: Error) => {
        console.error(`[Sarvam Proxy] Sarvam ${type} WebSocket error:`, error.message || error);
        clientWs.close(1006, `Sarvam connection error: ${error.message}`);
      });

      sarvamWs.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason.toString();
        console.log(`[Sarvam Proxy] Sarvam ${type} closed: code=${code}, reason=${reasonStr || 'none'}`);
        if (code !== 1000 && code !== 1001) {
          // Abnormal closure - notify client
          clientWs.close(code, `Sarvam closed: ${reasonStr || `code ${code}`}`);
        } else {
          clientWs.close();
        }
      });

      // Forward messages from client to Sarvam
      clientWs.on('message', (data: Buffer) => {
        if (sarvamWs.readyState === WS.OPEN) {
          // Log text messages for TTS
          if (type === 'tts') {
            try {
              const text = data.toString('utf8');
              const parsed = JSON.parse(text);

              // ✅ OFFICIAL DOCS FORMAT: The documentation shows "data" wrapper IS required
              // See: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api
              if (parsed.type === 'text' && parsed.data?.text) {
                const text = parsed.data.text;
                console.log(`✅ [Sarvam Proxy] Forwarding TTS text message: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
              } else if (parsed.type === 'config') {
                console.log(`✅ [Sarvam Proxy] Forwarding TTS config message`);
              } else {
                // Check for old formats (for backward compatibility/debugging)
                if (parsed.action === 'speak' && parsed.text) {
                  console.log(`⚠️ [Sarvam Proxy] Received OLD format message from client: {action: 'speak', text: '...'}`);
                  console.log(`⚠️ [Sarvam Proxy] This should be transformed to {type: 'text', text: '...'} format`);
                } else if (parsed.inputs && Array.isArray(parsed.inputs)) {
                  console.log(`⚠️ [Sarvam Proxy] Received OLD format message with inputs array`);
                  console.log(`⚠️ [Sarvam Proxy] This should be transformed to {type: 'text', text: '...'} format`);
                }
                console.log(`[Sarvam Proxy] Forwarding TTS message:`, parsed);
              }
            } catch {
              // Not JSON, just binary audio data
              console.log(`[Sarvam Proxy] Forwarding ${data.length} bytes to Sarvam TTS (binary)`);
            }
          }
          sarvamWs.send(data);
        } else {
          console.warn(`[Sarvam Proxy] Dropped message from client - Sarvam ${type} not ready (state: ${sarvamWs.readyState})`);
        }
      });

      // Forward messages from Sarvam to client
      // REPLACEMENT START
      sarvamWs.on('message', (data: any, isBinary: boolean) => {
        // 1. Handle Binary Audio (The Voice)
        if (isBinary) {
          // Log the FIRST chunk only to prove it's working, then silence
          // console.log(`[Sarvam Proxy] 🎵 Audio Chunk: ${data.length} bytes`); 

          if (clientWs.readyState === 1) {
            // CRITICAL: Send as binary
            clientWs.send(data, { binary: true });
          }
          return;
        }

        // 2. Handle Text Messages (Errors or Events)
        try {
          const msg = data.toString();

          // Log errors if they happen
          if (msg.includes("error")) {
            console.error('[Sarvam Proxy] 🚨 Sarvam Reported Error:', msg);
          }

          if (clientWs.readyState === 1) {
            clientWs.send(msg);
          }
        } catch (e) {
          console.error('[Sarvam Proxy] Message parsing error:', e);
        }
      });
      // REPLACEMENT END

      // Handle client errors
      clientWs.on('error', (error: Error) => {
        console.error(`[Sarvam Proxy] Client ${type} error:`, error.message || error);
        sarvamWs.close();
      });

      // Handle client close
      clientWs.on('close', () => {
        console.log(`[Sarvam Proxy] Client ${type} disconnected`);
        sarvamWs.close();
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
      console.log(`[Server] 🔄 Sarvam WebSocket proxy enabled on /api/sarvam/ws/proxy`);

      // Initialize reminder scheduler
      initializeReminderScheduler();
    });
  })();
}

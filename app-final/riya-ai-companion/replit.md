# Riya AI Companion Chatbot

## Quick Start (Local Setup)

See `docs/LOCAL_SETUP_GUIDE.md` for complete local setup instructions:
1. Install Node.js 20+
2. Create Supabase & Groq accounts
3. Clone repo & run `npm install`
4. Create `.env` with required keys
5. Run `npm run dev` → http://localhost:5000

## Migration Documentation

A complete migration guide is available in `MIGRATION_DOCUMENTATION.md` containing:
- Complete file structure (all folders explained)
- All environment variables with usage locations
- Full dependency list (100+ packages)
- All API endpoints with request/response formats
- Complete database schema (25 tables)
- Supabase Edge Functions documentation
- Local setup instructions
- Step-by-step migration roadmap
- Persona configurations (4 types)
- Business logic (limits, timeouts, understanding level)

## Additional Documentation

| Document | Description |
|----------|-------------|
| `docs/LOCAL_SETUP_GUIDE.md` | Complete local setup with troubleshooting |
| `docs/VERCEL_DEPLOYMENT_GUIDE.md` | Deploy to Vercel (production) |
| `docs/FUTURE_DEVELOPMENT_GUIDE.md` | Add features with Cursor (independent) |
| `docs/PHASE3_FRONTEND_MIGRATION.md` | Frontend Edge Function migration |
| `docs/PHASE2_MIGRATION_SUMMARY.md` | Backend Edge Function migration |
| `docs/MIGRATION_CHAT_ENDPOINT.md` | Chat API endpoint details |
| `docs/MIGRATION_USER_SUMMARY_ENDPOINTS.md` | Summary API endpoint details |

## Overview

Riya is an AI-powered relationship companion chatbot for men aged 24-28, offering guidance and companionship through conversational AI. It features a warm, intimate chat interface inspired by messaging and dating apps, with Hinglish (Hindi-English mix) support. The application is a full-stack web application with a React frontend and Express backend, utilizing OpenAI's GPT models and Sarvam AI for voice capabilities, providing streaming responses. Its business vision is to provide personalized relationship support, leveraging AI to create engaging and empathetic interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

-   **Frameworks:** React with TypeScript, Vite, Wouter for routing.
-   **UI/UX:** Mobile-first responsive design, Radix UI primitives, shadcn/ui (new-york style), Tailwind CSS for styling, custom warm color palette, Nunito Sans and Poppins fonts, rounded UI elements.
-   **State Management:** TanStack Query for server state, local component state for UI.
-   **Real-time:** Event-source for message streaming.

### Backend

-   **Framework:** Express.js with TypeScript (ES modules).
-   **API:** RESTful endpoints, Server-Sent Events (SSE) for real-time chat, JSON format with Zod validation.
-   **Data Storage:** Supabase PostgreSQL for users, messages, sessions, and usage statistics.
-   **AI Integration:** Groq API for Hinglish AI responses, Sarvam AI for real-time Speech-to-Text, Text-to-Speech, and conversational AI during voice calls.
-   **Key Decisions:** Separation of storage interface, environment-based configuration, middleware for logging and error handling.

### Features

-   **Authentication:** Secure email-based OTP authentication with session management and security features (e.g., session regeneration, httpOnly cookies, OTP rate limiting).
-   **Voice Calling:** Real-time voice conversations with Riya using Vapi AI's WebRTC, including a custom UI, call state management, and free user limits with paywall integration.
-   **Summary Page:** Dynamic relationship insights page displaying AI-generated understanding levels, partner vibes, traits, growth areas, and communication styles, auto-generated from chat history.
-   **Usage Limits:** Free users have message and call duration limits; Premium users have unlimited access.
-   **Payment Gateway:** Cashfree integration for premium subscriptions with server-side verification.
-   **Conversational Memory:** AI receives context from all previous sessions for memory continuity, with dynamic session and message context building.
-   **Chat Optimistic Updates:** Instant display of user messages, "Riya is typing" indicator, smart auto-scroll, and failed message recovery.

### Design System

-   **Color Palette:** HSL-based semantic tokens with light/dark mode support.
-   **Typography:** Nunito Sans and Poppins fonts.
-   **Border Radius:** 0.5rem default.
-   **Shadow System:** 8-level shadow scale.
-   **Interaction Effects:** `hover-elevate` and `active-elevate-2` utilities.

## External Dependencies

-   **AI Services:**
    -   OpenAI API (via Replit AI Integrations): GPT-5 for core conversational AI.
    -   Groq API: For fast Hinglish AI responses (llama-3.3-70b-versatile model).
    -   Sarvam AI: Speech-to-Text (Saarika v2.5), Text-to-Speech (Bulbul v2, Meera voice), and Chat APIs (sarvam-2b) for voice features.
-   **Database:** Supabase PostgreSQL.
-   **UI Libraries:** Radix UI, Tailwind CSS, Lucide React, shadcn/ui.
-   **Payment Gateway:** Cashfree Payment Gateway v3.
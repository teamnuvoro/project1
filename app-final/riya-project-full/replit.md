# Riya AI Companion Chatbot

## Overview

Riya is an AI-powered relationship companion chatbot for men aged 24-28, offering guidance and companionship through conversational AI. It features a warm, intimate chat interface inspired by messaging and dating apps, with Hinglish (Hindi-English mix) support. The application is a full-stack web application with a React frontend and Express backend, utilizing OpenAI's GPT models and Sarvam AI for voice capabilities, providing streaming responses. Its business vision is to provide personalized relationship support, leveraging AI to create engaging and empathetic interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

-   **Frameworks:** React with TypeScript, Vite, Wouter for routing.
-   **UI/UX:** Mobile-first responsive design, Radix UI primitives, shadcn/ui (new-york style), Tailwind CSS for styling, custom warm color palette (lavender, pastel pink, coral, teal), Nunito Sans and Poppins fonts, rounded UI elements.
-   **UI Components:** 52 fully integrated shadcn/ui components including:
    - Layout: sidebar, card, accordion, tabs, collapsible, resizable
    - Forms: button, input, textarea, checkbox, radio-group, switch, toggle, label, input-otp
    - Data Display: table, pagination, breadcrumb, progress, separator, badge
    - Overlay: dialog, popover, hover-card, tooltip, scroll-area
    - Advanced: chart, carousel, navigation-menu, context-menu, dropdown-menu, command
-   **Hooks:** useIsMobile for responsive breakpoint detection (768px)
-   **Utilities:** cn() function for class name merging with clsx and tailwind-merge
-   **State Management:** TanStack Query for server state, local component state for UI.
-   **Real-time:** Event-source for message streaming.

### Backend

-   **Framework:** Express.js with TypeScript (ES modules).
-   **API:** RESTful endpoints, Server-Sent Events (SSE) for real-time chat, JSON format with Zod validation.
-   **Data Storage:** Supabase PostgreSQL for all environments (users, messages, sessions, usage_stats tables).
-   **Chat API:** `/api/chat` with streaming responses (SSE), Supabase for persistence, Groq API for Hinglish AI.
-   **Supabase Edge Functions:** Optional deployment for database-level logic (see `supabase/functions/`).
-   **AI Integration:**
    -   Groq API: For fast Hinglish AI responses (llama-3.3-70b-versatile model).
    -   Sarvam AI for voice features:
        -   Speech-to-Text (STT) (Saarika v2.5 model) via WebSocket for real-time transcription, supporting Hindi, English, and Hinglish.
        -   Text-to-Speech (TTS) (Bulbul v2 model, Meera voice) via WebSocket for real-time synthesis.
        -   Sarvam Chat API (sarvam-2b model) for real-time conversation loop during voice calls.
-   **Key Decisions:** Separation of storage interface, environment-based configuration, middleware for logging and error handling.

### Features

-   **Authentication:** Secure email-based OTP authentication system with:
    -   User registration with name, email, gender, and phone number (optional)
    -   Email-based OTP login (6-digit code, 24-hour validity)
    -   Session-based authentication using express-session
    -   Protected routes requiring authentication
    -   Gmail integration for sending OTP emails
    -   Security features:
        -   Session regeneration on login (prevents session fixation)
        -   httpOnly, sameSite cookies (prevents CSRF)
        -   OTP rate limiting (5 attempts, 15-minute lockout)
        -   Session ownership validation on all routes
        -   Automatic 401 redirect to login on frontend
-   **Voice Calling:** Real-time voice conversations with Riya using Sarvam AI's STT, Chat, and TTS APIs. Includes call session management, automatic conversation summarization, and secure WebSocket proxying.
-   **Summary Tracker:** Displays relationship insights (ideal partner traits, growth areas, communication style, love language) derived from voice call analysis, accessible via a dedicated page.
-   **Usage Limits:** Free users have limits (500 messages, 1200 seconds call duration); Premium users have unlimited access.
-   **Payment Gateway:** Cashfree integration for premium subscriptions (Daily Pass, Weekly Pass) with server-side payment verification, subscription activation, and secure API key management.

## External Dependencies

-   **AI Services:**
    -   OpenAI API (via Replit AI Integrations): GPT-5 for core conversational AI.
    -   Groq API: For fast Hinglish AI responses.
    -   Sarvam AI: Speech-to-Text, Text-to-Speech, and Chat APIs for voice features.
-   **Database:**
    -   **Primary:** Supabase PostgreSQL (Project: xgraxcgavqeyqfwimbwt)
    -   Server-side client: `server/supabase.ts`
    -   Frontend client: `client/src/lib/supabase.ts`
    -   API routes: `server/routes/supabase-api.ts`
    -   **Schema files:** 
        -   `supabase-schema.sql` - Full schema for new projects
        -   `supabase-add-missing-columns.sql` - ALTER TABLE for existing tables
-   **UI Libraries:**
    -   Radix UI: Accessible React components.
    -   Tailwind CSS: Utility-first styling.
    -   Lucide React: Icons.
    -   shadcn/ui: Pre-built UI components.
-   **Development Tools:** TypeScript, Vite, React Hook Form, Zod, date-fns.
-   **Payment Gateway:** Cashfree Payment Gateway v3.

## Design System

- **Color Palette:** HSL-based semantic tokens with automatic light/dark mode support
- **Typography:** Nunito Sans and Poppins fonts with 16px base size
- **Border Radius:** 0.5rem default with 8px standard rounding
- **Shadow System:** 8-level shadow scale for elevation
- **Interaction Effects:** hover-elevate and active-elevate-2 utilities for smooth interactions
- **See design_guidelines.md for complete design system documentation**

## Deployment & Platform Compatibility

### Lovable Platform
The application is fully compatible with Lovable AI platform:
- **Export/Import**: Can be exported from Lovable or imported via GitHub
- **Build**: Uses standard Vite build process (npm run build)
- **Publishing**: Direct "Publish" button in Lovable dashboard
- **Environment**: Lovable manages environment variables securely
- **Live URL**: Shareable at yourproject.lovable.app

**Steps to Deploy on Lovable:**
1. Export project from Lovable dashboard
2. Or import GitHub repository directly
3. Configure environment variables in Lovable Settings
4. Click "Publish" to deploy
5. Get instant shareable URL

### Vercel Deployment
- **Configuration**: vercel.json file included
- **Build**: Automatic detection of Vite + Node.js setup
- **Deploy**: Push to GitHub → Auto-deploy on Vercel
- **Features**: Edge caching, automatic SSL, serverless functions
- **Environment**: Set variables in Vercel dashboard

### Netlify Deployment
- **Configuration**: netlify.toml file included
- **Build**: Automatic detection of Vite + Node.js
- **Deploy**: Connect GitHub repo → Auto-build & deploy
- **Features**: Built-in functions, form handling, identity
- **Environment**: Set variables in Netlify Site Settings

### Replit Native Deployment
- **Database**: Built-in PostgreSQL (Neon-backed)
- **Server**: Native Express.js support
- **Deployment**: Automatic on code push
- **Live URL**: Automatic replit.dev subdomain

## Deployment Configuration Files

- **vercel.json** - Vercel deployment configuration
- **netlify.toml** - Netlify deployment configuration
- **.env.example** - Environment variables template
- **README.md** - Complete deployment & usage guide

All configuration files are production-ready and can be used immediately.

## Recent Changes (November 2025)

### Chat Optimistic Updates (Latest)
- **Instant Message Display:** User messages appear INSTANTLY when sent (no page refresh needed)
- **Typing Indicator:** "Riya is typing..." with animated bouncing dots shows while AI responds
- **Smart Auto-Scroll:** Chat auto-scrolls to bottom only when user is near bottom
- **Failed Message Recovery:** If sending fails, message is restored to input field for retry
- **Real-time Refresh:** Messages query refetches every 1.5 seconds for real-time updates
- **Deduplication:** Optimistic messages are automatically replaced when server confirms

### UI Redesign
- **Figma Design Integration:** Implemented pink-purple gradient theme across all major pages
- **AnalyticsPage:** New relationship strength cards showing Communication Style (85%), Emotional Intelligence (78%), Relationship Goals (92%) with animated progress bars
- **OnboardingPage:** Persona selection carousel with Riya, Maya, Priya options, image cards with gradient overlays
- **LoginPage:** Updated with heart icon, gradient welcome background, modern form styling
- **Design System:** Added gradient-header, gradient-welcome, gradient-primary-button, persona-card, analysis-card utility classes

### Previous Updates
- **Chat System Fixes:** Fixed duplicate route registration conflicts and message field mapping from Supabase snake_case to frontend camelCase
- **UI Styling:** Updated ChatMessage component with semantic color tokens for proper text visibility on all backgrounds
- **Supabase Integration:** Complete migration from Replit PostgreSQL to Supabase with all CRUD operations verified working
- **End-to-End Chat:** Full streaming response flow with Groq API delivering Hinglish responses

## Environment Setup by Platform

| Platform | Database | Env Setup | Live URL |
|----------|----------|-----------|----------|
| Replit | Built-in Postgres | Automatic | yourrepl.replit.dev |
| Vercel | External DB | Dashboard | yourdomain.vercel.app |
| Netlify | External DB | Dashboard | yourdomain.netlify.app |
| Lovable | Managed | Dashboard | project.lovable.app |

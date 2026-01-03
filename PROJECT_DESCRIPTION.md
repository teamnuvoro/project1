# Riya AI Companion - Project Description

## Overview
**Riya** is a sophisticated AI-powered relationship companion platform designed for Indian users, featuring natural Hinglish (Hindi-English) conversations, real-time voice interactions, and personalized relationship insights. Built with modern full-stack technologies, this application demonstrates advanced AI integration, real-time communication systems, and a comprehensive user experience.

## Key Features & Technical Highlights

### 🤖 **Advanced AI Integration**
- **Multi-LLM Architecture**: Integrated Groq (Llama 3.3 70B) for fast conversations and OpenAI (GPT-4o) for complex reasoning
- **Persona System**: Four distinct AI personas (Sweet & Supportive, Playful & Flirty, Bold & Confident, Calm & Mature) with Big 5 personality traits
- **Evolving Personalities**: AI personas adapt and evolve based on user interactions, tracking relationship depth and memory evolution
- **Context-Aware Conversations**: Advanced memory system with vector search, emotional state tracking, and relationship depth scoring

### 🎤 **Real-Time Voice Calling**
- **Live Voice Interactions**: WebSocket-based real-time voice conversations using Sarvam AI (STT) and ElevenLabs (TTS)
- **Low-Latency Pipeline**: Optimized voice-to-text-to-LLM-to-voice loop for natural conversations
- **Call Analytics**: Automatic transcript generation and session summaries

### 💬 **Rich Chat Experience**
- **Streaming Responses**: Server-Sent Events (SSE) for real-time message streaming
- **Message History**: Persistent PostgreSQL storage with full conversation history
- **Smart Paywall**: Freemium model with 20 free messages and unlimited premium access
- **WhatsApp-like UI**: Mobile-first design with dark mode support

### 📊 **Analytics & Insights**
- **Relationship Insights**: AI-generated summaries analyzing communication style, love language, and relationship patterns
- **Usage Analytics**: Comprehensive tracking of messages, calls, and user engagement
- **Confidence Scoring**: Dynamic confidence intervals that increase with relationship depth

### 🎨 **Visual Customization**
- **Avatar Customization**: Multiple visual styles (Anime, Realistic, Artistic) and outfit options
- **Unlockable Content**: Gallery system that unlocks memories and visuals as relationships deepen
- **Persona-Specific UI**: Interface adapts to selected persona's personality

## Technical Stack

### **Frontend**
- React 18 with TypeScript
- Vite for fast development and optimized builds
- TailwindCSS with 52+ shadcn/ui components
- Framer Motion for smooth animations
- TanStack Query for intelligent data fetching
- Wouter for routing

### **Backend**
- Node.js with Express.js
- TypeScript throughout
- RESTful API architecture
- WebSocket support for real-time features
- Session management with secure cookies

### **Database & ORM**
- PostgreSQL (Supabase/Neon)
- Drizzle ORM for type-safe database operations
- Comprehensive schema with users, messages, subscriptions, payments, personas, and memories

### **AI & Voice Services**
- Groq API for LLM conversations
- OpenAI API for advanced reasoning
- Sarvam AI for speech-to-text (Hindi/English)
- ElevenLabs for text-to-speech

### **Payment Integration**
- Cashfree payment gateway
- Razorpay integration
- Subscription management system

### **Authentication & Security**
- Email-based OTP authentication
- Rate limiting (5 OTP attempts, 15-minute lockout)
- Secure session management
- CSRF protection
- Input validation with Zod schemas

### **DevOps & Deployment**
- Vercel/Netlify ready
- Environment-based configuration
- Database migrations with Drizzle Kit
- Production-optimized builds

## Project Complexity

This is a **production-ready, full-stack application** demonstrating:
- **Advanced AI Integration**: Multiple LLM providers, persona systems, memory management
- **Real-Time Systems**: WebSocket communication, streaming responses, live voice calls
- **Complex State Management**: User sessions, relationship tracking, persona evolution
- **Payment Processing**: Complete subscription and payment flow
- **Scalable Architecture**: Modular codebase, type-safe operations, optimized queries
- **Modern UX**: Responsive design, dark mode, smooth animations, mobile-first

## What This Demonstrates

✅ **Full-Stack Development**: Complete application from database to UI  
✅ **AI/ML Integration**: Advanced prompt engineering, multi-model architecture  
✅ **Real-Time Systems**: WebSocket, SSE, live audio processing  
✅ **Payment Systems**: Subscription management, payment gateway integration  
✅ **Modern React**: Hooks, context, state management, performance optimization  
✅ **TypeScript**: Type-safe development across frontend and backend  
✅ **Database Design**: Complex schemas, relationships, migrations  
✅ **DevOps**: Deployment configurations, environment management  
✅ **Security**: Authentication, authorization, input validation, rate limiting  
✅ **UX/UI Design**: Modern, responsive, accessible interfaces  

---

**Perfect for showcasing expertise in:** Full-stack development, AI integration, real-time systems, modern React, TypeScript, PostgreSQL, payment processing, and production-ready application architecture.


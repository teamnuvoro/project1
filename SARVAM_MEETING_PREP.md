# Sarvam Support Meeting - Complete Technical Overview

**Date**: January 9, 2025  
**Purpose**: Resolve 422 validation error in TTS WebSocket implementation  
**Status**: Implementation complete, blocked by server validation error

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Flow](#architecture--flow)
3. [File Structure & Responsibilities](#file-structure--responsibilities)
4. [Current Implementation](#current-implementation)
5. [The Problem](#the-problem)
6. [What We Need](#what-we-need)
7. [Technical Details](#technical-details)

---

## 1. Project Overview

### What We're Building

**Riya AI Companion** - A voice-first AI companion chatbot that uses Sarvam AI for:
- **Speech-to-Text (STT)**: Real-time transcription of user voice input
- **Text-to-Speech (TTS)**: Real-time voice synthesis for AI responses
- **Chat API**: Natural language conversation with persona-based responses

### Voice Call Flow

```
User speaks → STT WebSocket → Text transcript → Sarvam Chat API → AI response → TTS WebSocket → Audio playback
```

### Key Features

- Real-time bidirectional voice conversation
- Multiple persona support (Riya, Meera, etc.)
- Hindi language support (`hi-IN`)
- Low-latency streaming audio
- WebSocket-based for real-time communication

---

## 2. Architecture & Flow

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       │ WebSocket (via proxy)
       │
┌──────▼─────────────────────────────────┐
│   Node.js Backend Server                │
│   (Express + WebSocket Proxy)          │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │  WebSocket Proxy                 │ │
│  │  - Adds Api-Subscription-Key    │ │
│  │  - Forwards messages             │ │
│  └──────────┬───────────────────────┘ │
└─────────────┼──────────────────────────┘
              │
              │ WebSocket (with auth header)
              │
┌─────────────▼─────────────┐
│   Sarvam AI Services      │
│                           │
│  ┌─────────────────────┐  │
│  │ STT WebSocket      │  │
│  │ (Speech-to-Text)   │  │
│  └─────────────────────┘  │
│                           │
│  ┌─────────────────────┐  │
│  │ TTS WebSocket      │  │
│  │ (Text-to-Speech)   │  │
│  └─────────────────────┘  │
│                           │
│  ┌─────────────────────┐  │
│  │ Chat API (REST)    │  │
│  │ (Conversation)     │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

### Complete Voice Call Flow

1. **User Initiates Call**
   - Frontend: `RiyaVoiceCall.tsx` component mounts
   - Calls `/api/call/start` to create call session
   - Receives WebSocket proxy URLs for STT and TTS

2. **STT Connection (Speech-to-Text)**
   - Frontend connects to: `ws://localhost:3000/api/sarvam/ws/proxy?type=stt&language=hi-IN`
   - Backend proxy connects to: `wss://api.sarvam.ai/speech-to-text/ws?language-code=hi-IN&model=saarika:v2.5`
   - User speaks → Audio chunks sent → Sarvam returns transcripts
   - Final transcript triggers AI response generation

3. **AI Response Generation**
   - Backend calls Sarvam Chat API: `POST /v1/chat/completions`
   - Uses conversation history + user transcript
   - Returns AI response text

4. **TTS Connection (Text-to-Speech)** ⚠️ **CURRENTLY FAILING**
   - Frontend connects to: `ws://localhost:3000/api/sarvam/ws/proxy?type=tts&language=hi-IN&speaker=riya&model=bulbul:v2`
   - Backend proxy connects to: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true`
   - **Step 1**: Send config message → ❌ **422 ERROR HERE**
   - **Step 2**: Send text message → Never reached (connection closes after config error)
   - **Step 3**: Receive audio chunks → Never reached

5. **Audio Playback**
   - Frontend receives PCM audio chunks
   - Converts to WAV format
   - Plays via Web Audio API

---

## 3. File Structure & Responsibilities

### Frontend Files (React/TypeScript)

#### `client/src/components/voice/RiyaVoiceCall.tsx`
**Purpose**: Main voice call component  
**Responsibilities**:
- Manages voice call UI and state
- Connects to STT and TTS WebSocket proxies
- Handles audio recording (MediaRecorder)
- Handles audio playback (Web Audio API)
- Manages call lifecycle (start/end)
- Sends user transcripts to backend for AI response
- Receives AI responses and sends to TTS

**Key Functions**:
- `handleStartCall()`: Initiates call, connects WebSockets
- `connectSTTProxy()`: Connects to STT WebSocket via proxy
- `connectTTSProxy()`: Connects to TTS WebSocket via proxy
- `handleSTTMessage()`: Processes transcripts, triggers AI response
- `handleTTSMessage()`: Processes audio chunks, plays audio
- `playAudioWithWebAudio()`: Converts PCM to WAV and plays

**Current Status**: ✅ Working (STT works, TTS blocked by 422 error)

---

#### `client/src/pages/CallPage.tsx`
**Purpose**: Call page wrapper  
**Responsibilities**:
- Renders `RiyaVoiceCall` component
- Handles routing to call interface
- Manages call configuration

**Current Status**: ✅ Working

---

### Backend Files (Node.js/TypeScript)

#### `server/index.ts`
**Purpose**: Main server entry point  
**Responsibilities**:
- Express server setup
- WebSocket proxy for Sarvam (handles authentication)
- Routes HTTP requests to appropriate handlers

**Key Components**:
- `handleSarvamProxy()`: WebSocket proxy handler
  - Intercepts client WebSocket connections
  - Adds `Api-Subscription-Key` header (browsers can't do this)
  - Forwards messages bidirectionally
  - **TTS Config Message Handler**: Sends config message → ❌ **422 ERROR**

**Current Status**: ⚠️ **TTS config message fails with 422**

---

#### `server/services/sarvam.ts`
**Purpose**: Sarvam AI service integration  
**Responsibilities**:
- Generates Sarvam WebSocket URLs
- Calls Sarvam Chat API for AI responses
- Manages Sarvam API configuration

**Key Functions**:
- `getSarvamSTTWebSocketUrl()`: Returns STT WebSocket URL
- `getSarvamTTSWebSocketUrl()`: Returns TTS WebSocket URL
- `generateSarvamResponse()`: Calls Chat API for AI responses

**Current Status**: ✅ Working

---

#### `server/routes/call.ts`
**Purpose**: Call management API routes  
**Responsibilities**:
- `/api/call/start`: Creates call session, returns WebSocket URLs
- `/api/call/end`: Ends call, saves usage stats
- `/api/call/config`: Returns call configuration

**Current Status**: ✅ Working

---

#### `server/routes/chat.ts`
**Purpose**: Chat API routes  
**Responsibilities**:
- `/api/chat`: Text-based chat (uses OpenAI, not Sarvam)
- `/api/sarvam/chat`: Voice call chat (uses Sarvam Chat API)

**Current Status**: ✅ Working

---

### Configuration Files

#### `package.json`
**Dependencies**:
- `ws`: WebSocket library for Node.js
- `express`: HTTP server
- `@tanstack/react-query`: Frontend data fetching

#### `.env`
**Required Environment Variables**:
- `SARVAM_API_KEY`: Sarvam API subscription key
- `SUPABASE_URL`: Database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Database auth

---

## 4. Current Implementation

### TTS WebSocket Connection (The Problem Area)

#### Step 1: Connection Setup

**File**: `server/index.ts` (lines 176-213)

```typescript
function handleSarvamProxy(clientWs: any, request: any) {
  const url = new URL(request.url || '/', 'http://localhost');
  const type = url.searchParams.get('type'); // 'tts'
  const language = url.searchParams.get('language') || 'hi-IN';
  const speaker = url.searchParams.get('speaker') || 'riya';
  const model = url.searchParams.get('model') || 'bulbul:v2';
  
  const apiKey = process.env.SARVAM_API_KEY;
  
  // Build Sarvam WebSocket URL
  const targetUrl = getSarvamTTSWebSocketUrl(language, speaker, model);
  // Result: wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true
  
  // Add API key to URL and headers
  const urlObj = new URL(targetUrl);
  urlObj.searchParams.set('Api-Subscription-Key', apiKey);
  const finalUrl = urlObj.toString();
  
  const headers = { 'Api-Subscription-Key': apiKey };
  const sarvamWs = new WS(finalUrl, { headers });
  
  // Connection opens successfully ✅
  sarvamWs.on('open', () => {
    console.log(`[Sarvam Proxy] tts connected to Sarvam successfully`);
    // Config message sent here (see Step 2)
  });
}
```

**Status**: ✅ Connection works

---

#### Step 2: Config Message (THE PROBLEM)

**File**: `server/index.ts` (lines 219-266)

```typescript
const sendTTSConfig = () => {
  if (ttsConfigSent || type !== 'tts') return;
  ttsConfigSent = true;
  
  if (sarvamWs.readyState === WS.OPEN) {
    // Format exactly as per official documentation
    const configMessage = {
      type: "config",
      data: {
        speaker: speaker,              // "riya"
        target_language_code: language, // "hi-IN"
      }
    };
    
    const configJson = JSON.stringify(configMessage);
    // Result: {"type":"config","data":{"speaker":"riya","target_language_code":"hi-IN"}}
    
    // Verify JSON is valid ✅
    JSON.parse(configJson); // Passes
    
    // Send message
    sarvamWs.send(configJson, { binary: false });
    console.log(`[Sarvam Proxy] ✅ Config message sent`);
  }
};

// Called 500ms after connection opens
sarvamWs.on('open', () => {
  setTimeout(() => {
    sendTTSConfig(); // ❌ 422 ERROR HERE
  }, 500);
});
```

**What We're Sending**:
```json
{
  "type": "config",
  "data": {
    "speaker": "riya",
    "target_language_code": "hi-IN"
  }
}
```

**Status**: ❌ **422 Validation Error**

---

#### Step 3: Error Response

**File**: `server/index.ts` (lines 318-329)

```typescript
sarvamWs.on('message', (data: Buffer) => {
  if (data.length < 200) {
    // Small messages are JSON errors
    const parsed = JSON.parse(data.toString('utf8'));
    if (parsed.type === 'error') {
      console.log(`🚨 [Sarvam Proxy] Received JSON message (NOT audio):`, parsed);
      // Error received:
      // {
      //   "type": "error",
      //   "data": {
      //     "request_id": "20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae",
      //     "message": "Input parameters has to be a valid dictionary",
      //     "code": 422
      //   }
      // }
    }
  }
});

sarvamWs.on('close', (code: number, reason: Buffer) => {
  console.log(`[Sarvam Proxy] Sarvam tts closed: code=${code}, reason=${reason.toString()}`);
  // Output: code=1000, reason=none (normal closure after error)
});
```

**Status**: ❌ Error received, connection closes

---

#### Step 4: Text Message (Never Reached)

**File**: `server/index.ts` (lines 268-293)

```typescript
const sendTTSText = (text: string) => {
  if (sarvamWs.readyState === WS.OPEN) {
    const textMessage = {
      type: "text",
      data: {
        text: text
      }
    };
    
    sarvamWs.send(JSON.stringify(textMessage));
    console.log(`[Sarvam Proxy] ✅ Text message sent`);
  }
};

// Scheduled but never reached (connection already closed)
setTimeout(() => {
  sendTTSText('Hello! I am Riya. How are you today?');
}, 1000);
```

**Status**: ⏸️ Never executed (connection closes after config error)

---

### STT WebSocket Connection (Working)

**File**: `server/index.ts` (same proxy handler, different type)

**Flow**:
1. Client connects: `ws://localhost:3000/api/sarvam/ws/proxy?type=stt&language=hi-IN`
2. Backend connects to: `wss://api.sarvam.ai/speech-to-text/ws?language-code=hi-IN&model=saarika%3Av2.5`
3. Audio chunks forwarded → Transcripts received ✅
4. Final transcripts trigger AI response ✅

**Status**: ✅ **Working perfectly**

---

### Chat API Integration (Working)

**File**: `server/routes/chat.ts` (line ~900+)

**Flow**:
1. STT receives final transcript
2. Frontend calls: `POST /api/sarvam/chat`
3. Backend calls: `POST https://api.sarvam.ai/v1/chat/completions`
4. Returns AI response text ✅

**Status**: ✅ **Working perfectly**

---

## 5. The Problem

### Error Details

**Error Code**: `422`  
**Error Message**: `"Input parameters has to be a valid dictionary"`  
**Request ID**: `20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae`  
**Occurrence**: 100% reproducible, happens immediately after sending config message

### What We've Tried

1. ✅ **Official Documentation Format**: Exact format from docs → Still fails
2. ✅ **Minimal Fields**: Only required fields (`speaker`, `target_language_code`) → Still fails
3. ✅ **Different Speakers**: Tried `meera`, `anushka`, `riya` → All fail
4. ✅ **With/Without Optional Fields**: Tried with `pitch`, `pace`, etc. → All fail
5. ✅ **Flat Format**: Tried without `data` wrapper → Still fails
6. ✅ **Timing Variations**: Tried 0ms, 100ms, 500ms delays → All fail
7. ✅ **JSON Verification**: Verified valid JSON structure → Passes
8. ✅ **Encoding**: Verified UTF-8 text frame → Correct

### Comparison with Documentation

**Official Documentation Example**:
```json
{
  "type": "config",
  "data": {
    "speaker": "anushka",
    "target_language_code": "en-IN",
    "pitch": 0.8,
    "pace": 2
  }
}
```

**Our Implementation**:
```json
{
  "type": "config",
  "data": {
    "speaker": "riya",
    "target_language_code": "hi-IN"
  }
}
```

**Conclusion**: Format matches exactly, only values differ (which should be valid).

---

## 6. What We Need

### Immediate Questions

1. **Is our message format correct?**
   - We're using the exact format from your documentation
   - Why is validation rejecting it?

2. **Is "riya" a valid speaker for `bulbul:v2`?**
   - What are the valid speaker names for `hi-IN` language?
   - Should we use a different speaker?

3. **What does "Input parameters has to be a valid dictionary" mean?**
   - Which validation is failing?
   - What structure does the server expect?

4. **Are there undocumented requirements?**
   - Timing requirements?
   - Additional headers or query parameters?
   - Field order requirements?
   - Model-specific requirements?

5. **Can you check your server logs?**
   - Request ID: `20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae`
   - What exactly is the validation checking for?

6. **Can you provide a working example?**
   - Complete working Node.js code using `ws` library
   - Exact JSON payload that works
   - Test with our API key to verify it's not key-specific

### What We're Hoping For

- **Quick Resolution**: Identify the exact issue and fix
- **Working Example**: Code snippet that works so we can compare
- **Documentation Update**: If format has changed, update docs
- **Alternative Approach**: If WebSocket format is wrong, what's the correct way?

---

## 7. Technical Details

### Environment

- **Node.js**: v20.19.5
- **WebSocket Library**: `ws` (latest)
- **Language**: TypeScript
- **Framework**: Express.js

### Connection Details

- **TTS WebSocket URL**: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true`
- **Authentication**: `Api-Subscription-Key` header (working ✅)
- **Model**: `bulbul:v2`
- **Language**: `hi-IN` (Hindi)
- **Speaker**: `riya` (also tried `meera`, `anushka`)

### Message Format

**Config Message**:
```json
{
  "type": "config",
  "data": {
    "speaker": "riya",
    "target_language_code": "hi-IN"
  }
}
```

**Text Message** (ready to send, but never reached):
```json
{
  "type": "text",
  "data": {
    "text": "Hello! I am Riya. How are you today?"
  }
}
```

### Verification

- ✅ Valid JSON structure
- ✅ Correct WebSocket connection
- ✅ Authentication working
- ✅ Connection opens successfully
- ✅ Message sent as UTF-8 text frame
- ✅ Single JSON.stringify() (no double encoding)
- ❌ Server validation rejects config message

---

## 8. File Locations Summary

### Critical Files for TTS Issue

1. **`server/index.ts`** (lines 176-450)
   - WebSocket proxy handler
   - Config message sending (line 219-266) ← **PROBLEM AREA**
   - Error handling (line 318-329)

2. **`server/services/sarvam.ts`** (line 74-81)
   - TTS WebSocket URL generation

3. **`client/src/components/voice/RiyaVoiceCall.tsx`** (line 833)
   - TTS proxy connection URL

### Supporting Files

- **`server/routes/call.ts`**: Call session management
- **`server/routes/chat.ts`**: AI response generation (working ✅)
- **`client/src/pages/CallPage.tsx`**: Call page wrapper

---

## 9. Next Steps After Meeting

### If Issue Resolved

1. Update code with correct format
2. Test end-to-end voice call flow
3. Verify audio playback works
4. Deploy to production

### If Issue Not Resolved

1. Request working code example
2. Request server log analysis
3. Consider alternative approach (REST API fallback?)
4. Escalate to engineering team

---

## 10. Quick Reference

### Request ID for Investigation
```
20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae
```

### Exact Payload Sent
```json
{"type":"config","data":{"speaker":"riya","target_language_code":"hi-IN"}}
```

### Error Received
```json
{
  "type": "error",
  "data": {
    "request_id": "20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae",
    "message": "Input parameters has to be a valid dictionary",
    "code": 422
  }
}
```

### Documentation Reference
https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api

---

**End of Meeting Preparation Document**


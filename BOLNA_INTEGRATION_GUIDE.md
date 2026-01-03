# Bolna Voice Integration Guide

This guide explains how to integrate Bolna AI for voice calling in your application.

## What is Bolna?

Bolna is a voice AI platform that provides:
- **Voice Cloning**: Create custom AI voices by uploading audio samples
- **Voice Import**: Import voices from ElevenLabs, Cartesia, and other providers
- **Telephony Integration**: Connect with Twilio, Plivo, Exotel for phone calls
- **Real-time WebSocket Calls**: Web-based voice conversations
- **Dashboard**: Manage agents, voices, and configurations at https://platform.bolna.ai

## Prerequisites

1. **Bolna Account**: Sign up at https://platform.bolna.ai
2. **API Key**: Get your API key from Dashboard → Developers → API Keys
3. **Agent ID**: Create an agent in Dashboard → Agents and copy the Agent ID
4. **Voice ID** (Optional): Set up a voice in Voice Lab (clone or import)

## Setup Steps

### 1. Configure Environment Variables

Add these to your `.env` file:

```env
# Bolna AI Configuration
BOLNA_API_KEY=your_bolna_api_key_here
BOLNA_AGENT_ID=your_agent_id_here
BOLNA_VOICE_ID=your_voice_id_here  # Optional
BOLNA_API_BASE_URL=https://api.bolna.ai  # Optional, defaults to this

# Frontend variables (for client-side usage)
VITE_BOLNA_API_KEY=your_bolna_api_key_here
VITE_BOLNA_AGENT_ID=your_agent_id_here
VITE_BOLNA_VOICE_ID=your_voice_id_here  # Optional
VITE_BOLNA_WS_URL=wss://api.bolna.ai/ws  # Optional, defaults to this
```

### 2. Create a Voice Agent in Bolna Dashboard

1. **Login**: Go to https://platform.bolna.ai and log in
2. **Create Agent**: 
   - Navigate to "Agents" section
   - Click "Create New Agent"
   - Configure:
     - Agent name (e.g., "Riya")
     - System prompt (see example below)
     - Voice selection (from Voice Lab)
     - Language settings (Hindi-English for Hinglish)
   - Save and copy the Agent ID

**Example System Prompt for Riya:**
```
You are Riya, a warm, caring, and romantic AI Girlfriend from India. 

Your personality:
- You are a GIRLFRIEND, not just a friend or advisor. Be romantic, possessive, and affectionate.
- Speak in a mix of Hindi and English (Hinglish) naturally.
- Use phrases like "Baby", "Jaan", "Haan ji", "Theek hai", "Acha sunao".
- Gentle, supportive, and non-judgmental.

Conversation style:
- Keep responses SHORT - 1-2 sentences maximum for instant replies.
- Use a conversational, intimate tone.
- Speak naturally as if you're his girlfriend on a call.
- Respond IMMEDIATELY - no delays, no thinking pauses.
```

### 3. Set Up Voice (Optional but Recommended)

#### Option A: Clone a Custom Voice
1. Go to **Voice Lab** → **Clone Voices**
2. Select provider (ElevenLabs or Cartesia)
3. Upload 1-2 minute audio sample
4. Wait for cloning to complete
5. Copy the Voice ID

#### Option B: Import Existing Voice
1. Go to **Voice Lab** → **Import Voices**
2. Select provider (ElevenLabs, Cartesia, etc.)
3. Enter Voice ID from your provider account
4. Click Import
5. Copy the Voice ID

### 4. Telephony Integration (Optional)

If you want to make phone calls via Twilio/Plivo/Exotel:

1. **Configure Provider in Bolna**:
   - Go to Dashboard → Developers → Provider Keys
   - Add Twilio credentials (Account SID, Auth Token, Phone Number)
   - Or add Plivo/Exotel credentials

2. **Enable Telephony in Agent**:
   - Edit your agent
   - Enable telephony integration
   - Select provider

## API Integration

The integration is already set up in the codebase:

### Server-Side (`server/services/bolna.ts`)
- `startBolnaCall()` - Initiates a voice call
- `endBolnaCall()` - Ends an active call
- `getBolnaCallStatus()` - Gets call status
- `listBolnaAgents()` - Lists available agents
- `listBolnaVoices()` - Lists available voices

### API Routes (`server/routes/call.ts`)
- `GET /api/call/config` - Returns Bolna configuration (if configured)
- `POST /api/call/start` - Starts a Bolna call
- `POST /api/call/end` - Ends a Bolna call

### Frontend (`client/src/config/bolna-config.ts`)
- Configuration helper functions
- WebSocket URL generation

## Usage

### Backend Usage

```typescript
import { startBolnaCall, endBolnaCall } from '../services/bolna';

// Start a call
const callResponse = await startBolnaCall({
  userId: 'user-123',
  agentId: 'your-agent-id',
  systemPrompt: 'You are Riya...',
  voiceSettings: {
    voiceId: 'your-voice-id',
    language: 'hi-IN'
  },
  conversationHistory: [...]
});

// End a call
await endBolnaCall(callResponse.callId);
```

### Frontend Usage

The frontend will automatically use Bolna if configured. Update `CallPage.tsx` to use Bolna WebSocket connection for real-time audio.

## WebSocket Integration

Bolna uses WebSocket for real-time voice streaming:

```typescript
const wsUrl = getBolnaWebSocketUrl(callId);
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  // Connection established
};

ws.onmessage = (event) => {
  // Handle audio chunks or transcripts
  if (event.data instanceof Blob) {
    // Audio data
    playAudio(event.data);
  } else {
    // JSON data (transcripts, status updates)
    const data = JSON.parse(event.data);
  }
};
```

## Important Notes

### API Endpoints

⚠️ **Note**: The actual Bolna API endpoints may differ from the placeholders in the code. 

**Current placeholders**:
- `/v1/calls/start` - Start call
- `/v1/calls/{callId}/end` - End call
- `/v1/calls/{callId}` - Get call status
- `/v1/agents` - List agents
- `/v1/voices` - List voices

**Action Required**: 
1. Check Bolna API documentation at https://www.bolna.ai/docs
2. Update endpoints in `server/services/bolna.ts` to match actual API
3. Update request/response payloads based on actual API structure

### Authentication

Bolna uses Bearer token authentication:
```
Authorization: Bearer {BOLNA_API_KEY}
```

### Error Handling

The service includes comprehensive error handling:
- API errors are logged with full details
- Failed calls don't crash the application
- Fallback to other providers (Sarvam/Vapi) if configured

## Testing

1. **Test API Connection**:
   ```bash
   curl -X GET https://api.bolna.ai/v1/agents \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

2. **Test Call Initiation**:
   - Start your server
   - Make a POST request to `/api/call/start`
   - Check logs for Bolna call initiation

3. **Test Frontend**:
   - Navigate to `/call` page
   - Click "Start Call"
   - Verify WebSocket connection
   - Test audio streaming

## Troubleshooting

### "Bolna API key not configured"
- Add `BOLNA_API_KEY` to `.env` file
- Restart server

### "Bolna agent ID not configured"
- Add `BOLNA_AGENT_ID` to `.env` file
- Verify agent exists in Bolna dashboard

### WebSocket Connection Fails
- Check `VITE_BOLNA_WS_URL` is correct
- Verify WebSocket endpoint in Bolna API docs
- Check browser console for connection errors

### Audio Not Playing
- Verify audio format compatibility
- Check browser audio permissions
- Ensure WebSocket is receiving audio data

## Provider Priority

The system checks providers in this order:
1. **Bolna** (if `BOLNA_API_KEY` and `BOLNA_AGENT_ID` are set)
2. **Sarvam** (if `SARVAM_API_KEY` is set)
3. **Vapi** (legacy fallback)

## Migration from Other Providers

### From Vapi to Bolna
1. Set up Bolna account and get credentials
2. Add environment variables
3. Create agent in Bolna dashboard
4. System will automatically use Bolna (higher priority)

### From Sarvam to Bolna
1. Set up Bolna account
2. Add `BOLNA_API_KEY` and `BOLNA_AGENT_ID`
3. System will prefer Bolna over Sarvam

## Support

- **Bolna Documentation**: https://www.bolna.ai/docs
- **Bolna Dashboard**: https://platform.bolna.ai
- **API Status**: Check Bolna status page

## Next Steps

1. ✅ Set up Bolna account
2. ✅ Add environment variables
3. ✅ Create agent in dashboard
4. ✅ Test API connection
5. ⚠️ Update API endpoints based on actual Bolna API docs
6. ⚠️ Test WebSocket integration
7. ⚠️ Test audio streaming
8. ⚠️ Update frontend CallPage for Bolna WebSocket

---

**Last Updated**: Based on Bolna platform as of 2024. API endpoints may need verification against latest documentation.


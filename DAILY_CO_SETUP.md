# Daily.co Integration Setup Guide

## Environment Variables Required

Add these to your `.env` file:

```env
# Daily.co Configuration
DAILY_API_KEY=your_daily_api_key_here
DAILY_ROOM_DOMAIN=your_domain.daily.co

# ElevenLabs TTS (for Riya's voice)
ELEVENLABS_API_KEY=d778b52595a077a02be618378ec087fffc980a1d57cc45b3cbeb4786869c8a1f
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB  # Riya's voice ID

# OpenAI (already configured)
OPENAI_API_KEY=your_openai_key
```

## Setup Steps

### 1. Get Daily.co API Key
1. Sign up at https://www.daily.co/
2. Go to Dashboard → Developers → API Keys
3. Create a new API key
4. Copy and add to `.env` as `DAILY_API_KEY`

### 2. Get ElevenLabs API Key
1. Sign up at https://elevenlabs.io/
2. Go to Profile → API Keys
3. Create a new API key
4. Copy and add to `.env` as `ELEVENLABS_API_KEY`

### 3. Configure Daily.co Webhook
1. Go to Daily.co Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/api/daily-riya-webhook`
3. Enable events:
   - `transcription-started`
   - `transcription-completed`
   - `transcription-ended`

### 4. Replace CallPage
Option 1: Replace existing CallPage.tsx with CallPageDaily.tsx
Option 2: Update CallPage.tsx to use RiyaVoiceCall component

## Testing

1. Start server: `npm run dev:all`
2. Navigate to `/call` page
3. Click "Call Riya Now"
4. Should see Daily.co iframe
5. Speak and verify Riya responds

## Success Criteria

✅ Latency <600ms (shown in UI)
✅ Riya voice sounds natural (ElevenLabs)
✅ Transcription works correctly
✅ GPT-4o-mini generates Riya responses
✅ Conversation history maintained

## Troubleshooting

- **WebSocket errors**: Check Daily.co API key
- **No transcription**: Verify webhook URL is correct
- **No audio**: Check ElevenLabs API key and voice ID
- **High latency**: Check network and API response times


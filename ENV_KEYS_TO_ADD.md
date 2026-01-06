# Environment Variables to Add

Add these to your `.env` file:

```env
# ElevenLabs TTS (for Riya's voice)
ELEVENLABS_API_KEY=d778b52595a077a02be618378ec087fffc980a1d57cc45b3cbeb4786869c8a1f
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB

# Daily.co Configuration (if using direct Daily.co)
DAILY_API_KEY=your_daily_api_key_here
DAILY_ROOM_DOMAIN=your_domain.daily.co

# Pipecat Cloud (alternative - you have this key)
PIPECAT_API_KEY=pk_f0552b7a-9a73-4c1b-babe-796702702432

# OpenAI (should already be configured)
OPENAI_API_KEY=your_openai_key
```

## Quick Setup

1. **ElevenLabs API Key**: ✅ Already provided above
2. **Daily.co API Key**: You'll need this if using direct Daily.co integration
   - OR use Pipecat Cloud (which includes Daily.co)

## Note on Pipecat Cloud

You have a **Pipecat Cloud API key**, which is a higher-level framework that uses Daily.co under the hood. 

**Options:**
- **Option 1**: Use our current implementation (direct Daily.co + OpenAI + ElevenLabs)
- **Option 2**: Switch to Pipecat Cloud SDK (simpler, but requires different implementation)

Our current code uses **Option 1** (direct Daily.co). If you want to use Pipecat Cloud instead, we'd need to refactor the implementation.



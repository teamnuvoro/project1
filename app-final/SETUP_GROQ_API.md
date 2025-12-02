# Setting Up Groq API Key for Chat

## Current Issue

The chat feature requires a Groq API key to work. You're currently seeing this error:
```
Invalid API Key - AuthenticationError: 401
```

## Quick Fix

### Step 1: Get a Free Groq API Key

1. Go to https://console.groq.com/
2. Sign up for a free account (if you don't have one)
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### Step 2: Add to .env File

Open your `.env` file and add:

```env
GROQ_API_KEY=gsk_your_actual_api_key_here
```

Replace `gsk_your_actual_api_key_here` with your actual Groq API key.

### Step 3: Restart Server

```bash
killall -9 node npm
npm run dev
```

## Why Groq?

Groq is used for:
- AI chat responses (Riya's conversations)
- Fast inference with their LLM models
- Free tier available for development

## Alternative: Use a Different AI Service

If you prefer to use OpenAI instead:

1. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-your-openai-key
   ```

2. The code can be modified to use OpenAI instead of Groq.

## Notes

- The free Groq tier is generous for development
- API key is stored locally in `.env` (never commit this file!)
- Chat will show a helpful error message if the key is missing


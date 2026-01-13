# Documentation Source for Sarvam TTS Implementation

## Original Source

We used a **third-party guide** (found in `attached_assets/Pasted-Yes-totally-doable-Here-s-a-step-by-step-way-to-wire-Sarvam-into-your-Replit-chatbot-so-calls-a-1760266345933_1760266345https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api#code-examples933.txt`) that referenced Sarvam's official documentation but provided **incorrect WebSocket message format**.

## Documentation Links Referenced

The guide referenced these official Sarvam documentation pages:

1. **Authentication**: https://docs.sarvam.ai/api-reference-docs/authentication
2. **Chat Completions**: https://docs.sarvam.ai/api-reference-docs/chat/completions
3. **Streaming STT API**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/speech-to-text/streaming-api
4. **Streaming TTS API**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api ⭐ (This is the one we needed)
5. **Chat Messages**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/chat-completion/how-to/list-your-chat-messages
6. **Chat Overview**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/chat-completion/overview
7. **TTS Overview**: https://docs.sarvam.ai/api-reference-docs/endpoints/text-to-speech
8. **Meta Prompt**: https://docs.sarvam.ai/api-reference-docs/metaprompt
9. **Changelog**: https://docs.sarvam.ai/api-reference-docs/changelog

## The Problem

The guide provided this **incorrect format** for TTS messages:

```json
{
  "action": "speak",
  "text": "..."
}
```

And suggested:
```json
{
  "action": "flush"
}
```

This format **does not work** and was never in the official documentation.

## What Sarvam Actually Told Us

After we contacted Sarvam support, they provided the **correct format**:

**Config Message:**
```json
{
  "type": "config",
  "data": {
    "target_language_code": "hi-IN",
    "speaker": "meera",
    "pitch": 0,
    "pace": 1.0,
    "loudness": 1.5,
    "speech_sample_rate": 24000,
    "enable_preprocessing": true,
    "model": "bulbul:v2"
  }
}
```

**Text Message:**
```json
{
  "type": "text",
  "data": {
    "text": "Hello! I am Riya. How are you today?"
  }
}
```

## Current Status

- ✅ We're now using the format Sarvam specified
- ❌ Still getting 422 validation errors
- 🔍 Likely a server-side validation bug or missing documentation detail

## Key Documentation Page We Should Check

**The most relevant one for our issue:**
- **Streaming TTS API**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api

This page should contain the exact WebSocket message format, but the guide we used didn't follow it correctly.

## Recommendation

We should:
1. Check the official Streaming TTS API documentation page directly
2. Verify if there are any code examples or tutorials
3. Contact Sarvam support with the documentation link and ask them to verify the format matches what's documented


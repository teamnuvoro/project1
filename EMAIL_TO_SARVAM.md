# Email to Send to Sarvam Support

**Subject**: URGENT - 422 Validation Error Despite Following Specification Exactly

---

Hi Sarvam Team,

We're experiencing a persistent 422 validation error when trying to use the TTS WebSocket API. We've followed your specification exactly, but the server keeps rejecting our messages.

## The Problem

**Error Message:**
```
{
  "type": "error",
  "data": {
    "request_id": "20260109_8bddb686-653c-41b7-8791-0ba506a21187",
    "message": "Input parameters has to be a valid dictionary",
    "code": 422
  }
}
```

**Connection Details:**
- WebSocket URL: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true`
- Authentication: `Api-Subscription-Key` header (working correctly)
- Connection: Establishes successfully ✅
- Error: Occurs immediately when sending config message ❌

## What We're Sending (Exactly As You Specified)

We're sending the config message in the exact format you provided:

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

## Verification We've Done

1. ✅ **Valid JSON**: We verify with `JSON.parse()` after `JSON.stringify()` - passes
2. ✅ **Correct Encoding**: Message sent as UTF-8 text frame
3. ✅ **No Double Encoding**: `JSON.stringify()` called exactly once
4. ✅ **Connection Works**: We receive structured error responses (proving communication works)
5. ✅ **Authentication Works**: We get validation errors, not auth errors

## What We've Tried

1. ✅ Exact format you specified: `{"type": "config", "data": {...}}`
2. ✅ Parameters at root level: `{"type": "config", "target_language_code": ..., ...}`
3. ✅ Minimal config: Just `target_language_code` and `speaker`
4. ✅ With and without `model` parameter (since it's in URL)
5. ✅ Verified JSON structure with parse/stringify cycle

**All variations produce the same 422 error.**

## Request IDs for Your Investigation

Please check these request IDs in your server logs:
- `20260109_8bddb686-653c-41b7-8791-0ba506a21187` (Latest - with JSON verification)
- `20260109_3ba30e6a-d369-4737-bb12-e7444074d5e0`
- `20260109_5c77ffb7-236c-408b-99d7-2f205608f52e`
- `20260109_df785fb4-9ea7-47db-9cc3-20ead3520cdc`

## Our Implementation (Node.js WebSocket)

```typescript
const configMessage = {
  type: "config",
  data: {
    target_language_code: "hi-IN",
    speaker: "meera",
    pitch: 0,
    pace: 1.0,
    loudness: 1.5,
    speech_sample_rate: 24000,
    enable_preprocessing: true,
    model: "bulbul:v2"
  }
};

const ws = new WebSocket(url, { headers: { 'Api-Subscription-Key': apiKey } });
ws.on('open', () => {
  ws.send(JSON.stringify(configMessage)); // Single stringify, sent as text frame
});
```

## Background: How We Got Here

**Important Context**: Our initial implementation was based on:
- A third-party guide that referenced Sarvam documentation links
- The guide suggested using `{"action": "speak", "text": "..."}` format (which doesn't work)
- We then contacted you, and you provided the correct format: `{"type": "config", "data": {...}}` and `{"type": "text", "data": {"text": "..."}}`

We're now using the **exact format you specified**, but still getting 422 errors. This suggests either:
1. There's a subtle difference in the format we're missing
2. There's a server-side validation bug
3. The format has changed or varies by model/endpoint

**Original Reference**: We started from Sarvam documentation links (Text-to-Speech Streaming API) but the WebSocket message format wasn't fully detailed in publicly available docs.

## Questions

1. **Is the format we're sending correct?** We're following your specification exactly.
2. **Are there any additional requirements?** Headers, query parameters, timing?
3. **Is there a working example** we can reference?
4. **Could there be a bug** in the server-side validation?
5. **Should we use a different endpoint** or API version?

## Urgency

This is blocking our production integration. We've spent significant time debugging and are confident our implementation is correct. The error suggests a server-side validation issue.

We'd appreciate urgent assistance to resolve this.

Thank you!

---

**Project**: Riya AI Companion  
**Integration**: TTS WebSocket API (bulbul:v2)  
**Date**: January 9, 2025


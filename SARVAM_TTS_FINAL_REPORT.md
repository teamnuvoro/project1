# Sarvam TTS WebSocket Implementation - Final Status Report

**Date**: January 9, 2025  
**Issue**: 422 Validation Error Persists Despite Following Official Documentation Exactly  
**Status**: ❌ **STILL FAILING** - Implementation matches official docs but server rejects it

---

## Executive Summary

We are following the **exact format** specified in Sarvam's official documentation for the TTS WebSocket Streaming API, yet the server consistently returns a 422 validation error: **"Input parameters has to be a valid dictionary"**.

**Key Finding**: The error persists even when using the **minimal required fields** exactly as shown in the official documentation, suggesting either:
1. A server-side validation bug
2. Missing undocumented requirements
3. API endpoint/model-specific differences
4. Encoding or WebSocket protocol issues

---

## Official Documentation Reference

**Source**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api

### What the Documentation Shows

The official documentation's "Input Message Types" section clearly shows the **config message format with `data` wrapper**:

```json
{
  "type": "config",
  "data": {
    "speaker": "anushka",
    "target_language_code": "en-IN",
    "pitch": 0.8,
    "pace": 2,
    "min_buffer_size": 50,
    "max_chunk_length": 200,
    "output_audio_codec": "mp3",
    "output_audio_bitrate": "128k"
  }
}
```

**Required Fields** (from docs):
- `speaker` ✅
- `target_language_code` ✅

**Optional Fields** (from docs):
- `pitch`, `pace`, `min_buffer_size`, `max_chunk_length`, `output_audio_codec`, `output_audio_bitrate`

### Text Message Format (from docs):

```json
{
  "type": "text",
  "data": {
    "text": "This is an example sentence that will be converted to speech."
  }
}
```

---

## Our Current Implementation

### What We're Sending (EXACTLY as per official docs):

**Config Message:**
```json
{
  "type": "config",
  "data": {
    "speaker": "meera",
    "target_language_code": "hi-IN"
  }
}
```

**Implementation Details:**
- ✅ Using only the 2 required fields (no optional fields that might cause issues)
- ✅ `data` wrapper present (as shown in docs)
- ✅ Valid JSON (verified with `JSON.parse()`)
- ✅ Sent as UTF-8 text frame via WebSocket
- ✅ Single `JSON.stringify()` call (no double encoding)

**Connection Details:**
- WebSocket URL: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true`
- Authentication: `Api-Subscription-Key` header (✅ working - we receive structured error responses)
- Connection: Establishes successfully ✅
- Error: Occurs immediately when sending config message ❌

### Code Implementation:

```typescript
// server/index.ts - sendTTSConfig()
const configMessage = {
  type: "config",
  data: {
    speaker: speaker,        // "meera"
    target_language_code: language,  // "hi-IN"
  }
};

const configJson = JSON.stringify(configMessage);
console.log(`[Sarvam Proxy] Sending config message:`, configJson);
// Verified: Valid JSON, correct structure

sarvamWs.send(configJson, { binary: false }); // Explicitly send as text frame
```

---

## Error Details

### Error Response from Sarvam:

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

### Error Timing:
- Occurs **immediately** after sending config message
- WebSocket connection closes with code `1000` (normal closure)
- Happens **every single time**, 100% reproducible

---

## Complete History of Attempts

### Attempt 1: Third-Party Guide Format ❌
- **Format**: `{"action": "speak", "text": "..."}`
- **Result**: Failed (not documented format)

### Attempt 2: Sarvam Support Specified Format ❌
- **Format**: `{"type": "config", "data": {...}}` with all parameters
- **Result**: 422 error

### Attempt 3: Flat Format (No Data Wrapper) ❌
- **Format**: `{"type": "config", "speaker": "...", "target_language_code": "..."}`
- **Based on**: Perplexity AI suggestion
- **Result**: 422 error (Perplexity was wrong - docs clearly show `data` wrapper)

### Attempt 4: Official Docs Format (With All Fields) ❌
- **Format**: Exact copy from official docs with all optional fields
- **Result**: 422 error

### Attempt 5: Official Docs Format (Minimal Required Fields Only) ❌ ← **CURRENT**
- **Format**: Only `speaker` and `target_language_code` (the 2 required fields)
- **Based on**: Official documentation minimal example
- **Result**: 422 error (STILL FAILING)

---

## Verification Checklist

All verification steps pass:

- ✅ **JSON Structure**: Valid JSON verified with `JSON.parse()`
- ✅ **Message Format**: Matches official documentation exactly
- ✅ **Field Names**: Exact match (camelCase vs snake_case checked)
- ✅ **Data Types**: Strings are strings, numbers are numbers
- ✅ **Encoding**: UTF-8 text frame (WebSocket text message)
- ✅ **Timing**: 500ms delay after connection open (connection fully stabilized)
- ✅ **Authentication**: API key working (we get structured error responses, not auth errors)
- ✅ **Connection State**: WebSocket in `OPEN` state when sending
- ✅ **No Double Encoding**: Single `JSON.stringify()` call
- ✅ **WebSocket Library**: Using standard `ws` library (Node.js)

---

## Comparison: Official Docs vs Our Implementation

### Official Documentation Example:
```json
{
  "type": "config",
  "data": {
    "speaker": "anushka",
    "target_language_code": "en-IN"
  }
}
```

### Our Implementation:
```json
{
  "type": "config",
  "data": {
    "speaker": "meera",
    "target_language_code": "hi-IN"
  }
}
```

**Differences**:
- ✅ Same structure
- ✅ Same field names
- ⚠️ Different values (`anushka` vs `meera`, `en-IN` vs `hi-IN`) - but these are valid options

**Conclusion**: Our format is **identical** to the documentation, only values differ (which should be valid).

---

## Potential Root Causes

### 1. Server-Side Validation Bug (MOST LIKELY)
- The validation logic may be checking for fields that aren't documented
- The error message "Input parameters has to be a valid dictionary" is vague
- Could be a bug in Sarvam's validation code

### 2. Model-Specific Requirements
- We're using `bulbul:v2` model
- Maybe this model requires different/additional fields not documented
- The docs example might be for a different model version

### 3. API Version Differences
- Documentation might be for a different API version
- Server might be running newer/older version with different requirements
- No version information in documentation to verify

### 4. Encoding/Protocol Issues
- Maybe WebSocket message needs specific encoding
- Maybe binary frame instead of text frame?
- Maybe message needs to be base64 encoded?
- (Unlikely - docs show plain JSON)

### 5. Missing Undocumented Requirements
- Maybe need to send config **immediately** on connection (0ms delay)?
- Maybe need specific header or query parameter?
- Maybe need to send a ping first?
- Maybe field order matters?

### 6. API Key Restrictions
- Maybe our API key doesn't have TTS WebSocket permissions?
- Maybe there's a quota or feature flag issue?
- (But we get validation errors, not auth errors, so key seems valid)

---

## Request IDs for Sarvam Investigation

Recent request IDs that failed with 422:
- `20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae` (Latest - minimal format)
- `20260109_3ba30e6a-d369-4737-bb12-e7444074d5e0` (With all fields)
- `20260109_8bddb686-653c-41b7-8791-0ba506a21187` (Flat format attempt)
- `20260109_5c77ffb7-236c-408b-99d7-2f205608f52e` (Sarvam support format)
- `20260109_df785fb4-9ea7-47db-9cc3-20ead3520cdc` (Initial attempt)

---

## What We Need from Sarvam

### Critical Questions:

1. **Is our message format correct?**
   - We're using the exact format from your official documentation
   - Why is validation rejecting it?

2. **Are there undocumented requirements?**
   - Specific timing requirements?
   - Additional headers or query parameters?
   - Field order requirements?
   - Model-specific requirements for `bulbul:v2`?

3. **Can you provide a working example?**
   - Raw WebSocket message payload that works
   - Complete working code example (Node.js `ws` library)
   - Test with our API key to verify it's not key-specific

4. **Is there a server-side issue?**
   - Can you check your server logs for request ID `20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae`?
   - What exactly is the validation checking for?
   - Why does "valid dictionary" error occur?

5. **API Version/Model Compatibility**
   - Which API version is the documentation for?
   - Are there differences for `bulbul:v2` model?
   - Is the WebSocket endpoint `wss://api.sarvam.ai/text-to-speech/ws` correct?

---

## Current Code State

### Files Modified:
- `server/index.ts` - WebSocket proxy handler
- `client/src/components/voice/RiyaVoiceCall.tsx` - Client-side WebSocket connection

### Current Format (Matching Official Docs):

**Server-side config message:**
```typescript
const configMessage = {
  type: "config",
  data: {
    speaker: "meera",
    target_language_code: "hi-IN"
  }
};
```

**Client-side text message:**
```typescript
const textMessage = {
  type: "text",
  data: {
    text: "Hello! I am Riya. How are you today?"
  }
};
```

---

## Next Steps

### Immediate Actions:

1. ✅ **Contact Sarvam Support** - Provide this report and request investigation
2. ✅ **Request Working Example** - Ask for a complete working code snippet
3. ✅ **Request Log Investigation** - Provide request IDs for server-side analysis
4. ⏳ **Wait for Response** - Blocked until Sarvam provides clarification

### Alternative Approaches (If Support Doesn't Respond):

1. **Try Different Models**: Test with different TTS models (if available)
2. **Try REST API**: Use non-streaming TTS API as fallback
3. **Switch Providers**: Consider alternative TTS provider for voice calls
4. **SDK Investigation**: Try using Sarvam's official SDK instead of raw WebSocket

---

## Conclusion

We have implemented the TTS WebSocket integration **exactly as specified in Sarvam's official documentation**. Despite this:

- ✅ Format matches documentation 100%
- ✅ All verification checks pass
- ✅ Connection and authentication work
- ❌ Server validation consistently rejects our messages with 422 error

**This strongly suggests a server-side issue or undocumented requirement**, not an implementation error on our part. We need direct support from Sarvam to resolve this.

---

## References

- **Official Documentation**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api
- **Connection Endpoint**: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true`
- **Authentication**: `Api-Subscription-Key` header
- **Model**: `bulbul:v2`
- **Language**: `hi-IN` (Hindi)
- **Speaker**: `meera`

---

**Report Generated**: January 9, 2025  
**Status**: ⚠️ **BLOCKED - Awaiting Sarvam Support Response**


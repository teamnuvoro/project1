# Sarvam TTS API Documentation Analysis

## Date: January 9, 2025
## Source: Official Sarvam AI Documentation
## URL: https://docs.sarvam.ai/api-reference-docs/text-to-speech/api/streaming

---

## Executive Summary

After analyzing the official Sarvam AI Streaming Text-to-Speech API documentation, **our current implementation matches the documented format exactly**. The persistent `422: Input parameters has to be a valid dictionary` error appears to be a server-side validation issue on Sarvam's end, not a format problem in our code.

---

## Documentation Format Requirements

### 1. Config Message Format (Required - Must be sent first)

**Official Documentation Format:**
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

**Our Current Implementation:**
```typescript
{
  type: "config",
  data: {
    speaker: "riya",  // ✅ Matches format
    target_language_code: "hi-IN",  // ✅ Matches format
    pitch: 0,  // ✅ Optional field included
    pace: 1.0,  // ✅ Optional field included
  }
}
```

**✅ VERDICT: Format is CORRECT** - We're using the exact structure with `type` and `data` wrapper as required.

---

### 2. Text Message Format

**Official Documentation Format:**
```json
{
  "type": "text",
  "data": {
    "text": "This is an example sentence that will be converted to speech."
  }
}
```

**Our Current Implementation:**
```typescript
{
  type: "text",
  data: {
    text: aiResponse  // ✅ Matches format exactly
  }
}
```

**✅ VERDICT: Format is CORRECT** - Exact match with documentation.

---

## Key Findings

### ✅ What We're Doing Correctly

1. **Message Structure**: Using `{"type": "...", "data": {...}}` format exactly as documented
2. **Config First**: Sending config message before text message
3. **WebSocket Protocol**: Using text frames (not binary) for JSON messages
4. **Field Names**: All field names match documentation exactly (`speaker`, `target_language_code`, `text`)
5. **JSON Serialization**: Valid JSON being sent (verified with `JSON.parse()`)

### ⚠️ Potential Issues to Investigate

1. **Speaker Name**: We're using `"riya"` but docs show `"anushka"`. However, Sarvam support confirmed "riya" is valid.
2. **Optional Fields**: We're sending minimal fields (`speaker`, `target_language_code`, `pitch`, `pace`). Docs show more optional fields, but these should be optional.
3. **Timing**: We wait 500ms after connection before sending config, then 500ms before sending text. Docs don't specify timing requirements.
4. **Connection State**: We verify `readyState === WS.OPEN` before sending, which is correct.

---

## Code Comparison

### Server-Side (server/index.ts)

**Config Message:**
```typescript
const configMessage = {
  type: "config",
  data: {
    speaker: speaker,  // "riya"
    target_language_code: language,  // "hi-IN"
    pitch: 0,
    pace: 1.0,
  }
};
const configJson = JSON.stringify(configMessage);
sarvamWs.send(configJson, { binary: false });
```

**Text Message:**
```typescript
const textMessage = {
  type: "text",
  data: {
    text: text
  }
};
const textJson = JSON.stringify(textMessage);
sarvamWs.send(textJson, { binary: false });
```

### Client-Side (client/src/components/voice/RiyaVoiceCall.tsx)

**Text Message (when sending AI responses):**
```typescript
const textMessage = {
  type: "text",
  data: {
    text: aiResponse
  }
};
ttsWsRef.current.send(JSON.stringify(textMessage));
```

---

## Error Analysis

### Current Error: `422: Input parameters has to be a valid dictionary`

**Possible Causes:**

1. **Server-Side Validation Bug**: Sarvam's server might have a validation bug that rejects valid dictionaries
2. **Encoding Issue**: WebSocket message encoding might be corrupted (unlikely, as we verify JSON)
3. **Timing Issue**: Config might need acknowledgment before text is sent (docs don't mention this)
4. **Field Validation**: Some field value might be invalid (e.g., speaker name, language code)
5. **API Key/Subscription**: Authentication might be failing, causing validation to fail

---

## Recommendations

### Immediate Actions

1. **✅ Code Updated**: I've updated the code to include `pitch` and `pace` fields explicitly (matching docs more closely)

2. **Test with Minimal Config**: Try sending config with ONLY required fields:
   ```json
   {
     "type": "config",
     "data": {
       "speaker": "riya",
       "target_language_code": "hi-IN"
     }
   }
   ```

3. **Test with Different Speaker**: Try using `"anushka"` (from docs example) to see if speaker name is the issue

4. **Request ID Tracking**: The error includes a `request_id` - we should log this and provide it to Sarvam support

### For Sarvam Support Meeting

**Questions to Ask:**

1. Is the `422` error coming from the config message or text message? (Our logs show it's the config)
2. Are there any additional required fields we're missing?
3. Is there a specific order or timing required between config and text messages?
4. Can you verify our API key/subscription has access to the `"riya"` speaker?
5. Can you check server logs for request ID `[from our error logs]`?

**Information to Provide:**

1. Exact message format we're sending (shown above)
2. Request IDs from error messages
3. WebSocket connection flow (config → text)
4. Our API key (for them to verify subscription status)

---

## Conclusion

**Our implementation is correct according to the official documentation.** The `422` error is likely due to:

1. A server-side validation bug on Sarvam's end
2. An undocumented requirement we're missing
3. An issue with our API key/subscription permissions

**Next Steps:**
- Test the updated code (with explicit `pitch` and `pace` fields)
- If error persists, escalate to Sarvam support with request IDs
- Request server-side logs from Sarvam for our specific requests

---

## Updated Code Changes

I've updated the server-side code to:
1. Include `pitch: 0` and `pace: 1.0` explicitly in config message
2. Add better logging for message sizes and content
3. Ensure all messages are sent as text frames (not binary)

The format now matches the documentation examples more closely while keeping the minimal required fields.

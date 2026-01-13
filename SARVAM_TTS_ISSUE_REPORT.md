# Sarvam TTS WebSocket Integration Issue Report

## Summary
We are experiencing a persistent **422 Validation Error** when attempting to use the Sarvam TTS WebSocket API. After extensive debugging and multiple format attempts, the error persists, indicating this is likely a server-side validation issue rather than a client-side implementation problem.

---

## Issue Details

### Error Message
```
422: Input parameters has to be a valid dictionary
```

### Error Response Format
```json
{
  "type": "error",
  "data": {
    "request_id": "20260108_aa70ee24-2d66-4825-9030-53986720a28d",
    "message": "Input parameters has to be a valid dictionary",
    "code": 422
  }
}
```

### Connection Details
- **WebSocket URL**: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true`
- **Authentication**: `Api-Subscription-Key` header (sent via backend proxy)
- **Connection Status**: Connection establishes successfully
- **Error Timing**: Error occurs immediately after sending the first message

---

## Payload Formats Attempted

### Attempt 1: Flat Payload (Current)
```json
{
  "inputs": ["Hello! I am Riya. How are you today?"],
  "target_language_code": "hi-IN",
  "speaker": "meera",
  "pitch": 0,
  "pace": 1.0,
  "loudness": 1.5,
  "speech_sample_rate": 24000,
  "enable_preprocessing": true,
  "model": "bulbul:v2"
}
```
**Result**: ❌ 422 Error

### Attempt 2: Wrapped Payload
```json
{
  "action": "configure",
  "payload": {
    "inputs": ["Hello! I am Riya. How are you today?"],
    "target_language_code": "hi-IN",
    "speaker": "meera",
    ...
  }
}
```
**Result**: ❌ 422 Error (same message)

### Attempt 3: Separate Configuration Step
1. First message: `{"action": "configure", "target_language_code": "hi-IN", "speaker": "meera"}`
2. Second message: `{"inputs": ["Hello! I am Riya..."]}`
**Result**: ❌ 422 Error on configuration message

### Attempt 4: Minimal Payload (Just Inputs)
```json
{
  "inputs": ["Hello! I am Riya. How are you today?"]
}
```
**Result**: ❌ 422 Error (same message)

---

## Code Verification

### ✅ Confirmed Correct Implementation

1. **No Double Stringify**: We verified that `JSON.stringify()` is called exactly once:
   ```typescript
   const payload = { inputs: [...] };           // Object
   sarvamWs.send(JSON.stringify(payload));      // Stringified ONCE
   ```

2. **Correct WebSocket Usage**: Using Node.js `ws` library correctly:
   ```typescript
   const sarvamWs = new WebSocket(url, { headers: { 'Api-Subscription-Key': apiKey } });
   sarvamWs.send(JSON.stringify(payload)); // Sends as text frame
   ```

3. **Payload Structure**: All payloads are valid JSON objects (verified with `JSON.stringify()` and `JSON.parse()`)

4. **Message Format**: WebSocket messages are sent as text frames (not binary), which is correct for JSON

---

## Diagnostic Evidence

### Server Logs Show:
```
[DEBUG] Received 155 bytes from Sarvam TTS
🚨 [Sarvam Proxy] Received JSON message (NOT audio): {
  "type": "error",
  "data": {
    "request_id": "20260108_aa70ee24-2d66-4825-9030-53986720a28d",
    "message": "Input parameters has to be a valid dictionary",
    "code": 422
  }
}
```

### What This Tells Us:
1. ✅ Connection is established successfully
2. ✅ Authentication is working (we get a response, not an auth error)
3. ✅ Message is received by Sarvam (we get a structured error response)
4. ❌ Server-side validation is rejecting our payload format

---

## Request IDs for Reference

The following request IDs can be used to look up the exact failures in your server logs:

1. `20260108_aa70ee24-2d66-4825-9030-53986720a28d` (Latest attempt with flat payload)
2. `20260108_37ad22ed-8ee7-4b0d-8f75-648252d9d92a` (Wrapped payload attempt)
3. `20260108_b2478879-2176-440c-95bc-f10546c0f45f` (Earlier attempt)

---

## Questions for Sarvam Team

1. **What is the correct payload format** for the TTS WebSocket API (`bulbul:v2`)?
   - Should configuration parameters be in the URL query string?
   - Should they be in the JSON payload?
   - Is there a specific key structure required?

2. **Is the `inputs` key correct?** 
   - Should it be `inputs`, `text`, `input`, or something else?
   - Does it need to be wrapped in another key?

3. **Are there any required vs optional fields?**
   - Which fields are mandatory?
   - Which fields can be omitted?

4. **Is there updated documentation** for the WebSocket API?
   - The error suggests our format doesn't match the expected schema
   - Can you share the exact expected payload structure?

5. **Is there a different endpoint or method** we should be using?
   - Should we use REST API instead of WebSocket?
   - Is there a different WebSocket endpoint for `bulbul:v2`?

---

## Our Implementation

### Backend Proxy (Node.js)
```typescript
// WebSocket connection
const sarvamWs = new WebSocket(
  'wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true',
  { headers: { 'Api-Subscription-Key': apiKey } }
);

// Payload (sent as text frame)
const payload = {
  inputs: ["Hello! I am Riya. How are you today?"],
  target_language_code: "hi-IN",
  speaker: "meera",
  pitch: 0,
  pace: 1.0,
  loudness: 1.5,
  speech_sample_rate: 24000,
  enable_preprocessing: true,
  model: "bulbul:v2"
};

sarvamWs.send(JSON.stringify(payload));
```

### What We've Verified:
- ✅ Payload is a valid JavaScript object
- ✅ `JSON.stringify()` produces valid JSON
- ✅ WebSocket sends as text frame (not binary)
- ✅ Authentication header is included
- ✅ Connection establishes successfully
- ✅ We receive structured error responses (proving communication works)

---

## Conclusion

After multiple format attempts and code verification, we believe this is a **server-side validation issue** rather than a client implementation problem. The error message "Input parameters has to be a valid dictionary" suggests that:

1. The server's validation schema doesn't match the payload format we're sending
2. There may be missing or incorrect documentation for the WebSocket API
3. The API may have changed but documentation hasn't been updated

**We need clarification on the exact expected payload format** for the Sarvam TTS WebSocket API to proceed with integration.

---

## Contact Information

**Integration Team**: [Your Team Name]  
**Project**: Riya AI Companion  
**API Key**: [Masked for security]  
**Date**: January 8, 2025

---

## Next Steps

1. **Awaiting Response**: We need the correct payload format from Sarvam team
2. **Testing**: Once we receive the correct format, we can test immediately
3. **Documentation**: We can help update documentation if needed after resolution

Thank you for your assistance!


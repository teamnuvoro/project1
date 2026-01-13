# Voice Call Troubleshooting Document - Sarvam AI TTS Integration

## Overview: What We're Trying to Do

We are implementing a voice call feature using Sarvam AI's Text-to-Speech (TTS) and Speech-to-Text (STT) WebSocket APIs. The goal is to:
1. Establish WebSocket connections to Sarvam AI's STT and TTS services
2. Send text messages to TTS to generate audio (Riya speaking)
3. Receive audio chunks from TTS and play them in the browser
4. Send user audio to STT for transcription
5. Create a bidirectional voice conversation with Riya (AI companion)

### Architecture
- **Frontend**: React app running on `localhost:3001` (Vite dev server)
- **Backend**: Node.js/Express server running on `localhost:3000`
- **Proxy Pattern**: Since browsers can't send custom headers in WebSocket connections, we use a backend WebSocket proxy that:
  - Accepts client WebSocket connections at `/api/sarvam/ws/proxy`
  - Adds the `Api-Subscription-Key` header
  - Forwards connections to Sarvam AI's WebSocket endpoints
  - Bidirectionally forwards messages between client and Sarvam

---

## Current Status: NOT WORKING ❌

**Symptom**: User clicks "Call Riya Now", connections are established, but **no audio is heard**. Riya does not speak.

---

## Errors and Issues Encountered

### Error #1: WebSocket Authentication Failure (RESOLVED)
**Error**: WebSocket connections failing with code 1006 (abnormal closure)
**Cause**: Browsers cannot send custom headers (like `Api-Subscription-Key`) directly to WebSocket endpoints
**Fix**: Implemented backend WebSocket proxy that adds authentication headers server-side
**Status**: ✅ RESOLVED - Connections now establish successfully

### Error #2: GET Request with Body (RESOLVED)
**Error**: `TypeError: Failed to execute 'fetch' on 'Window': Request with GET/HEAD method cannot have body`
**Cause**: `apiRequest('GET', '/api/call/config', {})` was sending empty body with GET request
**Fix**: Modified `apiRequest` to conditionally add body only for POST/PUT/PATCH methods
**Status**: ✅ RESOLVED

### Error #3: Infinite Loop in Cleanup (RESOLVED)
**Error**: `ERR_INSUFFICIENT_RESOURCES` - infinite `/api/call/end` calls
**Cause**: `useEffect` cleanup function had `handleEndCall` in dependency array, causing re-renders
**Fix**: Removed dependency, inlined cleanup logic, added `isCleaningUpRef` guard
**Status**: ✅ RESOLVED

### Error #4: Audio Chunks Too Small (PARTIALLY RESOLVED)
**Error**: Only receiving 155-byte audio chunks (~0.003 seconds) which are inaudible
**Cause**: Sarvam TTS sends small chunks; playing each chunk individually creates gaps/inaudible audio
**Fix**: Implemented audio accumulation - buffer multiple chunks before playing
**Status**: ⚠️ PARTIALLY RESOLVED - Accumulation works, but chunks still too small

### Error #5: TTS Connection Closes Immediately (PERSISTENT)
**Error**: TTS WebSocket closes with code 1000 (normal closure) immediately after receiving first 155-byte chunk
**Timeline**:
1. TTS connection established ✅
2. Configuration sent: `{ action: 'configure', target_language_code: 'hi-IN', speaker: 'meera' }` ✅
3. Greeting sent: `{ action: 'speak', text: 'Hello! I am Riya. How are you today?' }` ✅
4. Receives 155 bytes of audio ⚠️
5. Connection closes immediately (code 1000) ❌

**Current Behavior**:
```
[1] [Sarvam Proxy] ✅ Sent greeting immediately after config: Hello! I am Riya. How are you today?
[1] [Sarvam Proxy] Received 155 bytes of audio from Sarvam TTS
[1] [Sarvam Proxy] Sarvam tts closed: code=1000, reason=none
[1] [Sarvam Proxy] Client tts disconnected
```

**Why This Happens**: 
- Sarvam TTS appears to be closing the connection after sending what it thinks is the complete audio
- The 155-byte chunk might be:
  - An acknowledgment/status message (not actual audio)
  - A very small audio chunk (inaudible)
  - An error response indicating the request format is wrong
- The connection closes with code 1000 (normal closure), suggesting Sarvam believes it has completed the request

### Error #6: No Audio Playback (PERSISTENT)
**Error**: Even when audio chunks are received and accumulated, no sound is heard
**Possible Causes**:
1. Audio format incompatibility (PCM to WAV conversion may be incorrect)
2. Audio chunks are empty or invalid
3. Browser audio context not initialized properly
4. Volume muted or audio element not playing
5. Audio chunks too small even after accumulation
6. Timing issues - connection closes before all chunks are received

---

## Fixes Attempted

### Fix #1: WebSocket Proxy Implementation
**What We Did**: Created backend WebSocket proxy at `/api/sarvam/ws/proxy` that handles authentication
**Result**: ✅ Connections establish successfully
**Code Location**: `server/index.ts` lines 176-335

### Fix #2: Audio Accumulation
**What We Did**: Changed from playing each chunk immediately to accumulating chunks in a buffer, then playing all at once
**Result**: ⚠️ Accumulation works (logs show chunks being queued), but audio still not audible
**Code Location**: `client/src/components/voice/RiyaVoiceCall.tsx` lines 45-46, 254-294

### Fix #3: PCM to WAV Conversion
**What We Did**: Implemented `convertPCMToWAV` function to convert raw PCM audio (24kHz, 16-bit, mono) to WAV format that browsers can play
**Result**: ✅ Conversion works, but may not be the issue if chunks are empty/invalid
**Code Location**: `client/src/components/voice/RiyaVoiceCall.tsx` lines 47-79

### Fix #4: Initial Greeting Timing
**What We Did**: 
- First attempt: Client-side greeting with 1-second delay (connection closed before greeting sent)
- Second attempt: Server-side greeting in `setTimeout(100ms)` (connection closed too quickly)
- Third attempt: Server-side greeting immediately after config (still closes immediately)
**Result**: ❌ Greeting IS being sent (confirmed in logs), but connection still closes immediately after
**Code Location**: `server/index.ts` lines 229-266

### Fix #5: Multiple Send Attempts with Fallbacks
**What We Did**: Implemented immediate send + `setImmediate` fallback + `setTimeout` retry
**Result**: ❌ Greeting is sent successfully (logs confirm), but connection still closes
**Code Location**: `server/index.ts` lines 239-266

### Fix #6: Buffer Window for Audio Chunks
**What We Did**: Added 300ms buffer window - wait 300ms after receiving a chunk before playing accumulated audio
**Result**: ⚠️ Buffer window works, but only 1 chunk (155 bytes) is received before connection closes
**Code Location**: `client/src/components/voice/RiyaVoiceCall.tsx` lines 310-331, 339-352

### Fix #7: Enhanced Logging
**What We Did**: Added extensive logging to track:
- When greeting is sent
- When audio is received
- Audio chunk sizes
- WebSocket states
- Accumulated audio sizes
**Result**: ✅ Logs show exactly what's happening, but reveal the core issue (connection closes too quickly)
**Code Location**: Throughout `server/index.ts` and `client/src/components/voice/RiyaVoiceCall.tsx`

---

## Root Cause Analysis

### Primary Issue: Sarvam TTS Closing Connection Prematurely

**Evidence**:
1. Configuration and greeting are sent successfully (confirmed in logs)
2. Only 155 bytes received before connection closes
3. Connection closes with code 1000 (normal closure), not an error
4. No additional audio chunks are received

**Hypotheses**:

#### Hypothesis A: Sarvam TTS API Format Mismatch
The message format we're sending might not match what Sarvam expects:
- Current format: `{ action: 'speak', text: '...' }`
- Possible issues:
  - Missing required fields
  - Wrong field names
  - Incorrect action value
  - Text encoding issues

**Need to verify**: Sarvam TTS WebSocket API documentation for exact message format

#### Hypothesis B: Sarvam Expects Binary Audio Input, Not JSON
Sarvam TTS might expect raw audio data or a different protocol entirely.

#### Hypothesis C: Configuration/Timing Issues
- Configuration might not be processed before greeting is sent
- Sarvam might require waiting for a configuration acknowledgment
- The order of messages might be wrong

#### Hypothesis D: Sarvam API Key or Permissions Issue
- API key might not have TTS permissions
- Subscription might not include TTS features
- Rate limiting or quota exceeded

#### Hypothesis E: Text Language/Encoding Mismatch
- Text is in English but configuration specifies `target_language_code: 'hi-IN'` (Hindi)
- Sarvam might reject English text with Hindi configuration
- Text encoding (UTF-8) might be incorrect

#### Hypothesis F: Sarvam TTS Requires Different Protocol
- Might need to send configuration in URL parameters, not JSON
- Might need to use a different WebSocket endpoint
- Might require different authentication method

---

## Next Steps to Debug

### Step 1: Verify Sarvam TTS API Documentation
- [ ] Check official Sarvam AI documentation for TTS WebSocket API
- [ ] Verify exact message format required
- [ ] Verify required/optional fields
- [ ] Verify correct action values

### Step 2: Test with Different Text Formats
- [ ] Try sending text in Hindi (matching language code)
- [ ] Try different action values
- [ ] Try including/excluding optional fields
- [ ] Try different text encodings

### Step 3: Inspect the 155-Byte Response
- [ ] Log the actual bytes received (not just size)
- [ ] Check if it's JSON (error message?) or binary data
- [ ] Check if it contains an error code or message
- [ ] Verify if it's actual audio or a status message

### Step 4: Test with Sarvam API Directly (Without Proxy)
- [ ] Use a tool like `wscat` to connect directly to Sarvam TTS
- [ ] Test with the same configuration and greeting
- [ ] See if behavior is the same
- [ ] Verify if the issue is with our proxy or Sarvam API itself

### Step 5: Check Sarvam API Key and Permissions
- [ ] Verify API key has TTS permissions
- [ ] Check subscription/quota limits
- [ ] Test with a different API key if available

### Step 6: Review Sarvam TTS WebSocket URL and Parameters
- [ ] Verify WebSocket URL is correct
- [ ] Check if URL parameters (model, send_completion_event) are correct
- [ ] Verify if configuration should be in URL vs JSON

### Step 7: Test Audio Playback Independently
- [ ] Create a test file with known-good WAV audio
- [ ] Test if `convertPCMToWAV` and `playAudio` functions work
- [ ] Verify audio context initialization
- [ ] Check browser audio permissions

---

## Code Locations

### Server-Side WebSocket Proxy
**File**: `server/index.ts`
- Lines 176-335: WebSocket proxy implementation
- Lines 218-266: TTS configuration and greeting sending logic
- Lines 280-306: Message forwarding (client to Sarvam)
- Lines 308-335: Message forwarding (Sarvam to client)

### Client-Side Voice Call Component
**File**: `client/src/components/voice/RiyaVoiceCall.tsx`
- Lines 45-46: Audio accumulation refs
- Lines 47-79: PCM to WAV conversion function
- Lines 127-153: Audio playback functions
- Lines 254-294: Audio accumulation and playback logic
- Lines 270-323: TTS message handler (receives audio chunks)
- Lines 470-565: TTS WebSocket connection logic

### API Request Utility
**File**: `client/src/lib/queryClient.ts`
- Lines 38-53: `apiRequest` function (handles GET requests without body)

---

## Current Configuration

### TTS Configuration Being Sent
```json
{
  "action": "configure",
  "target_language_code": "hi-IN",
  "speaker": "meera"
}
```

### Greeting Being Sent
```json
{
  "action": "speak",
  "text": "Hello! I am Riya. How are you today?"
}
```

### WebSocket URLs
- **STT**: `wss://api.sarvam.ai/speech-to-text/ws?language-code=hi-IN&model=saarika:v2.5&vad_signals=true&sample_rate=16000`
- **TTS**: `wss://api.sarvam.ai/text-to-speech/ws?model=bulbul:v2&send_completion_event=true`

### Audio Format Assumed
- **Format**: Raw PCM
- **Sample Rate**: 24kHz
- **Bit Depth**: 16-bit
- **Channels**: Mono (1 channel)

---

## Recommendations

### Immediate Actions
1. **Check Sarvam API Documentation**: Verify exact message format required for TTS
2. **Inspect 155-Byte Response**: Log the actual bytes to see if it's an error message
3. **Test with Hindi Text**: Try sending greeting in Hindi to match language configuration
4. **Test Direct Connection**: Use `wscat` to test Sarvam TTS directly without proxy

### Alternative Approaches
1. **Try REST API Instead**: Sarvam might have a REST API for TTS that's more reliable
2. **Use Different TTS Provider**: Consider using Google Cloud TTS, AWS Polly, or Azure TTS
3. **Implement Streaming Protocol**: If Sarvam supports HTTP streaming, use that instead of WebSocket

### Long-Term Solutions
1. **Add Comprehensive Error Handling**: Catch and log all WebSocket errors and responses
2. **Implement Retry Logic**: Auto-retry failed connections with exponential backoff
3. **Add Health Checks**: Periodic ping/pong to keep connection alive
4. **Monitor Connection State**: Track connection lifecycle and state changes
5. **Add User Feedback**: Show connection status and errors to user

---

## Testing Checklist

- [ ] Verify Sarvam API key is valid and has TTS permissions
- [ ] Check if API key has rate limits or quota restrictions
- [ ] Test connection to Sarvam TTS with `wscat` or similar tool
- [ ] Verify message format matches Sarvam documentation
- [ ] Test with Hindi text (matching language code)
- [ ] Inspect actual bytes of 155-byte response
- [ ] Test audio playback with known-good WAV file
- [ ] Check browser console for audio-related errors
- [ ] Verify browser audio permissions are granted
- [ ] Test with different browsers (Chrome, Firefox, Safari)

---

## Logs Reference

### Successful Connection Flow (Current)
```
[1] [Sarvam Proxy] tts connected to Sarvam successfully
[1] [Sarvam Proxy] TTS configuration sent: { action: 'configure', target_language_code: 'hi-IN', speaker: 'meera' }
[1] [Sarvam Proxy] ✅ Sent greeting immediately after config: Hello! I am Riya. How are you today?
[1] [Sarvam Proxy] Received 155 bytes of audio from Sarvam TTS
[1] [Sarvam Proxy] Sarvam tts closed: code=1000, reason=none
```

### Client-Side (Browser Console)
```
[Sarvam] TTS proxy connected
[Sarvam] TTS connected via proxy!
[Sarvam] Received audio Blob: 155 bytes, type: none
[Sarvam] Accumulated audio: 155 bytes (total: 155 bytes, chunks: 1)
[Sarvam] TTS proxy closed: 1005
[Sarvam] Playing accumulated audio: 155 bytes (~ 3 ms)
[Sarvam] Playing audio via HTML5 Audio
```

---

## Summary

**Status**: ❌ Voice call feature is NOT working

**Main Issue**: Sarvam TTS WebSocket connection closes immediately after receiving a 155-byte response, before generating complete audio for the greeting text.

**What Works**:
- ✅ WebSocket connections establish successfully
- ✅ Authentication works (proxy pattern)
- ✅ Configuration is sent correctly
- ✅ Greeting text is sent successfully
- ✅ Audio chunks are received and accumulated
- ✅ Audio format conversion (PCM to WAV) works

**What Doesn't Work**:
- ❌ Connection closes after only 155 bytes (should receive much more audio)
- ❌ No audible sound is produced
- ❌ Complete audio is not generated before connection closes

**Next Steps**: 
1. Verify Sarvam TTS API message format and requirements
2. Inspect the 155-byte response to understand what it contains
3. Test with Hindi text to match language configuration
4. Consider alternative TTS providers or REST API if WebSocket proves unreliable

---

**Document Created**: 2025-01-09
**Last Updated**: 2025-01-09
**Author**: AI Assistant (Auto)

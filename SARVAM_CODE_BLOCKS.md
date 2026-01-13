# Code Blocks for Sarvam Support - 422 Validation Error

**Issue**: 422 "Input parameters has to be a valid dictionary" error when sending config message  
**Request ID**: `20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae` (most recent)

---

## 1. WebSocket Connection Setup

```typescript
// server/index.ts
import WebSocket from 'ws';
const WS = WebSocket;

// Connection to Sarvam TTS WebSocket
const targetUrl = 'wss://api.sarvam.ai/text-to-speech/ws?model=bulbul%3Av2&send_completion_event=true';
const apiKey = process.env.SARVAM_API_KEY; // 'Api-Subscription-Key' header

const urlObj = new URL(targetUrl);
urlObj.searchParams.set('Api-Subscription-Key', apiKey);
const finalUrl = urlObj.toString();

const headers: Record<string, string> = {
  'Api-Subscription-Key': apiKey,
};

console.log(`[Sarvam Proxy] Connecting with header and URL param`);
const sarvamWs = new WS(finalUrl, { headers });

// Connection establishes successfully ✅
sarvamWs.on('open', () => {
  console.log(`[Sarvam Proxy] tts connected to Sarvam successfully`);
  // Config message sent here (see section 2)
});
```

---

## 2. Config Message (EXACTLY AS SENT)

```typescript
// server/index.ts - sendTTSConfig()
const language = 'hi-IN';
const speaker = 'riya'; // Also tried: 'meera', 'anushka'

const configMessage = {
  type: "config",
  data: {
    speaker: speaker,
    target_language_code: language,
  }
};

const configJson = JSON.stringify(configMessage);
console.log(`[Sarvam Proxy] Sending config message:`, configJson);
// Output: {"type":"config","data":{"speaker":"riya","target_language_code":"hi-IN"}}

// Verify JSON is valid
try {
  const verified = JSON.parse(configJson);
  console.log(`[Sarvam Proxy] ✅ JSON verification passed`);
} catch (e) {
  console.error(`[Sarvam Proxy] ❌ JSON verification FAILED:`, e);
}

// Send message
sarvamWs.send(configJson, { binary: false }); // Explicitly send as text frame
console.log(`[Sarvam Proxy] ✅ Config message sent (${configJson.length} bytes, text frame)`);
```

**Actual JSON Payload Sent:**
```json
{"type":"config","data":{"speaker":"riya","target_language_code":"hi-IN"}}
```

**Bytes (hex dump):**
```
7b2274797065223a22636f6e666967222c2264617461223a7b22737065616b6572223a2272697961222c227461726765745f6c616e67756167655f636f6465223a2268692d494e227d7d
```

---

## 3. Error Response Received

```typescript
// server/index.ts - Error handler
sarvamWs.on('message', (data: Buffer) => {
  const text = data.toString('utf8');
  
  if (data.length < 200) {
    // Small messages are often JSON errors
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'error') {
        console.log(`🚨 [Sarvam Proxy] Received JSON message (NOT audio):`, parsed);
        // Error: {"type":"error","data":{"request_id":"20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae","message":"Input parameters has to be a valid dictionary","code":422}}
      }
    } catch (e) {
      // Not JSON
    }
  }
});

sarvamWs.on('close', (code: number, reason: Buffer) => {
  console.log(`[Sarvam Proxy] Sarvam tts closed: code=${code}, reason=${reason.toString()}`);
  // Output: code=1000, reason=none (normal closure after error)
});
```

**Error Response:**
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

---

## 4. Text Message Format (Also Ready to Send)

```typescript
// server/index.ts - sendTTSText()
const textMessage = {
  type: "text",
  data: {
    text: "Hello! I am Riya. How are you today?"
  }
};

const textJson = JSON.stringify(textMessage);
// Output: {"type":"text","data":{"text":"Hello! I am Riya. How are you today?"}}

sarvamWs.send(textJson);
```

**Note**: This message is never sent because the config message fails first with 422 error.

---

## 5. Timing Sequence

```typescript
sarvamWs.on('open', () => {
  console.log(`[Sarvam Proxy] tts connected to Sarvam successfully`);
  
  // Wait 500ms for connection to fully stabilize
  setTimeout(() => {
    sendTTSConfig(); // Sends config message (section 2)
    
    // Text message scheduled but never reached due to config error
    setTimeout(() => {
      sendTTSText('Hello! I am Riya. How are you today?');
    }, 500);
  }, 500);
});
```

**Timeline:**
1. `t=0ms`: WebSocket connection opened ✅
2. `t=500ms`: Config message sent ❌ → 422 error immediately
3. `t=1000ms`: Text message (never sent - connection already closed)

---

## 6. Complete Connection Flow

```typescript
// Full WebSocket proxy handler
function handleSarvamProxy(clientWs: any, request: any) {
  const url = new URL(request.url || '/', 'http://localhost');
  const type = url.searchParams.get('type'); // 'tts'
  const language = url.searchParams.get('language') || 'hi-IN';
  const speaker = url.searchParams.get('speaker') || 'riya';
  const model = url.searchParams.get('model') || 'bulbul:v2';
  
  const apiKey = process.env.SARVAM_API_KEY;
  
  // Build Sarvam WebSocket URL
  const targetUrl = `wss://api.sarvam.ai/text-to-speech/ws?model=${encodeURIComponent(model)}&send_completion_event=true`;
  
  // Add API key to URL params (in addition to header)
  const urlObj = new URL(targetUrl);
  urlObj.searchParams.set('Api-Subscription-Key', apiKey);
  const finalUrl = urlObj.toString();
  
  const headers: Record<string, string> = {
    'Api-Subscription-Key': apiKey,
  };
  
  const sarvamWs = new WS(finalUrl, { headers });
  
  let ttsConfigSent = false;
  
  const sendTTSConfig = () => {
    if (ttsConfigSent || type !== 'tts') return;
    ttsConfigSent = true;
    
    if (sarvamWs.readyState === WS.OPEN) {
      const configMessage = {
        type: "config",
        data: {
          speaker: speaker,
          target_language_code: language,
        }
      };
      
      const configJson = JSON.stringify(configMessage);
      console.log(`[Sarvam Proxy] Sending config message:`, configJson);
      
      // Verify JSON
      try {
        JSON.parse(configJson);
        console.log(`[Sarvam Proxy] ✅ JSON verification passed`);
      } catch (e) {
        console.error(`[Sarvam Proxy] ❌ JSON verification FAILED:`, e);
      }
      
      sarvamWs.send(configJson, { binary: false });
      console.log(`[Sarvam Proxy] ✅ Config message sent`);
    }
  };
  
  sarvamWs.on('open', () => {
    console.log(`[Sarvam Proxy] ${type} connected to Sarvam successfully`);
    
    if (type === 'tts') {
      setTimeout(() => {
        sendTTSConfig();
      }, 500);
    }
  });
  
  sarvamWs.on('message', (data: Buffer) => {
    if (data.length < 200) {
      try {
        const parsed = JSON.parse(data.toString('utf8'));
        if (parsed.type === 'error') {
          console.log(`🚨 [Sarvam Proxy] Received JSON message (NOT audio):`, parsed);
        }
      } catch (e) {
        // Not JSON, likely audio
      }
    }
    // Forward to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
  
  sarvamWs.on('error', (error: Error) => {
    console.error(`[Sarvam Proxy] Sarvam ${type} WebSocket error:`, error.message);
    clientWs.close(1006, `Sarvam connection error: ${error.message}`);
  });
  
  sarvamWs.on('close', (code: number, reason: Buffer) => {
    console.log(`[Sarvam Proxy] Sarvam ${type} closed: code=${code}, reason=${reason.toString()}`);
    clientWs.close();
  });
}
```

---

## 7. Verification Details

**What We Verify:**
- ✅ Valid JSON: `JSON.parse(JSON.stringify(configMessage))` succeeds
- ✅ Correct structure: Matches official documentation format
- ✅ Connection state: WebSocket in `OPEN` state when sending
- ✅ Encoding: UTF-8 text frame (not binary)
- ✅ Single encoding: Only one `JSON.stringify()` call
- ✅ Authentication: API key in both header and URL param (we tried both methods)

**What We Don't Verify (Need Help):**
- ❓ Field order: Does field order matter?
- ❓ Value types: Are string values correct?
- ❓ Speaker name: Is "riya" a valid speaker for `bulbul:v2`?
- ❓ Timing: Do we need to wait for acknowledgment before sending config?
- ❓ Additional requirements: Are there undocumented headers or parameters?

---

## 8. Comparison with Official Documentation

**Official Documentation Example:**
```json
{
  "type": "config",
  "data": {
    "speaker": "anushka",
    "target_language_code": "en-IN",
    "pitch": 0.8,
    "pace": 2
  }
}
```

**Our Implementation:**
```json
{
  "type": "config",
  "data": {
    "speaker": "riya",
    "target_language_code": "hi-IN"
  }
}
```

**Differences:**
- Same structure ✅
- Same required fields ✅
- Different values (but should be valid):
  - `speaker: "riya"` instead of `"anushka"`
  - `target_language_code: "hi-IN"` instead of `"en-IN"`
  - No optional fields (`pitch`, `pace`)

**Conclusion**: Format matches documentation exactly, only values differ.

---

## 9. Environment & Dependencies

**Node.js Version**: v20.19.5  
**WebSocket Library**: `ws` (version from package.json)  
**Connection**: Direct WebSocket to `wss://api.sarvam.ai/text-to-speech/ws`  
**Authentication**: `Api-Subscription-Key` header + URL param (tried both methods)  
**Model**: `bulbul:v2`  
**Language**: `hi-IN` (Hindi)  
**Speaker**: `riya` (also tried `meera`, `anushka`)

---

## 10. What We Need from Sarvam

1. **Can you verify the exact payload we're sending is correct?**
   - Payload: `{"type":"config","data":{"speaker":"riya","target_language_code":"hi-IN"}}`
   - Request ID: `20260109_c20ee1e3-a9fa-43f3-8100-4fa31ff671ae`

2. **Is "riya" a valid speaker for `bulbul:v2` model?**
   - If not, what are the valid speaker names for `hi-IN` language?

3. **What exactly does "Input parameters has to be a valid dictionary" mean?**
   - Which validation is failing?
   - What structure does the server expect?

4. **Can you provide a working example payload?**
   - Complete working Node.js code using `ws` library
   - Exact JSON payload that works

5. **Are there any timing requirements?**
   - Do we need to wait for acknowledgment after connection?
   - How long after `open` event should we send config?

---

**End of Code Blocks**


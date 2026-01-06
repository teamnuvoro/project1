# Bolna Integration - Exact Problems for Gemini Analysis

## Problem Summary
We're trying to integrate Bolna AI for browser-based real-time voice calls, but the WebSocket connection is failing. Need to determine if Bolna supports browser-based calls and what the correct implementation approach is.

## Current Implementation Context

### What We Have:
- **Bolna API Key**: `bn-b047b2f636174881acb064feba53b415`
- **Bolna Agent ID**: `3c660025-822b-4096-ac4c-411c98949d43`
- **Bolna API Base URL**: `https://api.bolna.ai`
- **Goal**: Browser-based real-time voice calls (not phone calls)

### Technology Stack:
- Frontend: React/TypeScript with WebSocket connections
- Backend: Node.js/Express
- Voice Call Type: Browser-based (user's microphone → AI → browser speakers)

## Exact Problems

### Problem 1: WebSocket Connection Fails Immediately
**Error Code**: `1006` (Abnormal Closure)
**Error Message**: `WebSocket connection to 'wss://api.bolna.ai/ws?agent_id=3c660025-822b-4096-ac4c-411c98949d43&session_id=bolna_ws_1767513158647_00000000&api_key=bn-b047b2f636174881acb064feba53b415' failed`

**WebSocket URL We're Using**:
```
wss://api.bolna.ai/ws?agent_id=3c660025-822b-4096-ac4c-411c98949d43&session_id=bolna_ws_1767513158647_00000000&api_key=bn-b047b2f636174881acb064feba53b415
```

**What Happens**:
- WebSocket connection attempts to open
- Immediately fails with error 1006 (connection closed before establishment)
- No connection is established
- No error message from server, just connection closure

### Problem 2: Bolna `/call` API Endpoint Requires Phone Number
**Endpoint**: `POST https://api.bolna.ai/call`
**Error**: `422 Unprocessable Entity`
**Error Details**:
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "recipient_phone_number"],
      "msg": "Field required",
      "input": null
    }
  ],
  "body": {
    "agent_id": "3c660025-822b-4096-ac4c-411c98949d43",
    "user_data": {
      "user_id": "00000000-0000-0000-0000-000000000001"
    }
  }
}
```

**Issue**: The `/call` endpoint requires `recipient_phone_number`, which suggests it's designed for telephony (phone calls), not browser-based calls.

### Problem 3: No Documentation for Browser-Based WebSocket Calls
**Documentation Reviewed**: https://www.bolna.ai/docs
**What We Found**:
- ✅ Documentation for phone calls (telephony) - very clear
- ✅ Documentation for making outbound phone calls
- ✅ Documentation for receiving incoming phone calls
- ✅ Documentation for telephony providers (Twilio, Plivo, Exotel)
- ❌ **NO documentation for browser-based WebSocket calls**
- ❌ **NO documentation for real-time voice in browser**
- ❌ **NO documentation for WebSocket endpoints**

**Key Documentation Pages Checked**:
- API Reference Introduction
- Making Outgoing Calls
- Phone Calls using Bolna
- Integrations
- Features

### Problem 4: Unknown WebSocket Endpoint Format
**Current Assumption**: 
- WebSocket URL: `wss://api.bolna.ai/ws`
- Query parameters: `agent_id`, `session_id`, `api_key`

**Questions**:
- Does this endpoint exist?
- What are the correct query parameters?
- Should authentication be in headers instead of query params?
- Is there a different endpoint path?
- Do we need to create a session first via REST API before connecting WebSocket?

### Problem 5: No API Response with WebSocket URL
**Expected Behavior** (based on other providers like Vapi):
- Call REST API to start a session
- Receive WebSocket URL in response
- Connect to WebSocket URL for real-time communication

**Current Behavior with Bolna**:
- `/call` endpoint requires phone number (can't use for browser calls)
- No alternative endpoint found for browser-based calls
- We're generating WebSocket URL manually (which may be incorrect)

## Code Implementation Details

### Backend Code (Node.js/Express)
**File**: `server/services/bolna.ts`

**Current Approach for Browser Calls**:
```typescript
// For WebSocket calls, generate a session ID and construct WebSocket URL
const sessionId = `bolna_ws_${Date.now()}_${config.userId.slice(0, 8)}`;
const websocketUrl = `wss://api.bolna.ai/ws?agent_id=${agentId}&session_id=${sessionId}`;

return {
  callId: sessionId,
  status: 'initiated',
  websocketUrl: websocketUrl,
};
```

**Issue**: We're constructing the WebSocket URL manually without any API call, which may be completely wrong.

### Frontend Code (React/TypeScript)
**File**: `client/src/hooks/useBolnaCall.ts`

**WebSocket Connection Code**:
```typescript
const wsUrl = getBolnaWebSocketUrl(callId, websocketUrl);
const ws = new WebSocket(wsUrl);

ws.onopen = () => { /* handle connection */ };
ws.onerror = (err) => { /* error 1006 here */ };
ws.onclose = (event) => { /* connection closed immediately */ };
```

**WebSocket URL Format Function**:
```typescript
export const getBolnaWebSocketUrl = (callId: string, websocketUrl?: string) => {
  if (websocketUrl) {
    return websocketUrl; // Use URL from API response if provided
  }
  
  // Otherwise construct manually
  const baseUrl = 'wss://api.bolna.ai/ws';
  const params = new URLSearchParams({
    agent_id: BOLNA_CONFIG.agentId || '',
    session_id: callId,
  });
  
  if (BOLNA_CONFIG.apiKey) {
    params.append('api_key', BOLNA_CONFIG.apiKey);
  }
  
  return `${baseUrl}?${params.toString()}`;
};
```

## Key Questions for Gemini

1. **Does Bolna AI support browser-based real-time voice calls via WebSocket?**
   - Or is it ONLY for telephony (phone calls)?

2. **If browser calls are supported, what is the correct API flow?**
   - What endpoint do we call first?
   - How do we get the WebSocket URL?
   - What authentication method should we use?

3. **What is the correct WebSocket endpoint URL format?**
   - Endpoint path?
   - Required query parameters?
   - Authentication method (headers vs query params)?

4. **Are there any alternative endpoints we should use?**
   - Agent executions API?
   - Streaming API?
   - Different endpoint path?

5. **Should we be using a different integration approach entirely?**
   - SDK instead of direct WebSocket?
   - Different API structure?

## What We Need from Gemini

1. **Confirmation**: Does Bolna support browser-based WebSocket calls?
2. **Correct Implementation**: If yes, what's the exact API flow and endpoints?
3. **Alternative Solution**: If no, what should we use instead for browser-based calls?

## Environment Variables

```
BOLNA_API_KEY=bn-b047b2f636174881acb064feba53b415
BOLNA_AGENT_ID=3c660025-822b-4096-ac4c-411c98949d43
BOLNA_API_BASE_URL=https://api.bolna.ai
```

## References

- Bolna Documentation: https://www.bolna.ai/docs
- Bolna API Reference: https://www.bolna.ai/docs/api-reference/introduction
- Bolna Dashboard: https://platform.bolna.ai
- Current Error: WebSocket error 1006 (connection closed before establishment)



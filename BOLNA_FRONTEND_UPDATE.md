# Updating CallPage for Bolna Integration

This guide shows how to update `CallPage.tsx` to use Bolna instead of Vapi.

## Option 1: Add Bolna Support (Recommended)

Update `CallPage.tsx` to support multiple providers (Bolna, Vapi, Sarvam):

```typescript
import { useBolnaCall } from '@/hooks/useBolnaCall';
import { isBolnaConfigured } from '@/config/bolna-config';
import { useQuery } from '@tanstack/react-query';

export default function CallPage() {
  // ... existing state ...

  // Check which provider is configured
  const { data: callConfig } = useQuery({
    queryKey: ["/api/call/config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/call/config");
      return response.json();
    },
  });

  const isBolna = callConfig?.provider === 'bolna';
  const bolnaCall = useBolnaCall();

  const handleStartCall = async () => {
    if (isBolna) {
      // Start Bolna call
      const response = await apiRequest("POST", "/api/call/start", {
        provider: 'bolna'
      });
      const session = await response.json();
      
      // Connect to Bolna WebSocket
      if (session.bolna_call_id) {
        await bolnaCall.connect(session.bolna_call_id);
        await bolnaCall.startRecording();
        setCallStatus('connected');
      }
    } else {
      // Existing Vapi/Sarvam logic
      // ...
    }
  };

  const handleEndCall = async () => {
    if (isBolna) {
      bolnaCall.disconnect();
      // Call API to end session
      await apiRequest("POST", "/api/call/end", {
        sessionId: callSessionIdRef.current,
        provider: 'bolna'
      });
    } else {
      // Existing end call logic
      // ...
    }
  };

  // ... rest of component ...
}
```

## Option 2: Replace Vapi with Bolna

If you want to completely replace Vapi with Bolna:

1. **Remove Vapi imports**:
```typescript
// Remove:
import Vapi from '@vapi-ai/web';
```

2. **Add Bolna imports**:
```typescript
import { useBolnaCall } from '@/hooks/useBolnaCall';
import { isBolnaConfigured } from '@/config/bolna-config';
```

3. **Replace Vapi initialization**:
```typescript
// Remove Vapi initialization
// Replace with:
const bolnaCall = useBolnaCall();
```

4. **Update start call logic**:
```typescript
const handleStartCall = async () => {
  try {
    // Start backend call session
    const response = await apiRequest("POST", "/api/call/start", {
      provider: 'bolna'
    });
    const session = await response.json();

    if (!session.bolna_call_id) {
      throw new Error('Failed to start Bolna call');
    }

    // Connect to Bolna WebSocket
    await bolnaCall.connect(session.bolna_call_id);
    
    // Start recording
    await bolnaCall.startRecording();
    
    setCallStatus('connected');
    callSessionIdRef.current = session.id;
    
  } catch (error: any) {
    console.error('Failed to start call:', error);
    toast({
      title: "Call Failed",
      description: error.message || "Failed to start voice call",
      variant: "destructive",
    });
  }
};
```

5. **Update end call logic**:
```typescript
const handleEndCall = async () => {
  try {
    // Disconnect Bolna
    bolnaCall.disconnect();
    
    // End backend session
    await apiRequest("POST", "/api/call/end", {
      sessionId: callSessionIdRef.current,
      durationSeconds: sessionDuration,
      provider: 'bolna'
    });

    setCallStatus('ended');
    // ... rest of cleanup
  } catch (error) {
    console.error('Error ending call:', error);
  }
};
```

6. **Display transcript**:
```typescript
// Use Bolna transcript
{bolnaCall.transcript && (
  <div className="transcript">
    {bolnaCall.transcript}
  </div>
)}
```

7. **Handle errors**:
```typescript
{bolnaCall.error && (
  <div className="error">
    {bolnaCall.error}
  </div>
)}
```

## Testing

1. Ensure Bolna is configured in `.env`:
   ```env
   BOLNA_API_KEY=your_key
   BOLNA_AGENT_ID=your_agent_id
   ```

2. Start the server and verify config:
   ```bash
   curl http://localhost:3000/api/call/config
   ```
   Should return: `{ "provider": "bolna", ... }`

3. Test the call:
   - Navigate to `/call` page
   - Click "Start Call"
   - Verify WebSocket connection in browser console
   - Test microphone and audio playback

## Notes

- Bolna uses WebSocket for real-time audio streaming
- Audio is sent/received as Blob chunks
- Transcripts are received as JSON messages
- Make sure to handle microphone permissions properly


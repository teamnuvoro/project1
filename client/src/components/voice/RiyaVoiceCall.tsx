/**
 * RiyaVoiceCall Component - Sarvam AI Integration
 * WebSocket-based voice call component for real-time conversations with Riya
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/lib/analytics';
import { apiRequest } from '@/lib/queryClient';

interface RiyaVoiceCallProps {
  userId: string;
  onCallEnd?: () => void;
}

export default function RiyaVoiceCall({ userId, onCallEnd }: RiyaVoiceCallProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // WebSocket connections
  const sttWsRef = useRef<WebSocket | null>(null);
  const ttsWsRef = useRef<WebSocket | null>(null);
  
  // Audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptRef = useRef<string>('');
  
  // Call state
  const callIdRef = useRef<string | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const isCleaningUpRef = useRef(false);

  /**
   * Get API key from environment or config
   */
  const getApiKey = useCallback(() => {
    // API key should be available from backend via /api/call/config
    // For now, we'll get it from the call start response
    return null; // Will be set via WebSocket headers if needed
  }, []);

  /**
   * Play audio from TTS WebSocket
   */
  const playAudio = useCallback(async (audioBlob: Blob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }

      const audioCtx = audioContextRef.current;
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (err) {
      console.error('[Sarvam] Error playing audio:', err);
    }
  }, []);

  /**
   * Handle STT WebSocket messages
   */
  const handleSTTMessage = useCallback(async (event: MessageEvent) => {
    try {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        
        // Handle transcript updates
        if (data.text) {
          const newTranscript = data.text;
          transcriptRef.current = newTranscript;
          setTranscript(newTranscript);
        }

        // Handle final transcript - trigger Chat API call
        if (data.is_final && data.text) {
          const userTranscript = data.text;
          console.log('[Sarvam] Final transcript:', userTranscript);
          
          // Add user message to conversation history
          conversationHistoryRef.current.push({
            role: 'user',
            content: userTranscript,
          });

          // Call backend to generate response
          try {
            const response = await fetch('/api/sarvam/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcript: userTranscript,
                conversationHistory: conversationHistoryRef.current,
                callId: callIdRef.current,
              }),
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error('Failed to get response from Sarvam');
            }

            const responseData = await response.json();
            const aiResponse = responseData.response || responseData.text || '';

            console.log('[Sarvam] AI Response:', aiResponse);

            // Add AI response to conversation history
            conversationHistoryRef.current.push({
              role: 'assistant',
              content: aiResponse,
            });

            // Send to TTS WebSocket
            if (ttsWsRef.current?.readyState === WebSocket.OPEN) {
              // Send text message
              ttsWsRef.current.send(JSON.stringify({
                action: 'speak',
                text: aiResponse,
              }));

              // Send flush message
              setTimeout(() => {
                if (ttsWsRef.current?.readyState === WebSocket.OPEN) {
                  ttsWsRef.current.send(JSON.stringify({
                    action: 'flush',
                  }));
                }
              }, 100);
            }
          } catch (err: any) {
            console.error('[Sarvam] Error generating response:', err);
            toast({
              title: 'Error',
              description: 'Failed to get response from Riya. Please try again.',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (err) {
      console.error('[Sarvam] Error processing STT message:', err);
    }
  }, [toast]);

  /**
   * Handle TTS WebSocket messages
   */
  const handleTTSMessage = useCallback(async (event: MessageEvent) => {
    try {
      // Handle audio chunks (Blob)
      if (event.data instanceof Blob) {
        await playAudio(event.data);
      }
      // Handle JSON messages (completion events)
      else if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.completion) {
          console.log('[Sarvam] TTS completion event');
        }
      }
    } catch (err) {
      console.error('[Sarvam] Error processing TTS message:', err);
    }
  }, [playAudio]);

  /**
   * Connect to STT WebSocket
   */
  const connectSTT = useCallback((wsUrl: string, apiKey: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Add API key as query parameter (browser WebSocket doesn't support headers)
        // Try subscription-key to match the header name used in server code
        const url = new URL(wsUrl);
        url.searchParams.set('subscription-key', apiKey);
        
        const ws = new WebSocket(url.toString());
        
        ws.onopen = () => {
          console.log('[Sarvam] STT WebSocket connected');
          sttWsRef.current = ws;
          resolve();
        };

        ws.onmessage = handleSTTMessage;

        ws.onerror = (err) => {
          console.error('[Sarvam] STT WebSocket error:', err);
          reject(new Error('STT connection error'));
        };

        ws.onclose = (event) => {
          console.log('[Sarvam] STT WebSocket closed:', event.code, event.reason);
          sttWsRef.current = null;
          if (event.code !== 1000 && event.code !== 1001) {
            // Only reject if it's an abnormal closure
            reject(new Error(`STT WebSocket closed abnormally: ${event.code} ${event.reason || ''}`));
          }
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }, [handleSTTMessage]);

  /**
   * Connect to TTS WebSocket
   */
  const connectTTS = useCallback((wsUrl: string, apiKey: string, language: string = 'hi-IN', speaker: string = 'meera') => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Add API key as query parameter (browser WebSocket doesn't support headers)
        // Try subscription-key to match the header name used in server code
        const url = new URL(wsUrl);
        url.searchParams.set('subscription-key', apiKey);
        
        const ws = new WebSocket(url.toString());
        
        ws.onopen = () => {
          console.log('[Sarvam] TTS WebSocket connected');
          // Send configuration
          ws.send(JSON.stringify({
            action: 'configure',
            target_language_code: language,
            speaker: speaker,
          }));
          ttsWsRef.current = ws;
          resolve();
        };

        ws.onmessage = handleTTSMessage;

        ws.onerror = (err) => {
          console.error('[Sarvam] TTS WebSocket error:', err);
          reject(new Error('TTS connection error'));
        };

        ws.onclose = (event) => {
          console.log('[Sarvam] TTS WebSocket closed:', event.code, event.reason);
          ttsWsRef.current = null;
          if (event.code !== 1000 && event.code !== 1001) {
            // Only reject if it's an abnormal closure
            reject(new Error(`TTS WebSocket closed abnormally: ${event.code} ${event.reason || ''}`));
          }
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }, [handleTTSMessage]);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected. Start call first.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && sttWsRef.current?.readyState === WebSocket.OPEN) {
          sttWsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(250); // Send chunks every 250ms
      console.log('[Sarvam] Recording started');
    } catch (err: any) {
      console.error('[Sarvam] Microphone error:', err);
      setError(`Microphone access denied: ${err.message}`);
      toast({
        title: 'Microphone Error',
        description: 'Please allow microphone access to use voice calls.',
        variant: 'destructive',
      });
    }
  }, [isConnected, toast]);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      console.log('[Sarvam] Recording stopped');
    }
  }, []);

  /**
   * Start call
   */
  const handleStartCall = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);

      // Call backend to start Sarvam call
      const response = await apiRequest('POST', '/api/call/start', {
        userId: userId || user?.id,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start call');
      }

      const data = await response.json();
      callIdRef.current = data.sarvam_call_id || data.id;
      
      // Get WebSocket URLs from metadata or response
      const sttUrl = data.stt_websocket_url || data.metadata?.sttWebSocketUrl;
      const ttsUrl = data.tts_websocket_url || data.metadata?.ttsWebSocketUrl;
      
      // Get API key from config endpoint
      const configResponse = await apiRequest('GET', '/api/call/config');
      const config = await configResponse.json();
      const apiKey = config.apiKey;

      if (!sttUrl || !ttsUrl) {
        throw new Error('WebSocket URLs not provided by server');
      }

      if (!apiKey) {
        throw new Error('Sarvam API key not configured');
      }

      // Connect to STT and TTS WebSockets
      // Note: Sarvam WebSocket URLs may need API key in headers or query params
      // This is a placeholder - adjust based on actual Sarvam API requirements
      await connectSTT(sttUrl, apiKey);
      await connectTTS(ttsUrl, apiKey);

      setIsConnected(true);
      setIsConnecting(false);
      
      // Start recording
      await startRecording();

      analytics.track('voice_call_started', { provider: 'sarvam' });
    } catch (err: any) {
      console.error('[Sarvam] Error starting call:', err);
      setError(err.message || 'Failed to start call');
      setIsConnecting(false);
      toast({
        title: 'Error',
        description: err.message || 'Failed to initialize voice call. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userId, user?.id, connectSTT, connectTTS, startRecording, toast]);

  /**
   * End call
   */
  const handleEndCall = useCallback(async () => {
    try {
      stopRecording();

      // Close WebSocket connections
      if (sttWsRef.current) {
        sttWsRef.current.close();
        sttWsRef.current = null;
      }
      if (ttsWsRef.current) {
        ttsWsRef.current.close();
        ttsWsRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // End call on backend
      if (callIdRef.current) {
        await apiRequest('POST', '/api/call/end', {
          sessionId: callIdRef.current,
          sarvamCallId: callIdRef.current,
          provider: 'sarvam',
        });
      }

      setIsConnected(false);
      setIsConnecting(false);
      setTranscript('');
      transcriptRef.current = '';
      callIdRef.current = null;
      conversationHistoryRef.current = [];
      onCallEnd?.();

      analytics.track('voice_call_ended', { provider: 'sarvam' });
    } catch (err: any) {
      console.error('[Sarvam] Error ending call:', err);
    }
  }, [stopRecording, onCallEnd]);

  /**
   * Toggle mute
   */
  const handleToggleMute = useCallback(() => {
    if (mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Prevent multiple cleanup calls
      if (isCleaningUpRef.current) {
        return;
      }
      isCleaningUpRef.current = true;

      // Synchronous cleanup - don't call async handleEndCall
      // Stop recording
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // Ignore errors during cleanup
        }
        mediaRecorderRef.current = null;
      }

      // Close WebSocket connections
      if (sttWsRef.current) {
        try {
          sttWsRef.current.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
        sttWsRef.current = null;
      }
      if (ttsWsRef.current) {
        try {
          ttsWsRef.current.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
        ttsWsRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore errors during cleanup
        });
        audioContextRef.current = null;
      }

      // End call on backend (fire and forget - don't await in cleanup)
      const currentCallId = callIdRef.current;
      if (currentCallId) {
        apiRequest('POST', '/api/call/end', {
          sessionId: currentCallId,
          sarvamCallId: currentCallId,
          provider: 'sarvam',
        }).catch(() => {
          // Ignore errors during cleanup
        });
        callIdRef.current = null;
      }

      // Clear refs
      transcriptRef.current = '';
      conversationHistoryRef.current = [];
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Show call button if not connected
  if (!isConnected && !isConnecting) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={handleStartCall}
          size="lg"
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg"
        >
          <Phone className="mr-2 h-5 w-5" />
          Call Riya Now
        </Button>
        <p className="text-sm text-gray-500">
          Experience voice conversations with Riya
        </p>
        {error && (
          <div className="text-center text-red-600 text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Show connecting state
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-gray-600">Connecting to Riya...</p>
      </div>
    );
  }

  // Show call controls
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-gray-600">Talking to Riya...</div>
      
      {transcript && (
        <div className="text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded max-w-md text-center">
          {transcript}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-4">
        <Button
          onClick={handleToggleMute}
          variant={isMuted ? 'destructive' : 'outline'}
          size="lg"
          className="rounded-full px-6 py-6"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          onClick={handleEndCall}
          variant="destructive"
          size="lg"
          className="rounded-full px-8 py-6"
        >
          <PhoneOff className="mr-2 h-5 w-5" />
          End Call
        </Button>
      </div>
    </div>
  );
}



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
  const callSessionRowIdRef = useRef<string | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const isCleaningUpRef = useRef(false);
  
  // Audio accumulation for TTS (buffer multiple small chunks before playing)
  const accumulatedAudioRef = useRef<ArrayBuffer[]>([]);
  const audioAccumulationTimerRef = useRef<number | null>(null);
  
  // Cleanup accumulated audio on unmount
  useEffect(() => {
    return () => {
      if (audioAccumulationTimerRef.current) {
        clearTimeout(audioAccumulationTimerRef.current);
      }
      accumulatedAudioRef.current = [];
    };
  }, []);

  /**
   * Convert PCM to WAV format for browser playback
   */
  const convertPCMToWAV = useCallback((pcmData: ArrayBuffer, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Blob => {
    const length = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Copy PCM data
    const pcmView = new Uint8Array(pcmData);
    const wavView = new Uint8Array(buffer, 44);
    wavView.set(pcmView);
    
    return new Blob([buffer], { type: 'audio/wav' });
  }, []);

  /**
   * Fallback: Play audio using Web Audio API
   */
  const playAudioWithWebAudio = useCallback(async (audioBlob: Blob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const audioCtx = audioContextRef.current;
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Try decoding directly first (might be WAV/MP3)
      try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
        console.log('[Sarvam] Playing audio via Web Audio API (decoded directly)');
        return;
      } catch (decodeError) {
        console.log('[Sarvam] Direct decode failed, trying PCM to WAV conversion:', decodeError);
      }
      
      // If direct decode fails, assume it's raw PCM and convert to WAV
      // Sarvam TTS typically sends 24kHz, 16-bit PCM, mono
      const wavBlob = convertPCMToWAV(arrayBuffer, 24000, 1, 16);
      const wavArrayBuffer = await wavBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(wavArrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
      console.log('[Sarvam] Playing audio via Web Audio API (PCM converted to WAV)');
    } catch (err) {
      console.error('[Sarvam] Web Audio API error:', err);
      throw err;
    }
  }, [convertPCMToWAV]);

  /**
   * Play audio from TTS WebSocket
   */
  const playAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Try using HTML5 Audio element first (handles more formats)
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (err) => {
        console.error('[Sarvam] Audio element error:', err);
        URL.revokeObjectURL(audioUrl);
        // Fallback to Web Audio API
        playAudioWithWebAudio(audioBlob).catch(e => {
          console.error('[Sarvam] Web Audio API also failed:', e);
        });
      };
      
      await audio.play();
      console.log('[Sarvam] Playing audio via HTML5 Audio');
    } catch (err: any) {
      console.warn('[Sarvam] HTML5 Audio failed, trying Web Audio API:', err);
      // Fallback to Web Audio API
      await playAudioWithWebAudio(audioBlob);
    }
  }, [playAudioWithWebAudio]);

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

            // ✅ OFFICIAL DOCS FORMAT: The documentation shows "data" wrapper IS required
            // See: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api
            // Note: Config should already be set from initial greeting, so only text message needed
            if (ttsWsRef.current?.readyState === WebSocket.OPEN) {
              const textMessage = {
                type: "text",
                data: {
                  text: aiResponse
                }
              };
              
              console.log('[Sarvam] Sending TTS text message:', aiResponse.substring(0, 100));
              ttsWsRef.current.send(JSON.stringify(textMessage));
            } else {
              console.warn('[Sarvam] TTS WebSocket not open, cannot send response. State:', ttsWsRef.current?.readyState);
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
   * Process accumulated audio chunks and play them
   */
  const playAccumulatedAudio = useCallback(async () => {
    if (accumulatedAudioRef.current.length === 0) {
      return;
    }

    // Combine all accumulated PCM chunks
    const totalLength = accumulatedAudioRef.current.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combinedBuffer = new ArrayBuffer(totalLength);
    const combinedView = new Uint8Array(combinedBuffer);
    
    let offset = 0;
    for (const chunk of accumulatedAudioRef.current) {
      combinedView.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    console.log('[Sarvam] Playing accumulated audio:', totalLength, 'bytes (~', Math.round(totalLength / 48000 * 1000), 'ms)');

    // Clear accumulated chunks
    accumulatedAudioRef.current = [];

    // Convert combined PCM to WAV and play
    if (totalLength > 0) {
      try {
        const wavBlob = convertPCMToWAV(combinedBuffer, 24000, 1, 16);
        await playAudio(wavBlob);
      } catch (err) {
        console.error('[Sarvam] Error playing accumulated audio:', err);
      }
    }
  }, [convertPCMToWAV, playAudio]);

  /**
   * Handle TTS WebSocket messages
   * IMPORTANT: Check for text (JSON) messages FIRST, then binary (audio) messages
   */
  const handleTTSMessage = useCallback(async (event: MessageEvent) => {
    try {
      // FIRST: Check if message is text (JSON) - this includes error messages, completion events, etc.
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          console.log('[Sarvam] Received TEXT message (JSON):', data);
          
          // Check for error messages
          if (data.error || data.detail || data.status === 'failed' || data.status === 'error' || data.type === 'error') {
            const errorMessage = data.data?.message || data.detail || data.error || data.message || 'Unknown error';
            const errorCode = data.data?.code || data.code;
            console.error('🚨 [Sarvam] TTS Error message:', data);
            setError(`TTS Error (${errorCode || 'N/A'}): ${errorMessage}`);
            
            // Show toast notification to user
            toast({
              title: 'Voice Call Error',
              description: errorMessage,
              variant: 'destructive',
            });
            
            // Optionally end the call on error
            // handleEndCall();
            return; // Don't process as audio
          }
          
          // Handle completion events
          if (data.completion) {
            console.log('[Sarvam] TTS completion event - audio generation complete');
            // Clear timer and play all accumulated audio immediately
            if (audioAccumulationTimerRef.current) {
              clearTimeout(audioAccumulationTimerRef.current);
              audioAccumulationTimerRef.current = null;
            }
            await playAccumulatedAudio();
            return;
          }
          
          // Handle other JSON events (status, progress, etc.)
          if (data.status || data.progress || data.event) {
            console.log('[Sarvam] TTS status/event message:', data);
            return; // Don't process as audio
          }
          
          // If JSON but not recognized, log it
          console.log('[Sarvam] Unrecognized JSON message:', data);
        } catch (parseErr) {
          // Not valid JSON, might be plain text error
          console.warn('🚨 [Sarvam] Received text message (not JSON):', event.data.substring(0, 200));
          return; // Don't process as audio
        }
        return; // Text message handled, don't process as audio
      }
      
      // SECOND: Handle binary audio data (Blob or ArrayBuffer)
      // Sarvam TTS sends raw PCM audio (24kHz, 16-bit, mono), which must be converted to WAV
      if (event.data instanceof Blob) {
        const size = event.data.size;
        console.log('[Sarvam] Received audio Blob:', size, 'bytes, type:', event.data.type || 'none');
        
        if (size > 0) {
          // Accumulate raw PCM data (don't convert yet)
          const arrayBuffer = await event.data.arrayBuffer();
          accumulatedAudioRef.current.push(arrayBuffer);
          
          const totalAccumulated = accumulatedAudioRef.current.reduce((sum, buf) => sum + buf.byteLength, 0);
          console.log('[Sarvam] Accumulated audio:', size, 'bytes (total:', totalAccumulated, 'bytes, chunks:', accumulatedAudioRef.current.length, ')');
          
          // Clear any pending timer
          if (audioAccumulationTimerRef.current) {
            clearTimeout(audioAccumulationTimerRef.current);
          }
          
          // Wait a bit more for additional chunks before playing
          audioAccumulationTimerRef.current = window.setTimeout(() => {
            playAccumulatedAudio();
          }, 300); // 300ms buffer window
        }
      } else if (event.data instanceof ArrayBuffer) {
        const size = event.data.byteLength;
        console.log('[Sarvam] Received audio ArrayBuffer:', size, 'bytes');
        
        if (size > 0) {
          // Accumulate raw PCM data (don't convert yet)
          accumulatedAudioRef.current.push(event.data);
          
          const totalAccumulated = accumulatedAudioRef.current.reduce((sum, buf) => sum + buf.byteLength, 0);
          console.log('[Sarvam] Accumulated audio:', size, 'bytes (total:', totalAccumulated, 'bytes, chunks:', accumulatedAudioRef.current.length, ')');
          
          // Clear any pending timer
          if (audioAccumulationTimerRef.current) {
            clearTimeout(audioAccumulationTimerRef.current);
          }
          
          // Wait a bit more for additional chunks before playing
          audioAccumulationTimerRef.current = window.setTimeout(() => {
            playAccumulatedAudio();
          }, 300); // 300ms buffer window
        }
      } else {
        // Unknown message type
        console.warn('[Sarvam] Received unknown message type:', typeof event.data, event.data);
      }
    } catch (err) {
      console.error('[Sarvam] Error processing TTS message:', err);
    }
  }, [playAccumulatedAudio, setError]);

  /**
   * Connect to STT WebSocket via proxy
   */
  const connectSTTProxy = useCallback((proxyUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        console.log('[Sarvam] Connecting to STT proxy:', proxyUrl);
        const ws = new WebSocket(proxyUrl);
        
        ws.onopen = () => {
          console.log('[Sarvam] STT proxy connected');
          sttWsRef.current = ws;
          resolve();
        };

        ws.onmessage = handleSTTMessage;

        ws.onerror = (err) => {
          console.error('[Sarvam] STT proxy error:', err);
          reject(new Error('STT proxy connection error'));
        };

        ws.onclose = (event) => {
          console.log('[Sarvam] STT proxy closed:', event.code, event.reason);
          sttWsRef.current = null;
          if (event.code !== 1000 && event.code !== 1001) {
            reject(new Error(`STT proxy closed: ${event.code} ${event.reason || ''}`));
          }
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }, [handleSTTMessage]);

  /**
   * Connect to STT WebSocket (legacy - not used anymore)
   */
  const connectSTT = useCallback((wsUrl: string, apiKey: string) => {
    return new Promise<void>((resolve, reject) => {
      // Try different authentication methods
      // Sarvam requires 'Api-Subscription-Key' header, but browsers can't send headers
      // Try as query param and as first message
      const authMethods = [
        // Method 1: Connect without auth, send as first JSON message (some WebSocket APIs require this)
        { 
          param: 'first-message-json', 
          url: (url: URL) => { /* No URL modification */ },
          sendFirst: JSON.stringify({ 'Api-Subscription-Key': apiKey })
        },
        // Method 2: Api-Subscription-Key as query param (URL-encoded)
        { param: 'Api-Subscription-Key', url: (url: URL) => { url.searchParams.set('Api-Subscription-Key', apiKey); }, sendFirst: null },
        // Method 3: api-subscription-key (lowercase) as query param
        { param: 'api-subscription-key', url: (url: URL) => { url.searchParams.set('api-subscription-key', apiKey); }, sendFirst: null },
        // Method 4: api_key as query param
        { param: 'api_key', url: (url: URL) => { url.searchParams.set('api_key', apiKey); }, sendFirst: null },
      ];

      let currentMethod = 0;
      let ws: WebSocket | null = null;
      let connectTimeout: NodeJS.Timeout;

      const tryConnect = (methodIndex: number) => {
        if (methodIndex >= authMethods.length) {
          reject(new Error('All authentication methods failed. Please check your API key and Sarvam documentation.'));
          return;
        }

        try {
          const method = authMethods[methodIndex];
          const url = new URL(wsUrl);
          method.url(url);
          
          console.log(`[Sarvam] Trying STT connection method ${methodIndex + 1}/${authMethods.length}: ${method.param}`, url.toString().replace(apiKey, 'sk_***'));
          
          ws = new WebSocket(url.toString());
          
          connectTimeout = setTimeout(() => {
            if (ws && ws.readyState !== WebSocket.OPEN) {
              ws.close();
              console.log(`[Sarvam] STT connection timeout with ${method.param}, trying next method...`);
              tryConnect(methodIndex + 1);
            }
          }, 3000); // Reduced to 3 seconds per method

          ws.onopen = () => {
            console.log(`[Sarvam] STT WebSocket connected with ${method.param}`);
            clearTimeout(connectTimeout);
            
            // If method requires sending auth as first message
            if ((method as any).sendFirst && ws) {
              try {
                ws.send((method as any).sendFirst);
                console.log('[Sarvam] Sent auth as first message:', (method as any).sendFirst.substring(0, 50) + '...');
                // Wait a bit to see if connection stays open
                setTimeout(() => {
                  if (ws?.readyState === WebSocket.OPEN) {
                    console.log('[Sarvam] STT WebSocket authenticated and ready');
                    sttWsRef.current = ws;
                    resolve();
                  } else {
                    console.log('[Sarvam] STT connection closed after auth - trying next method');
                    ws?.close();
                    tryConnect(methodIndex + 1);
                  }
                }, 1000);
              } catch (e) {
                console.warn('[Sarvam] Failed to send auth message:', e);
                ws?.close();
                tryConnect(methodIndex + 1);
              }
            } else {
              // Normal connection - no first message needed
              sttWsRef.current = ws;
              resolve();
            }
          };

          ws.onmessage = handleSTTMessage;

          ws.onerror = (err) => {
            console.error(`[Sarvam] STT WebSocket error with ${method.param}:`, err);
            clearTimeout(connectTimeout);
            if (ws) {
              ws.close();
            }
            // Try next method
            tryConnect(methodIndex + 1);
          };

          ws.onclose = (event) => {
            console.log(`[Sarvam] STT WebSocket closed with ${method.param}:`, event.code, event.reason);
            clearTimeout(connectTimeout);
            sttWsRef.current = null;
            
            if (event.code === 1000 || event.code === 1001) {
              // Normal closure - might be from previous connection
              return;
            }
            
            // If connection failed (not normal closure), try next method
            if (event.code === 1006 || event.code === 1002) {
              console.log(`[Sarvam] STT connection failed with ${method.param} (code ${event.code}), trying next method...`);
              tryConnect(methodIndex + 1);
            } else {
              reject(new Error(`STT WebSocket closed abnormally: ${event.code} ${event.reason || ''}`));
            }
          };
        } catch (err: any) {
          reject(err);
        }
      };

      tryConnect(0);
    });
  }, [handleSTTMessage]);

  /**
   * Connect to TTS WebSocket via proxy
   */
  const connectTTSProxy = useCallback((proxyUrl: string, language: string = 'hi-IN', speaker: string = 'riya') => {
    return new Promise<void>((resolve, reject) => {
      try {
        console.log('[Sarvam] Connecting to TTS proxy:', proxyUrl);
        const ws = new WebSocket(proxyUrl);
        
        ws.onopen = () => {
          console.log('[Sarvam] TTS proxy connected');
          // Configuration and initial greeting are sent by the proxy server
          // This ensures text is sent immediately after config to keep connection alive
          ttsWsRef.current = ws;
          
          // Clear any accumulated audio from previous calls
          accumulatedAudioRef.current = [];
          
          resolve();
        };

        ws.onmessage = handleTTSMessage;

        ws.onerror = (err) => {
          console.error('[Sarvam] TTS proxy error:', err);
          reject(new Error('TTS proxy connection error'));
        };

        ws.onclose = (event) => {
          console.log('[Sarvam] TTS proxy closed:', event.code, event.reason);
          ttsWsRef.current = null;
          if (event.code !== 1000 && event.code !== 1001) {
            reject(new Error(`TTS proxy closed: ${event.code} ${event.reason || ''}`));
          }
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }, [handleTTSMessage]);

  /**
   * Connect to TTS WebSocket (legacy - not used anymore)
   */
  const connectTTS = useCallback((wsUrl: string, apiKey: string, language: string = 'hi-IN', speaker: string = 'riya') => {
    return new Promise<void>((resolve, reject) => {
      // Try different authentication methods
      // Sarvam requires 'Api-Subscription-Key' header, but browsers can't send headers
      // Try as query param and as first message
      const authMethods = [
        // Method 1: Connect without auth, send as first JSON message (some WebSocket APIs require this)
        { 
          param: 'first-message-json', 
          url: (url: URL) => { /* No URL modification */ },
          sendFirst: JSON.stringify({ 'Api-Subscription-Key': apiKey })
        },
        // Method 2: Api-Subscription-Key as query param (URL-encoded)
        { param: 'Api-Subscription-Key', url: (url: URL) => { url.searchParams.set('Api-Subscription-Key', apiKey); }, sendFirst: null },
        // Method 3: api-subscription-key (lowercase) as query param
        { param: 'api-subscription-key', url: (url: URL) => { url.searchParams.set('api-subscription-key', apiKey); }, sendFirst: null },
        // Method 4: api_key as query param
        { param: 'api_key', url: (url: URL) => { url.searchParams.set('api_key', apiKey); }, sendFirst: null },
      ];

      let currentMethod = 0;
      let ws: WebSocket | null = null;
      let connectTimeout: NodeJS.Timeout;

      const tryConnect = (methodIndex: number) => {
        if (methodIndex >= authMethods.length) {
          reject(new Error('All TTS authentication methods failed. Please check your API key and Sarvam documentation.'));
          return;
        }

        try {
          const method = authMethods[methodIndex];
          const url = new URL(wsUrl);
          method.url(url);
          
          console.log(`[Sarvam] Trying TTS connection method ${methodIndex + 1}/${authMethods.length}: ${method.param}`, url.toString().replace(apiKey, 'sk_***'));
          
          ws = new WebSocket(url.toString());
          
          connectTimeout = setTimeout(() => {
            if (ws && ws.readyState !== WebSocket.OPEN) {
              ws.close();
              console.log(`[Sarvam] TTS connection timeout with ${method.param}, trying next method...`);
              tryConnect(methodIndex + 1);
            }
          }, 5000);

          ws.onopen = () => {
            console.log(`[Sarvam] TTS WebSocket connected with ${method.param}`);
            clearTimeout(connectTimeout);
            
            // If method requires sending auth as first message
            if ((method as any).sendFirst && ws) {
              try {
                ws.send((method as any).sendFirst);
                console.log('[Sarvam] Sent auth as first message:', (method as any).sendFirst.substring(0, 50) + '...');
                // Wait a bit to see if connection stays open, then send config
                setTimeout(() => {
                  if (ws?.readyState === WebSocket.OPEN) {
                    console.log('[Sarvam] TTS WebSocket authenticated and ready');
                    // Send configuration after auth
                    try {
                      ws?.send(JSON.stringify({
                        action: 'configure',
                        target_language_code: language,
                        speaker: speaker,
                      }));
                      console.log('[Sarvam] TTS configuration sent');
                    } catch (e) {
                      console.warn('[Sarvam] Failed to send TTS configuration:', e);
                    }
                    ttsWsRef.current = ws;
                    resolve();
                  } else {
                    console.log('[Sarvam] TTS connection closed after auth - trying next method');
                    ws?.close();
                    tryConnect(methodIndex + 1);
                  }
                }, 1000);
              } catch (e) {
                console.warn('[Sarvam] Failed to send auth message:', e);
                ws?.close();
                tryConnect(methodIndex + 1);
              }
            } else {
              // Normal connection - send config immediately
              try {
                ws?.send(JSON.stringify({
                  action: 'configure',
                  target_language_code: language,
                  speaker: speaker,
                }));
                console.log('[Sarvam] TTS configuration sent');
              } catch (e) {
                console.warn('[Sarvam] Failed to send TTS configuration:', e);
              }
              ttsWsRef.current = ws;
              resolve();
            }
          };

          ws.onmessage = handleTTSMessage;

          ws.onerror = (err) => {
            console.error(`[Sarvam] TTS WebSocket error with ${method.param}:`, err);
            clearTimeout(connectTimeout);
            if (ws) {
              ws.close();
            }
            // Try next method
            tryConnect(methodIndex + 1);
          };

          ws.onclose = (event) => {
            console.log(`[Sarvam] TTS WebSocket closed with ${method.param}:`, event.code, event.reason);
            clearTimeout(connectTimeout);
            ttsWsRef.current = null;
            
            if (event.code === 1000 || event.code === 1001) {
              // Normal closure - might be from previous connection
              return;
            }
            
            // If connection failed (not normal closure), try next method
            if (event.code === 1006 || event.code === 1002) {
              console.log(`[Sarvam] TTS connection failed with ${method.param} (code ${event.code}), trying next method...`);
              tryConnect(methodIndex + 1);
            } else {
              reject(new Error(`TTS WebSocket closed abnormally: ${event.code} ${event.reason || ''}`));
            }
          };
        } catch (err: any) {
          reject(err);
        }
      };

      tryConnect(0);
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
    console.log('[Sarvam] Starting call...');
    try {
      setError(null);
      setIsConnecting(true);

      // No need to fetch API key - proxy handles authentication

      // Call backend to start Sarvam call
      console.log('[Sarvam] Starting call session...');
      const response = await apiRequest('POST', '/api/call/start', {
        provider: 'sarvam',
      });

      const data = await response.json();
      console.log('[Sarvam] Call session response:', data);
      
      callSessionRowIdRef.current = data.id || null;
      callIdRef.current = data.sarvam_call_id || null;
      callStartedAtRef.current = Date.now();
      
      // Use WebSocket proxy instead of direct connection (browsers can't send custom headers)
      // The proxy handles authentication server-side
      // Backend runs on port 3000, frontend on 3001
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const apiUrl = new URL(API_BASE);
      const backendHost = `${apiUrl.hostname}:${apiUrl.port || '3000'}`;
      
      const sttProxyUrl = `${protocol}//${backendHost}/api/sarvam/ws/proxy?type=stt&language=hi-IN`;
      const ttsProxyUrl = `${protocol}//${backendHost}/api/sarvam/ws/proxy?type=tts&language=hi-IN&speaker=riya&model=bulbul:v2`;
      
      console.log('[Sarvam] Connecting to STT via proxy:', sttProxyUrl);
      console.log('[Sarvam] Connecting to TTS via proxy:', ttsProxyUrl);

      // Connect to STT WebSocket proxy
      console.log('[Sarvam] Connecting to STT proxy...');
      const sttPromise = connectSTTProxy(sttProxyUrl);
      const sttTimeout = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('STT connection timeout after 10 seconds')), 10000)
      );
      try {
        await Promise.race([sttPromise, sttTimeout]);
        console.log('[Sarvam] STT connected via proxy!');
      } catch (sttErr: any) {
        console.error('[Sarvam] STT connection failed:', sttErr);
        throw new Error(`Failed to connect STT: ${sttErr.message}`);
      }

      // Connect to TTS WebSocket proxy
      console.log('[Sarvam] Connecting to TTS proxy...');
      const ttsPromise = connectTTSProxy(ttsProxyUrl);
      const ttsTimeout = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('TTS connection timeout after 10 seconds')), 10000)
      );
      try {
        await Promise.race([ttsPromise, ttsTimeout]);
        console.log('[Sarvam] TTS connected via proxy!');
      } catch (ttsErr: any) {
        console.error('[Sarvam] TTS connection failed:', ttsErr);
        // Clean up STT if TTS fails
        if (sttWsRef.current) {
          sttWsRef.current.close();
          sttWsRef.current = null;
        }
        throw new Error(`Failed to connect TTS: ${ttsErr.message}`);
      }

      setIsConnected(true);
      setIsConnecting(false);
      
      // Start recording
      console.log('[Sarvam] Starting recording...');
      await startRecording();
      console.log('[Sarvam] Call fully started!');

      analytics.track('voice_call_started', { provider: 'sarvam' });
    } catch (err: any) {
      console.error('[Sarvam] Error starting call:', err);
      setError(err.message || 'Failed to start call');
      setIsConnecting(false);
      
      // Clean up any partial connections
      if (sttWsRef.current) {
        sttWsRef.current.close();
        sttWsRef.current = null;
      }
      if (ttsWsRef.current) {
        ttsWsRef.current.close();
        ttsWsRef.current = null;
      }
      
      toast({
        title: 'Connection Error',
        description: err.message || 'Failed to connect. Please try again.',
        variant: 'destructive',
      });
    }
  }, [connectSTTProxy, connectTTSProxy, startRecording, toast]);

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
      const sarvamCallId = callIdRef.current;
      const sessionRowId = callSessionRowIdRef.current;
      const startedAt = callStartedAtRef.current;
      const durationSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;

      if (sarvamCallId || sessionRowId) {
        await apiRequest('POST', '/api/call/end', {
          sessionId: sessionRowId || undefined,
          sarvamCallId: sarvamCallId || undefined,
          durationSeconds,
          endReason: 'user_ended',
          transcript: transcriptRef.current || undefined,
        });
      }

      setIsConnected(false);
      setIsConnecting(false);
      setTranscript('');
      transcriptRef.current = '';
      callIdRef.current = null;
      callSessionRowIdRef.current = null;
      callStartedAtRef.current = null;
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
      const currentSessionRowId = callSessionRowIdRef.current;
      const startedAt = callStartedAtRef.current;
      const durationSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
      if (currentCallId) {
        apiRequest('POST', '/api/call/end', {
          sessionId: currentSessionRowId || undefined,
          sarvamCallId: currentCallId,
          durationSeconds,
          endReason: 'cleanup',
          transcript: transcriptRef.current || undefined,
        }).catch(() => {
          // Ignore errors during cleanup
        });
        callIdRef.current = null;
      }
      callSessionRowIdRef.current = null;
      callStartedAtRef.current = null;

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



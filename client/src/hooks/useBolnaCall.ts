/**
 * React Hook for Bolna Voice Calls
 * Handles WebSocket connection for real-time voice conversations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { isBolnaConfigured, getBolnaWebSocketUrl, BOLNA_CONFIG } from '@/config/bolna-config';

export interface UseBolnaCallReturn {
  isConnected: boolean;
  isRecording: boolean;
  transcript: string;
  error: string | null;
  connect: (callId: string, websocketUrl?: string) => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useBolnaCall(): UseBolnaCallReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptRef = useRef<string>('');

  /**
   * Connect to Bolna WebSocket
   */
  const connect = useCallback(async (callId: string, websocketUrl?: string) => {
    if (!isBolnaConfigured()) {
      setError('Bolna is not configured. Please set BOLNA_API_KEY and BOLNA_AGENT_ID.');
      return;
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = getBolnaWebSocketUrl(callId, websocketUrl);
      console.log('[Bolna] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Bolna] WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = async (event) => {
        try {
          // Handle audio data (Blob)
          if (event.data instanceof Blob) {
            await playAudio(event.data);
          } 
          // Handle text data (transcripts, status updates)
          else if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            
            if (data.transcript) {
              const newTranscript = transcriptRef.current 
                ? `${transcriptRef.current} ${data.transcript}` 
                : data.transcript;
              transcriptRef.current = newTranscript;
              setTranscript(newTranscript);
            }

            if (data.status) {
              console.log('[Bolna] Status update:', data.status);
            }

            if (data.error) {
              setError(data.error);
            }
          }
        } catch (e) {
          console.error('[Bolna] Error processing message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[Bolna] WebSocket error:', err);
        setError('Connection error occurred');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('[Bolna] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        if (event.code !== 1000) {
          setError(`Connection closed: ${event.reason || 'Unknown reason'}`);
        }
      };

    } catch (err: any) {
      console.error('[Bolna] Connection error:', err);
      setError(`Failed to connect: ${err.message}`);
      setIsConnected(false);
    }
  }, []);

  /**
   * Disconnect from Bolna WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    stopRecording();

    setIsConnected(false);
    setTranscript('');
    transcriptRef.current = '';
    setError(null);
  }, []);

  /**
   * Play audio from Bolna
   */
  const playAudio = async (audioBlob: Blob): Promise<void> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioCtx = audioContextRef.current;
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (err) {
      console.error('[Bolna] Error playing audio:', err);
    }
  };

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to Bolna. Connect first.');
      return;
    }

    try {
      console.log('[Bolna] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      console.log('[Bolna] Microphone access granted');

      // Check for supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : 'audio/mp4';

      console.log('[Bolna] Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        console.log('[Bolna] Audio chunk available, size:', event.data.size);

        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send raw audio blob directly to Bolna
          wsRef.current.send(event.data);
        } else if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.warn('[Bolna] WebSocket not open, state:', wsRef.current?.readyState);
        }
      };

      mediaRecorder.onerror = (err) => {
        console.error('[Bolna] MediaRecorder error:', err);
        setError('Recording error occurred');
      };

      // Start recording and send chunks every 250ms for low latency
      mediaRecorder.start(250);
      console.log('[Bolna] Recording started');
      setIsRecording(true);

    } catch (err: any) {
      console.error('[Bolna] Microphone error:', err);
      setError(`Microphone access denied: ${err.message}`);
    }
  }, [isConnected]);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      console.log('[Bolna] Recording stopped');
      setIsRecording(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disconnect]);

  return {
    isConnected,
    isRecording,
    transcript,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  };
}


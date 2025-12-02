import { useRef, useState, useCallback, useEffect } from 'react';

interface VoiceCallState {
  isConnected: boolean;
  isRecording: boolean;
  transcript: string;
  error: string | null;
}

export function useVoiceCall(sessionId: string | null) {
  const [state, setState] = useState<VoiceCallState>({
    isConnected: false,
    isRecording: false,
    transcript: '',
    error: null,
  });

  const sttWsRef = useRef<WebSocket | null>(null);
  const ttsWsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptRef = useRef<string>('');

  const connect = useCallback(async () => {
    if (!sessionId) {
      console.log('[Voice] Cannot connect: no sessionId');
      return;
    }

    try {
      // Use wss:// for HTTPS, ws:// for HTTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // If port is missing, assume 3000 for dev, or standard ports for prod
      const port = window.location.port ? `:${window.location.port}` : (window.location.hostname === 'localhost' ? ':3000' : '');
      const wsBaseUrl = `${protocol}//${host}${port}/ws`;
      const sttUrl = `${wsBaseUrl}?type=stt&sessionId=${sessionId}`;
      console.log('[Voice] Window location:', {
        protocol: window.location.protocol,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port,
        wsProtocol: protocol,
        wsBaseUrl,
        sttUrl
      });

      // Connect STT WebSocket
      console.log('[Voice] Creating STT WebSocket with URL:', sttUrl);
      const sttWs = new WebSocket(sttUrl);
      sttWsRef.current = sttWs;

      console.log('[Voice] STT WebSocket created, readyState:', sttWs.readyState);

      sttWs.onopen = () => {
        console.log('[STT] Connected successfully');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      sttWs.onmessage = (event) => {
        console.log('[STT] Received message:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            const newTranscript = transcriptRef.current + ' ' + data.transcript;
            transcriptRef.current = newTranscript;
            setState(prev => ({ ...prev, transcript: newTranscript }));
          }
        } catch (e) {
          console.error('[STT] Failed to parse message:', e);
        }
      };

      sttWs.onerror = (error) => {
        console.error('[STT] WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'STT connection error', isConnected: false }));
      };

      sttWs.onclose = (event) => {
        console.log('[STT] Disconnected, code:', event.code, 'reason:', event.reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: event.code !== 1000 ? `Connection closed: ${event.reason || event.code}` : null
        }));
      };

      // Connect TTS WebSocket
      const ttsWs = new WebSocket(`${wsBaseUrl}?type=tts&sessionId=${sessionId}`);
      ttsWsRef.current = ttsWs;

      ttsWs.onopen = () => {
        console.log('[TTS] Connected');
      };

      ttsWs.onmessage = async (event) => {
        // Play audio from Sarvam TTS
        if (event.data instanceof Blob) {
          const audioBuffer = await event.data.arrayBuffer();
          playAudio(audioBuffer);
        }
      };

      ttsWs.onerror = (error) => {
        console.error('[TTS] Error:', error);
      };

      ttsWs.onclose = () => {
        console.log('[TTS] Disconnected');
      };

    } catch (error) {
      console.error('[Voice] Connection error:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, [sessionId]);

  const playAudio = async (audioBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioCtx = audioContextRef.current;
    const buffer = await audioCtx.decodeAudioData(audioBuffer);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  };

  const startRecording = useCallback(async () => {
    try {
      console.log('[Voice] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      console.log('[Voice] Microphone access granted');

      // Check for supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      console.log('[Voice] Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        console.log('[Voice] Audio chunk available, size:', event.data.size, 'WS state:', sttWsRef.current?.readyState);

        if (event.data.size > 0 && sttWsRef.current?.readyState === WebSocket.OPEN) {
          // Send raw audio blob directly
          sttWsRef.current.send(event.data);
        } else if (sttWsRef.current?.readyState !== WebSocket.OPEN) {
          console.warn('[Voice] WebSocket not open, state:', sttWsRef.current?.readyState);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error('[Voice] MediaRecorder error:', error);
      };

      mediaRecorder.start(250); // Send chunks every 250ms
      console.log('[Voice] Recording started');
      setState(prev => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error('[Voice] Microphone error:', error);
      setState(prev => ({ ...prev, error: 'Microphone access denied' }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, isRecording: false }));
    }
  }, []);

  const sendTextToSpeech = useCallback((text: string) => {
    if (ttsWsRef.current?.readyState === WebSocket.OPEN) {
      ttsWsRef.current.send(JSON.stringify({
        action: 'speak',
        text
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    stopRecording();
    sttWsRef.current?.close();
    ttsWsRef.current?.close();
    audioContextRef.current?.close();

    sttWsRef.current = null;
    ttsWsRef.current = null;
    audioContextRef.current = null;
    transcriptRef.current = '';

    setState({
      isConnected: false,
      isRecording: false,
      transcript: '',
      error: null,
    });
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextToSpeech,
    fullTranscript: transcriptRef.current,
  };
}

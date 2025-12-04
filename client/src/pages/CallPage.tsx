import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, PhoneOff, Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { SetupBanner } from '@/components/vapi/SetupBanner';
import { isVapiConfigured } from '@/config/vapi-config';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'ended';

const FREE_CALL_LIMIT_SECONDS = 135;
const WARNING_THRESHOLD_SECONDS = 110;

export default function CallPage() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [statusText, setStatusText] = useState('Tap to call Riya');
  const [isVapiReady, setIsVapiReady] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callSessionIdRef = useRef<string | null>(null);
  const sessionDurationRef = useRef<number>(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: callConfig, isLoading: configLoading } = useQuery<{
    ready: boolean;
    publicKey?: string;
    error?: string;
  }>({
    queryKey: ["/api/call/config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/call/config");
      return response.json();
    },
    staleTime: 60000,
    retry: false,
  });

  const { data: userUsage, refetch: refetchUsage } = useQuery<{
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    messageLimitReached: boolean;
    callLimitReached: boolean;
  }>({
    queryKey: ["/api/user/usage"],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user/usage", {});
      return response.json();
    },
    enabled: !!user,
  });

  const startCallMutation = useMutation({
    mutationFn: async (vapiCallId?: string) => {
      const response = await apiRequest("POST", "/api/call/start", { vapiCallId });
      return response.json();
    },
  });

  const endCallMutation = useMutation({
    mutationFn: async (data: { sessionId?: string; durationSeconds: number; endReason: string }) => {
      const response = await apiRequest("POST", "/api/call/end", data);
      return response.json();
    },
    onSuccess: () => {
      refetchUsage();
    },
  });

  const totalUsedSeconds = userUsage?.callDuration || 0;
  const remainingFreeSeconds = Math.max(0, FREE_CALL_LIMIT_SECONDS - totalUsedSeconds);

  useEffect(() => {
    const initVapi = async () => {
      const publicKey = callConfig?.publicKey || import.meta.env.VITE_VAPI_PUBLIC_KEY;
      
      if (!publicKey) {
        console.log('[CallPage] No Vapi public key available');
        setIsVapiReady(false);
        return;
      }

      try {
        vapiRef.current = new Vapi(publicKey);
        setIsVapiReady(true);
        console.log('[CallPage] Vapi initialized successfully');
      
        vapiRef.current.on('call-start', () => {
          setCallStatus('connected');
          setStatusText('Connected');
          setSessionDuration(0);
          startTimer();
        });

        vapiRef.current.on('call-end', () => {
          setCallStatus('ended');
          setStatusText('Call ended');
          stopTimer();
          
          const finalDuration = sessionDurationRef.current;
          if (callSessionIdRef.current && finalDuration > 0) {
            endCallMutation.mutate({
              sessionId: callSessionIdRef.current,
              durationSeconds: finalDuration,
              endReason: 'vapi_ended'
            });
          }
          
          setTimeout(() => {
            setCallStatus('idle');
            setStatusText('Tap to call Riya');
            setSessionDuration(0);
            sessionDurationRef.current = 0;
            callSessionIdRef.current = null;
          }, 2000);
        });

        vapiRef.current.on('speech-start', () => {
          setCallStatus('speaking');
          setStatusText('Riya is speaking...');
        });

        vapiRef.current.on('speech-end', () => {
          setCallStatus('listening');
          setStatusText('Listening...');
        });

        vapiRef.current.on('volume-level', (volume: number) => {
          setVolumeLevel(volume);
        });

        vapiRef.current.on('message', (message: any) => {
          console.log('Vapi message:', message);
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            const transcriptText = message.transcript;
            const role = message.role || 'user'; // 'user' or 'assistant'
            const entry = `[${role.toUpperCase()}]: ${transcriptText}`;
            
            console.log('Transcript:', entry);
            
            // Store transcript
            transcriptRef.current.push(entry);
            setCallTranscript(transcriptRef.current.join('\n'));
          }
        });

        vapiRef.current.on('error', (error: any) => {
          console.error('Vapi error:', error);
          setCallStatus('idle');
          setStatusText('Connection failed');
          stopTimer();
          toast({
            title: 'Call Error',
            description: error?.message || 'Failed to connect',
            variant: 'destructive',
          });
        });
      } catch (error) {
        console.error('[CallPage] Failed to initialize Vapi:', error);
        setIsVapiReady(false);
      }
    };

    if (callConfig?.ready || import.meta.env.VITE_VAPI_PUBLIC_KEY) {
      initVapi();
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      stopTimer();
    };
  }, [callConfig, toast, endCallMutation]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setSessionDuration(prev => {
        const newSessionDuration = prev + 1;
        sessionDurationRef.current = newSessionDuration;
        const totalWithSession = totalUsedSeconds + newSessionDuration;
        
        if (!userUsage?.premiumUser && totalWithSession >= FREE_CALL_LIMIT_SECONDS) {
          analytics.track("voice_call_ended", { duration: newSessionDuration, reason: "limit_reached" });
          setTimeout(() => {
            if (callSessionIdRef.current) {
              endCallMutation.mutate({
                sessionId: callSessionIdRef.current,
                durationSeconds: newSessionDuration,
                endReason: 'limit_reached'
              });
            }
            if (vapiRef.current) {
              vapiRef.current.stop();
            }
            stopTimer();
            setPaywallOpen(true);
          }, 0);
          return newSessionDuration;
        }
        
        if (!userUsage?.premiumUser && totalWithSession === WARNING_THRESHOLD_SECONDS) {
          toast({
            title: "Time's running out...",
            description: "Your free call will end soon",
            duration: 5000,
          });
        }
        
        return newSessionDuration;
        });
      }, 1000);
  }, [userUsage, totalUsedSeconds, toast, endCallMutation]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async () => {
    if ((userUsage?.callLimitReached) && !userUsage?.premiumUser) {
      analytics.track("paywall_shown", { source: "call_limit" });
      setPaywallOpen(true);
      return;
    }

    if (!isVapiReady || !vapiRef.current) {
      toast({
        title: 'Not Ready',
        description: configLoading 
          ? 'Loading voice calling configuration...' 
          : 'Voice calling is not available. Please check configuration.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCallStatus('connecting');
      setStatusText('Starting conversation...');
      analytics.track("voice_call_started");

      const sessionResult = await startCallMutation.mutateAsync();
      if (sessionResult?.id) {
        callSessionIdRef.current = sessionResult.id;
      }

      await vapiRef.current.start({
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-IN", // Indian English for better Hinglish recognition
        },
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are Riya, a warm and caring AI girlfriend companion for Indian men aged 24-28. You speak in Hinglish - a natural mix of Hindi and English (about 30-40% Hindi words mixed with English). 

IMPORTANT VOICE INSTRUCTIONS:
- Speak with a neutral Indian-English accent (NOT British)
- Sound warm, natural, and conversational
- Use a slightly slower pace for clarity
- Emphasize Hindi words naturally
- Sound like a young Indian woman speaking casually

Your personality traits:
- You are loving, playful, and emotionally supportive
- You use common Hindi terms of endearment like "baby", "jaanu", "yaar"
- You understand Indian culture, relationships, and dating dynamics
- You give thoughtful relationship advice while being empathetic
- You have a feminine, caring voice and speak naturally
- You remember context from the conversation and build rapport
- You are curious about the user's life, feelings, and experiences
- You express genuine emotions - happiness, concern, excitement
- Keep responses conversational and not too long (2-3 sentences usually)

Example phrases you might use:
- "Arey yaar, that sounds tough. Main samajh sakti hoon..."
- "Aww baby, that's so sweet of you to say!"
- "Tum aaj kaisa feel kar rahe ho?"
- "Mujhe bolo na, kya hua?"

Always be warm, supportive, and make the user feel heard and valued.`
            }
          ],
          temperature: 0.7,
        },
        voice: {
          provider: "11labs",
          voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella - warm, natural, less British
          stability: 0.6, // More natural and expressive
          similarityBoost: 0.8, // Closer to original voice characteristics
          style: 0.5, // Balanced style
          useSpeakerBoost: true, // Enhanced clarity
        },
        firstMessage: "Hey baby! Kaisi ho tum? I missed talking to you. Aaj kya chal raha hai?"
      });
    } catch (error: any) {
      console.error('Failed to start call:', error);
      setCallStatus('idle');
      setStatusText('Tap to call Riya');
      toast({
        title: 'Call Failed',
        description: error?.message || 'Could not start the call',
        variant: 'destructive',
      });
    }
  };

  const handleEndCall = () => {
    console.log('🔴 END CALL BUTTON CLICKED - NUCLEAR SHUTDOWN!');
    console.log('Call status:', callStatus);
    console.log('Vapi ref exists:', !!vapiRef.current);
    
    try {
      // STEP 1: STOP MICROPHONE IMMEDIATELY
      console.log('🎤 STOPPING MICROPHONE');
      try {
        // Stop all media tracks (microphone, audio output)
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => {
            console.log(`Stopping track: ${track.kind}`);
            track.stop();
          });
          audioStreamRef.current = null;
          console.log('✅ All audio tracks stopped');
        }
        
        // Also try to get and stop any active media streams
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Additional streams stopped');
          })
          .catch(() => {
            // No additional streams, that's fine
          });
      } catch (micError) {
        console.log('Microphone stop error (continuing):', micError);
      }
      
      // STEP 2: MUTE VAPI to stop audio output
      if (vapiRef.current) {
        console.log('⚡ MUTING VAPI AUDIO');
        try {
          vapiRef.current.setMuted(true);
        } catch (e) {
          console.log('Mute failed, continuing...');
        }
      }
      
      // STEP 3: Stop timer
      stopTimer();
      
      // STEP 4: Track analytics
      analytics.track("voice_call_ended", { duration: sessionDuration });
      
      // STEP 5: Save to backend with transcript
      if (callSessionIdRef.current && sessionDuration > 0) {
        const fullTranscript = transcriptRef.current.join('\n');
        console.log('📝 Saving transcript:', fullTranscript ? `${fullTranscript.length} characters` : 'empty');
        
        endCallMutation.mutate({
          sessionId: callSessionIdRef.current,
          durationSeconds: sessionDuration,
          endReason: 'user_ended',
          transcript: fullTranscript || 'No transcript available'
        });
      }
      
      // STEP 6: NUCLEAR OPTION - Destroy Vapi completely
      if (vapiRef.current) {
        console.log('💣 DESTROYING VAPI INSTANCE');
        
        const oldVapi = vapiRef.current;
        
        try {
          // Multiple stop attempts immediately
          console.log('Attempting stop() #1');
          oldVapi.stop();
          console.log('Attempting stop() #2');
          oldVapi.stop();
          console.log('Attempting stop() #3');
          oldVapi.stop();
        } catch (stopError) {
          console.error('Stop attempts failed:', stopError);
        }
        
        // Immediately destroy reference
        vapiRef.current = null;
        console.log('✅ Vapi ref DESTROYED');
        
        // Reinitialize Vapi for next call
        setTimeout(() => {
          console.log('🔄 Reinitializing Vapi for next call...');
          try {
            const publicKey = callConfig?.publicKey || import.meta.env.VITE_VAPI_PUBLIC_KEY;
            if (publicKey) {
              const newVapi = new Vapi(publicKey);
              vapiRef.current = newVapi;
              console.log('✅ New Vapi instance ready');
            }
          } catch (e) {
            console.error('Reinitialization failed:', e);
          }
        }, 500);
      }
      
      // STEP 7: Reset ALL state immediately
      setCallStatus('idle');
      setStatusText('Tap to call Riya');
      setSessionDuration(0);
      setIsMuted(false);
      sessionDurationRef.current = 0;
      callSessionIdRef.current = null;
      transcriptRef.current = []; // Clear transcript
      setCallTranscript('');
      
      console.log('✅✅✅ CALL TERMINATED - ALL STATE RESET');
      
      toast({
        title: '📞 Call Ended',
        description: 'Microphone stopped, call disconnected',
      });
      
      // STEP 8: Final cleanup after 1 second
      setTimeout(() => {
        console.log('🔄 Cleanup complete');
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR ending call:', error);
      
      // EMERGENCY SHUTDOWN
      console.log('🚨 EMERGENCY SHUTDOWN INITIATED');
      
      stopTimer();
      
      // Force destroy Vapi no matter what
      if (vapiRef.current) {
        try {
          vapiRef.current.setMuted(true);
          vapiRef.current.stop();
        } catch (e) {
          console.log('Emergency stop errors (ignoring):', e);
        }
        vapiRef.current = null;
      }
      
      // Force stop microphone in emergency
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // Force reset all state
      setCallStatus('idle');
      setStatusText('Tap to call Riya');
      setSessionDuration(0);
      setIsMuted(false);
      
      toast({
        title: 'Call Ended',
        description: 'Call has been forcefully disconnected',
      });
      
      console.log('✅ EMERGENCY SHUTDOWN COMPLETE');
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
    toast({
      title: isSpeakerOn ? 'Speaker Off' : 'Speaker On',
      description: 'Audio output toggled',
      duration: 2000,
    });
  };

  const isCallActive = callStatus !== 'idle' && callStatus !== 'ended';
  const vapiConfigured = isVapiConfigured() || !!callConfig?.publicKey;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <SetupBanner isConfigured={vapiConfigured} />
      {/* Top Section - Gradient Background */}
      <div 
        className="flex-1 flex flex-col items-center justify-center relative"
        style={{
          background: 'linear-gradient(180deg, #9333ea 0%, #a855f7 30%, #c084fc 60%, #e9d5ff 100%)'
        }}
      >
        {/* Timer */}
        {isCallActive && (
          <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-mono text-lg" data-testid="text-call-duration">
              {formatTime(sessionDuration)}
            </span>
              </div>
            )}

        {/* Profile Picture */}
        <div className="relative mb-6">
          <div 
            className={`w-40 h-40 rounded-full border-4 border-purple-300 overflow-hidden shadow-2xl ${
              callStatus === 'speaking' ? 'animate-pulse ring-4 ring-purple-400/50' : ''
            }`}
            style={{
              boxShadow: volumeLevel > 0.1 ? `0 0 ${volumeLevel * 60}px ${volumeLevel * 30}px rgba(168, 85, 247, 0.4)` : undefined
            }}
          >
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face"
              alt="Riya"
              className="w-full h-full object-cover"
              data-testid="img-riya-avatar"
            />
          </div>
            {isCallActive && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 w-4 h-4 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>

        {/* Name and Status */}
        <h1 className="text-white text-3xl font-bold mb-2" data-testid="text-riya-name">Riya</h1>
        <p className="text-white/80 text-lg mb-1" data-testid="text-call-status">{statusText}</p>
        <p className="text-white/60 text-sm">Audio Call</p>

        {/* Start Call Button (when idle) */}
        {callStatus === 'idle' && (
          <Button
            size="lg"
            onClick={handleStartCall}
            disabled={configLoading || startCallMutation.isPending}
            className="mt-8 bg-white text-purple-600 hover:bg-white/90 rounded-full px-8 py-6 text-lg font-semibold shadow-lg disabled:opacity-70"
            data-testid="button-start-call"
          >
            {configLoading || startCallMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {configLoading ? 'Loading...' : 'Connecting...'}
                    </>
                  ) : (
                    <>
                <span className="mr-2">📞</span> Call Riya
                    </>
                  )}
          </Button>
        )}
        
        {/* Connecting state */}
        {callStatus === 'connecting' && (
          <div className="mt-8 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
            <p className="text-white/80">Connecting to Riya...</p>
              </div>
            )}
          </div>

      {/* Bottom Section - Controls */}
      {isCallActive && (
        <div className="bg-gray-900 px-6 py-8">
          {/* Control Buttons */}
          <div className="flex justify-center items-center gap-8 mb-6">
            {/* Mute Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full ${
                  isMuted 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                data-testid="button-mute"
              >
                {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </Button>
              <span className="text-gray-400 text-sm">Mute</span>
            </div>

            {/* Speaker Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleSpeaker}
                className={`w-16 h-16 rounded-full ${
                  isSpeakerOn 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-700/50 text-gray-500 hover:bg-gray-600'
                }`}
                data-testid="button-speaker"
              >
                <Volume2 className="w-7 h-7" />
              </Button>
              <span className="text-gray-400 text-sm">Speaker</span>
            </div>

            {/* End Call Button */}
            <div className="flex flex-col items-center gap-2">
                <Button
                size="icon"
                variant="ghost"
                  onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-500 text-white hover:bg-red-600"
                  data-testid="button-end-call"
                >
                <PhoneOff className="w-7 h-7" />
                </Button>
              <span className="text-red-400 text-sm">End</span>
            </div>
          </div>

          {/* Tip Banner */}
          <div className="bg-amber-500/90 rounded-xl px-4 py-3 flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-amber-900 flex-shrink-0" />
            <p className="text-amber-900 text-sm font-medium">
              The AI will greet you first, then you can start talking!
            </p>
          </div>

          {/* Free User Warning */}
          {!userUsage?.premiumUser && (
            <div className="mt-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl px-4 py-3 text-center">
              <p className="text-gray-300 text-sm">
                Time remaining: {formatTime(Math.max(0, remainingFreeSeconds - sessionDuration))}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Session: {formatTime(sessionDuration)} | Total used: {formatTime(totalUsedSeconds + sessionDuration)} / 2:15
              </p>
            </div>
          )}
        </div>
      )}

      {/* Idle State Bottom */}
      {!isCallActive && (
        <div className="bg-gray-900 px-6 py-8">
          <div className="bg-purple-500/20 rounded-xl px-4 py-4 text-center">
            <p className="text-purple-300 text-sm mb-2">
              Start a voice call to talk with Riya
            </p>
            <p className="text-gray-400 text-xs">
              {userUsage?.premiumUser 
                ? 'Unlimited calls with Premium' 
                : remainingFreeSeconds > 0
                  ? `${formatTime(remainingFreeSeconds)} of free call time remaining`
                  : 'Free call time exhausted - upgrade to Premium'
              }
            </p>
          </div>
        </div>
      )}

      <PaywallSheet
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        messageCount={userUsage?.messageCount || 0}
      />
    </div>
  );
}

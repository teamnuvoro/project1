import { useState, useEffect, useRef } from 'react';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneOff, Mic, MicOff, Loader2, ArrowLeft } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";

export default function CallPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    isConnected,
    isRecording,
    transcript,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    fullTranscript,
  } = useVoiceCall(sessionId);

  // Fetch user usage stats
  const { data: userUsage } = useQuery<{
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

  // Timer for call duration and limits
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isCallActive && !userUsage?.premiumUser) {
      interval = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;

          // Soft warning at 1:50 (110 seconds)
          if (newDuration === 110) {
            toast({
              title: "Time's running out...",
              description: "Your free call will end soon...",
              duration: 5000,
            });
          }

          // Hard limit at 2:15 (135 seconds)
          if (newDuration >= 135) {
            handleEndCall();
            setPaywallOpen(true);
            return 0; // Reset or stop
          }

          return newDuration;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isCallActive, userUsage, toast]);

  // Connect WebSockets when sessionId becomes available
  useEffect(() => {
    if (sessionId && isCallActive) {
      connect();
    }
  }, [sessionId, isCallActive, connect]);

  const startCallMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/call/start');
      return response.json();
    },
    onSuccess: (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
      setIsCallActive(true);
      setCallDuration(userUsage?.callDuration || 0); // Start from existing duration if any? Actually usage is total, we might want session duration. 
      // For simplicity, let's assume we count from 0 for this session, but we should probably respect total usage if we want to be strict.
      // However, the PRD says "2m 15s of call time" which usually implies total free time.
      // Let's stick to the local timer for the "session limit" aspect or sync with total.
      // If userUsage.callDuration is total used, we should start from there?
      // The PRD says "User gets 2 minutes 15 seconds of free call time."
      // So yes, we should account for previous usage.
      if (userUsage && !userUsage.premiumUser) {
        setCallDuration(userUsage.callDuration);
      } else {
        setCallDuration(0);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Call Failed',
        description: error.message || 'Unable to start call',
        variant: 'destructive',
      });
      if (error.message?.includes("limit")) {
        setPaywallOpen(true);
      }
    },
  });

  const endCallMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session ID');

      const response = await apiRequest('POST', '/api/call/end', {
        sessionId,
      });
      return response.json();
    },
    onSuccess: (data: { success: boolean; summary: any }) => {
      disconnect();
      setIsCallActive(false);
      setSessionId(null);

      toast({
        title: 'Call Ended',
        description: 'Your conversation summary has been saved',
      });

      // Show summary in console for now (could display in UI)
      console.log('Call Summary:', data.summary);
    },
    onError: (error: any) => {
      toast({
        title: 'Error Ending Call',
        description: error.message || 'Failed to save call summary',
        variant: 'destructive',
      });
    },
  });

  const handleStartCall = () => {
    if ((userUsage?.callLimitReached || userUsage?.messageLimitReached) && !userUsage?.premiumUser) {
      analytics.track("paywall_shown", { source: "call_limit" });
      setPaywallOpen(true);
      return;
    }
    analytics.track("voice_call_started");
    startCallMutation.mutate();
  };

  const handleEndCall = () => {
    analytics.track("voice_call_ended", { duration: callDuration });
    endCallMutation.mutate();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-to-chat">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <CardTitle className="flex-1 text-center">Voice Call with Riya</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Call Status */}
          <div className="text-center">
            {!isCallActive && (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Start a voice call to talk with your relationship coach
                </p>
              </div>
            )}

            {isCallActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {isConnected ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Connecting...</span>
                    </>
                  )}
                </div>
                {!userUsage?.premiumUser && (
                  <p className="text-xs text-muted-foreground">
                    Free time used: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')} / 2:15
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Transcript Display */}
          {isCallActive && transcript && (
            <div className="p-4 bg-muted rounded-md max-h-32 overflow-y-auto">
              <p className="text-sm text-muted-foreground">Live Transcript:</p>
              <p className="text-sm mt-1">{transcript}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Call Controls */}
          <div className="flex gap-3 justify-center">
            {!isCallActive ? (
              <Button
                size="lg"
                onClick={handleStartCall}
                disabled={startCallMutation.isPending}
                className="gap-2"
                data-testid="button-start-call"
              >
                {startCallMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
                Start Call
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant={isRecording ? 'default' : 'outline'}
                  onClick={toggleRecording}
                  disabled={!isConnected}
                  className="gap-2"
                  data-testid="button-toggle-recording"
                >
                  {isRecording ? (
                    <>
                      <Mic className="w-5 h-5" />
                      Recording
                    </>
                  ) : (
                    <>
                      <MicOff className="w-5 h-5" />
                      Muted
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleEndCall}
                  disabled={endCallMutation.isPending}
                  className="gap-2"
                  data-testid="button-end-call"
                >
                  {endCallMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <PhoneOff className="w-5 h-5" />
                  )}
                  End Call
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            {!isCallActive ? (
              <p>Press "Start Call" to begin your voice conversation</p>
            ) : (
              <p>Click the microphone to toggle recording</p>
            )}
          </div>
        </CardContent>
      </Card>
      <PaywallSheet
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        messageCount={userUsage?.messageCount || 0}
      />
    </div>
  );
}

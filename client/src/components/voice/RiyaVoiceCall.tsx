import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { getVapi, startCall, stopCall } from '@/lib/vapiCallManager';
import { getProtectedCallConfig, validateCallConfig, assertVoiceCallIntegrity } from '@/lib/voiceCallProtection';

const FREE_CALL_LIMIT_SECONDS = 80; // 1 min 20 sec for free users

interface RiyaVoiceCallProps {
  userId: string;
  onCallEnd?: () => void;
  /** Free users: seconds remaining in their allowance (e.g. 80 - totalUsed). */
  remainingFreeSeconds?: number;
  /** Call when free user hits time limit so parent can show paywall. */
  onPaywallOpen?: () => void;
  isPremium?: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RiyaVoiceCall({ userId, onCallEnd, remainingFreeSeconds = FREE_CALL_LIMIT_SECONDS, onPaywallOpen, isPremium = false }: RiyaVoiceCallProps) {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "started" | "ended">("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isBillingError, setIsBillingError] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // 🔒 PROTECTION: Verify voice call integrity on mount
  useEffect(() => {
    try {
      assertVoiceCallIntegrity();
      console.log('[RiyaVoiceCall] ✅ Voice call protection verified');
    } catch (error: any) {
      console.error('[RiyaVoiceCall] ❌ CRITICAL: Voice call protection failed!', error.message);
      toast({
        title: "Voice Call Error",
        description: "Voice call configuration is invalid. Please check VOICE_CALL_LOCK.md",
        variant: "destructive",
        duration: 10000
      });
    }
  }, [toast]);

  // Setup event listeners using global singleton
  useEffect(() => {
    const vapi = getVapi();

    const handleCallStart = () => {
      console.log("[RiyaVoiceCall] Call Started");
      setStatus("connected");
      setConnectionError(null);
      setSessionDuration(0);
    };

    const handleCallEnd = () => {
      console.log("[RiyaVoiceCall] Call Ended");
      setStatus("disconnected");
      setSessionDuration(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (onCallEnd) onCallEnd();
    };

    const handleError = (error: any) => {
      console.error("[RiyaVoiceCall] ===== ERROR EVENT =====");
      console.error("[RiyaVoiceCall] Error Type:", error?.constructor?.name);
      console.error("[RiyaVoiceCall] Error Message:", error?.message);
      console.error("[RiyaVoiceCall] Error Status:", error?.status);
      console.error("[RiyaVoiceCall] Error Code:", error?.code);
      console.error("[RiyaVoiceCall] Error Type (from error.type):", error?.type);
      console.error("[RiyaVoiceCall] Error Stage (from error.stage):", error?.stage);
      console.error("[RiyaVoiceCall] Full Error Object:", error);
      console.error("[RiyaVoiceCall] Error JSON:", JSON.stringify(error, null, 2));
      console.error("[RiyaVoiceCall] ========================");
      
      setStatus("disconnected");
      
      // Extract user-friendly error message from nested error structure
      let errorMessage = "Lost connection to voice server";
      let errorTitle = "Connection Error";
      let isBillingIssue = false;
      
      // CRITICAL: Detect wallet balance errors from multiple possible paths
      // Vapi returns billing errors as 400 Bad Request, not 402/403
      const errorMessageText = 
        error?.error?.message?.message || 
        error?.error?.error?.message || 
        error?.error?.message ||
        error?.message ||
        '';
      
      // Check for wallet balance error (the real root cause)
      if (typeof errorMessageText === 'string') {
        const walletBalancePatterns = [
          'Wallet Balance',
          'Purchase More Credits',
          'Upgrade Your Plan',
          'insufficient',
          'balance'
        ];
        
        const isWalletError = walletBalancePatterns.some(pattern => 
          errorMessageText.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isWalletError) {
          isBillingIssue = true;
          errorTitle = "Voice Temporarily Unavailable";
          errorMessage = "Please add credits to your Vapi account to continue making calls. Visit your Vapi dashboard to recharge.";
        } else if (errorMessageText) {
          errorMessage = errorMessageText;
        }
      }
      
      // Set billing error flag to prevent automatic retries
      setIsBillingError(isBillingIssue);
      setConnectionError(errorMessage);
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: isBillingIssue ? 10000 : 6000 // Show longer for billing errors
      });
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("error", handleError);

    // Cleanup on unmount
    return () => {
      stopCall();
      if (vapi) {
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("error", handleError);
      }
    };
  }, [onCallEnd, toast]);

  // Timer: count up during call; for free users, end call and show paywall at limit
  useEffect(() => {
    if (status !== "connected") return;
    timerRef.current = setInterval(() => {
      setSessionDuration((prev) => {
        const next = prev + 1;
        if (!isPremium && next >= remainingFreeSeconds) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          stopCall();
          setStatus("disconnected");
          setSessionDuration(0);
          toast({
            title: "Free call limit reached",
            description: "Upgrade to Premium for unlimited calls.",
            variant: "destructive",
            duration: 5000,
          });
          onPaywallOpen?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, isPremium, remainingFreeSeconds, onPaywallOpen, toast]);

  const handleStartCall = async () => {
    if (status === "connecting" || status === "connected") {
      console.log('[RiyaVoiceCall] Call already active, ignoring start request');
      return;
    }

    // Prevent retries when it's a billing error (will never succeed)
    if (isBillingError) {
      toast({
        title: "Billing Issue",
        description: "Please add credits to your Vapi account. Retrying will not work until credits are added.",
        variant: "destructive",
        duration: 8000
      });
      return;
    }

    try {
      setStatus("connecting");
      setConnectionError(null);
      setIsBillingError(false); // Reset billing error flag on new attempt

      // ⚠️ PROTECTED: Use locked voice call config
      // DO NOT modify this - use getProtectedCallConfig() instead
      assertVoiceCallIntegrity(); // Verify protection layer is intact
      
      // Get the locked, working configuration
      const callConfig = getProtectedCallConfig();
      
      // Validate the config before using it (double protection)
      validateCallConfig(callConfig);
      
      console.log("[RiyaVoiceCall] ✅ Using PROTECTED voice call config");
      console.log("[RiyaVoiceCall] Starting call with config:", JSON.stringify(callConfig, null, 2));
      await startCall(callConfig);

    } catch (err: any) {
      console.error("[RiyaVoiceCall] Failed to start call:", err);
      setStatus("disconnected");
      
      const errorMessage = err?.message || "Failed to start call";
      setConnectionError(errorMessage);
      
      toast({
        title: "Connection Failed",
        description: errorMessage.includes('400') 
          ? "Invalid call configuration. Please check settings."
          : "Failed to start call. Tap to retry.",
        variant: "destructive"
      });
    }
  };

  const handleEndCall = () => {
    try {
      console.log("[RiyaVoiceCall] Ending call");
      stopCall();
      setStatus("disconnected");
      setConnectionError(null);
    } catch (err) {
      console.error("[RiyaVoiceCall] Error ending call:", err);
    }
  };

  const toggleMute = () => {
    const vapi = getVapi();
    if (!vapi || status !== "connected") return;
    
    const newMutedState = !isMuted;
    try {
      vapi.setMuted(newMutedState);
      setIsMuted(newMutedState);
    } catch (err) {
      console.error("[RiyaVoiceCall] Error toggling mute:", err);
    }
  };

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isDisconnected = status === "disconnected" || status === "ended";
  const remainingSeconds = !isPremium ? Math.max(0, remainingFreeSeconds - sessionDuration) : null;

  return (
    <div className="flex flex-col h-full w-full items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative">
      {/* Back Button - Top Left */}
      <Link href="/chat">
        <button
          className="absolute top-4 left-4 sm:top-6 sm:left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-50"
          title="Back to Chat"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </Link>

      {/* Call timer - visible when connected */}
      {isConnected && (
        <div className={`absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full px-4 py-2 flex items-center gap-2 z-50 ${!isPremium ? 'bg-amber-500/90' : 'bg-black/30 backdrop-blur-sm'}`}>
          <span className="text-white font-mono text-xl font-semibold" data-testid="call-timer">
            {formatTime(sessionDuration)}
          </span>
          {remainingSeconds !== null && (
            <span className="text-white/90 text-sm">
              ({formatTime(remainingSeconds)} left)
            </span>
          )}
        </div>
      )}

      {/* iPhone-Style Call Screen Layout */}
      <div className="flex flex-col items-center justify-center w-full max-w-sm">
        
        {/* Large Central Avatar - iPhone Call Style */}
        <div className="mb-8 sm:mb-12">
          <button
            onClick={isDisconnected ? handleStartCall : undefined}
            disabled={!isDisconnected}
            className={`relative group transition-all duration-300 ${
              isDisconnected ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
            }`}
          >
            {/* Avatar Container with iPhone-style styling */}
            <div className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden ${
              isConnected ? 'ring-4 ring-pink-400/30' : ''
            }`}
            style={{
              boxShadow: isConnected 
                ? '0 0 40px rgba(236, 72, 153, 0.4), 0 0 80px rgba(236, 72, 153, 0.2)'
                : '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}>
              {/* Subtle pink border ring */}
              <div className="absolute inset-0 rounded-full border-2 border-pink-300/40 pointer-events-none" />
              
              {/* Image */}
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face"
                alt="Riya"
                className="w-full h-full object-cover"
              />
              
              {/* Soft glow overlay when connected */}
              {isConnected && (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 to-purple-400/20 pointer-events-none animate-pulse" />
              )}
            </div>

            {/* Pulse animation ring when connected */}
            {isConnected && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-pink-400/50 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-pink-400/30 animate-pulse" />
              </>
            )}

            {/* Connecting overlay */}
            {isConnecting && (
              <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Name - iPhone Style Typography */}
        <h1 className="text-white text-4xl sm:text-5xl font-light mb-2 tracking-tight">
          Riya
        </h1>

        {/* Status Text */}
        <div className="mb-12 sm:mb-16">
          {isConnecting && (
            <p className="text-white/70 text-lg sm:text-xl font-light">Connecting...</p>
          )}
          {isConnected && (
            <p className="text-white/70 text-lg sm:text-xl font-light">Connected</p>
          )}
          {isDisconnected && (
            <p className="text-white/60 text-base sm:text-lg font-light">
              {isBillingError 
                ? "Please add credits to continue" 
                : connectionError 
                  ? "Connection failed. Tap to retry." 
                  : "Ready to call"}
            </p>
          )}
        </div>

        {/* Call Controls - iPhone Style Bottom Bar */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 w-full">
          {isConnected && (
            <>
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isMuted
                    ? 'bg-red-500/20 border-2 border-red-400/50'
                    : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
                }`}
                style={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              >
                {isMuted ? (
                  <MicOff className="w-7 h-7 sm:w-8 sm:h-8 text-red-300" />
                ) : (
                  <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                )}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  boxShadow: '0 8px 30px rgba(239, 68, 68, 0.4)',
                }}
              >
                <PhoneOff className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


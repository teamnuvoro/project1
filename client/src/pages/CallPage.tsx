/**
 * CallPage with Daily.co Integration
 * Replaces Vapi with Daily.co for sub-500ms latency voice calls
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from "@/contexts/AuthContext";
import RiyaVoiceCall from '@/components/voice/RiyaVoiceCall';
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { useToast } from '@/hooks/use-toast';

export default function CallPage() {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: userUsage } = useQuery<{
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    messageLimitReached: boolean;
    callLimitReached: boolean;
  }>({
    queryKey: ["/api/user/usage", "call", user?.id],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user/usage", { userId: user?.id });
      return response.json();
    },
    enabled: !!user?.id,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const FREE_CALL_LIMIT_SECONDS = 135;
  const remainingFreeSeconds = Math.max(0, FREE_CALL_LIMIT_SECONDS - (userUsage?.callDuration || 0));

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top Section - Gradient Background */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative"
        style={{
          background: 'linear-gradient(180deg, #9333ea 0%, #a855f7 30%, #c084fc 60%, #e9d5ff 100%)'
        }}
      >
        {/* Profile Picture */}
        <div className="relative mb-6">
          <div className="w-40 h-40 rounded-full border-4 border-purple-300 overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face"
              alt="Riya"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name and Status */}
        <h1 className="text-white text-3xl font-bold mb-2">Riya</h1>
        <p className="text-white/80 text-lg mb-1">Your AI Girlfriend</p>
        <p className="text-white/60 text-sm">Sub-500ms Latency Voice Calls</p>

        {/* Daily.co Voice Call Component */}
        <div className="mt-8 w-full max-w-2xl px-4">
          <RiyaVoiceCall 
            userId={user?.id || '00000000-0000-0000-0000-000000000001'}
            onCallEnd={() => {
              toast({
                title: "Call Ended",
                description: "Thanks for talking with Riya!",
              });
            }}
          />
        </div>
      </div>

      {/* Bottom Section - Info */}
      <div className="bg-gray-900 px-6 py-8">
        <div className="bg-purple-500/20 rounded-xl px-4 py-4 text-center">
          <p className="text-purple-300 text-sm mb-2">
            Experience human-like voice conversations with Riya
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

      <PaywallSheet
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        messageCount={userUsage?.messageCount || 0}
      />
    </div>
  );
}

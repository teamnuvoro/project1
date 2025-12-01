import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Phone, Video, Volume2, VolumeX } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ChatHeaderProps {
  sessionId?: string;
  voiceModeEnabled?: boolean;
  onVoiceModeToggle?: () => void;
  onPaymentClick?: () => void;
  onAnalyzeClick?: () => void;
  userUsage?: {
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    messageLimitReached?: boolean;
    callLimitReached?: boolean;
  };
}

export function ChatHeader({ sessionId, voiceModeEnabled, onVoiceModeToggle, onPaymentClick, onAnalyzeClick, userUsage: userUsageProp }: ChatHeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const { data: userUsage } = useQuery<{
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
  }>({
    queryKey: ["/api/user/usage", "header"],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user/usage", {});
      return response.json();
    },
  });

  const finalUserUsage = userUsageProp || userUsage;

  return (
    <header className="gradient-header text-white px-4 py-3 flex items-center justify-between shadow-lg">
      {/* Left: Back button and Avatar */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
              alt="Riya"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="text-chat-title">Riya</h1>
            <p className="text-xs text-white/80">Online</p>
          </div>
        </div>
      </div>

      {/* Right: Call icons */}
      <div className="flex items-center gap-2">
        <Link href="/call">
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            data-testid="button-voice-call"
          >
            <Phone className="w-5 h-5" />
          </button>
        </Link>
        <button 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          onClick={onVoiceModeToggle}
          data-testid="button-video-call"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

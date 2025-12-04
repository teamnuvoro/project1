import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Phone, Video, Volume2, VolumeX, Sparkles } from "lucide-react";
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
    <header className="gradient-header text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-lg relative overflow-hidden w-full">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 animate-gradient opacity-100"></div>
      <div className="relative z-10 w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back button and Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <Link href="/">
            <button 
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm flex-shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white/40 shadow-lg ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:scale-105 flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="Riya"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-base sm:text-lg truncate" data-testid="text-chat-title">Riya</h1>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0"></div>
                <p className="text-xs text-white/90 truncate">Online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Analyze My Type and Call icons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Link href="/analytics">
            <button 
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-300 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium backdrop-blur-sm hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              data-testid="button-analyze-type"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden md:inline">Analyze My Type</span>
            </button>
          </Link>
          <Link href="/call">
            <button 
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm flex-shrink-0"
              data-testid="button-voice-call"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Link>
          <button 
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm flex-shrink-0"
            onClick={onVoiceModeToggle}
            data-testid="button-video-call"
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

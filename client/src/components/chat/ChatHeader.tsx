import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Phone, Video, MoreVertical, Crown, LogOut, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PersonaSelector } from "@/components/PersonaSelector";
import { motion, AnimatePresence } from "framer-motion";

interface ChatHeaderProps {
  sessionId?: string;
  voiceModeEnabled?: boolean;
  onVoiceModeToggle?: () => void;
  onPaymentClick?: () => void;
  onAnalyzeClick?: () => void;
  hideAnalytics?: boolean;
  userUsage?: {
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    subscriptionPlan?: string;
    messageLimitReached?: boolean;
    callLimitReached?: boolean;
  };
  onOpenPaywall?: () => void; // Callback to open paywall from parent
}

export function ChatHeader({ sessionId, voiceModeEnabled, onVoiceModeToggle, onPaymentClick, onAnalyzeClick, hideAnalytics = false, userUsage: userUsageProp, onOpenPaywall }: ChatHeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout, refetchUser } = useAuth();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { data: userUsage } = useQuery<{
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    subscriptionPlan?: string;
  }>({
    queryKey: ["/api/user/usage", "header", user?.id],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user/usage", { userId: user?.id });
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 30000, // Cache for 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    // Only poll if user is NOT premium
    refetchInterval: (query) => {
      const data = query.state.data;
      const isPremium = data?.premiumUser === true;
      return isPremium ? false : 15000; // Poll every 15s if not premium
    },
  });

  /* Force default to false so badge ONLY shows for active Dodo subscriptions */
  // ONLY use API response - DO NOT use user.premium_user from AuthContext (may be stale)
  // Prioritize prop (from ChatPage) over local query to ensure consistency
  const finalUserUsage = userUsageProp || userUsage;
  // STRICT CHECK: Only show premium if BOTH conditions are true:
  // 1. API explicitly returns premiumUser === true
  // 2. subscriptionPlan is defined (meaning there's an active subscription)
  const isPremium = (finalUserUsage?.premiumUser === true) && (finalUserUsage?.subscriptionPlan !== undefined);
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 [ChatHeader] Premium Status:', {
      userUsageProp: userUsageProp?.premiumUser,
      userUsage: userUsage?.premiumUser,
      isPremium,
      subscriptionPlan: finalUserUsage?.subscriptionPlan
    });
  }, [userUsageProp, userUsage, isPremium, finalUserUsage]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    window.location.href = '/login';
  };

  // Calculate menu position when opening
  useEffect(() => {
    if (isMenuOpen && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8, // 8px = mt-2 equivalent
        right: window.innerWidth - rect.right - window.scrollX, // Calculate from right edge
      });
    }
  }, [isMenuOpen]);

  return (
    <header className="gradient-header text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-lg relative overflow-hidden w-full flex-shrink-0">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 animate-gradient opacity-100"></div>
      
      <div className="relative z-10 w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Persona Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <PersonaSelector 
            currentPersona={user?.persona} 
            compact={true}
            onPersonaChange={async (personaId) => {
              console.log('[ChatHeader] Persona changed to:', personaId);
              const personaChangeEvent = new CustomEvent('personaChanged', { 
                detail: { personaId } 
              });
              window.dispatchEvent(personaChangeEvent);
              await refetchUser();
              queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
              queryClient.invalidateQueries({ queryKey: ["messages", user?.id] });
            }}
          />
        </div>

        {/* Center: Avatar, Name, Premium Badge, Online Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white/40 shadow-lg ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:scale-105 flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
              alt="Riya"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base sm:text-lg truncate" data-testid="text-chat-title">Riya</h1>
              {isPremium ? (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold tracking-wide shadow-sm flex-shrink-0">
                  {finalUserUsage?.subscriptionPlan
                    ? `PREMIUM (${finalUserUsage.subscriptionPlan.toUpperCase()})`
                    : 'PREMIUM'}
                </span>
              ) : (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold tracking-wide border border-white/30 flex-shrink-0">
                  FREE PLAN
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 opacity-90">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0"></div>
              <p className="text-xs text-white/90 truncate">Online</p>
            </div>
          </div>
        </div>

        {/* Right: Call icon and 3-dot menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Link href="/call">
            <button
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm flex-shrink-0"
              data-testid="button-voice-call"
              title="Voice Call"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Link>
          
          {/* 3-Dot Menu */}
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm flex-shrink-0"
              title="More options"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-[9998]" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  
                  {/* Menu Content */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="fixed w-56 bg-white rounded-lg shadow-2xl z-[9999] border-2 border-gray-300 overflow-hidden"
                    style={{
                      top: `${menuPosition.top}px`,
                      right: `${menuPosition.right}px`,
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div className="py-2">
                      {/* Subscription Section */}
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subscription</p>
                        <p className="text-sm font-medium text-gray-900">
                          {isPremium 
                            ? finalUserUsage?.subscriptionPlan
                              ? `Premium (${finalUserUsage.subscriptionPlan.charAt(0).toUpperCase() + finalUserUsage.subscriptionPlan.slice(1)})`
                              : 'Premium'
                            : 'Free Plan'}
                        </p>
                      </div>
                      
                      {/* Try Premium Now - Show for all users (paywall is integrated) */}
                      <button
                        onClick={() => {
                          console.log('💰 Try Premium Now clicked');
                          setIsMenuOpen(false);
                          // Use parent callback if provided, otherwise use onPaymentClick
                          if (onOpenPaywall) {
                            console.log('💰 Calling onOpenPaywall');
                            onOpenPaywall();
                          } else if (onPaymentClick) {
                            console.log('💰 Calling onPaymentClick');
                            onPaymentClick();
                          } else {
                            console.error('💰 No paywall callback available!');
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 border-b border-gray-100"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Try Premium Now</span>
                      </button>
                      
                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        data-testid="nav-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

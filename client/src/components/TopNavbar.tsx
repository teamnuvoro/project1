import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Phone,
  Video,
  MoreVertical,
  Settings,
  LogOut,
  Crown,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackModal } from "@/components/FeedbackModal";
import { PersonaSelector } from "@/components/PersonaSelector";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const actionItems = [
  { title: "Voice Call", url: "/call", icon: Phone },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function TopNavbar() {
  const [location, setLocation] = useLocation();
  const { logout, user, refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const isChatPage = location === '/chat';

  // Fetch user usage for chat page
  const { data: userUsage } = useQuery<{
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    subscriptionPlan?: string;
  }>({
    queryKey: ["/api/user/usage", "navbar", user?.id],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user/usage", { userId: user?.id });
      return response.json();
    },
    enabled: !!user?.id && isChatPage, // Only fetch on chat page when user is logged in
  });

  const isPremium = user?.premium_user || userUsage?.premiumUser || false;

  const handleLogout = async () => {
    console.log('🚪 Logout button clicked!');
    setIsDropdownOpen(false);
    await logout();
    console.log('✅ Logout complete, redirecting...');
    // Redirect to signup page
    window.location.href = '/login';
  };

  const handleUpgradeClick = () => {
    const paywallEvent = new CustomEvent('openPaywall');
    window.dispatchEvent(paywallEvent);
  };

  // Calculate remaining messages/credits
  const remainingCredits = isPremium ? 'Unlimited' : userUsage?.messageCount !== undefined 
    ? Math.max(0, 1000 - (userUsage.messageCount || 0))
    : 200;

  return (
    <nav
      className="fixed top-0 left-0 right-0 h-[60px] z-50"
      style={{
        background: '#FF69B4', // Solid pink background
      }}
    >
      <div className="h-full w-full px-4 flex items-center justify-between">
        {/* Left: Profile Section */}
        <div className="flex items-center gap-3">
          {/* Profile Circle with Riya text inside */}
          <div className="relative flex-shrink-0">
            <div
              className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center"
              style={{
                background: '#FF69B4',
              }}
            >
              <span className="text-white font-bold text-sm">Riya</span>
            </div>
            {/* Green dot for active status - positioned bottom-right */}
            <div 
              className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
              style={{ borderColor: '#FF69B4' }}
            ></div>
          </div>

          {/* Name and Status */}
          <div className="flex flex-col">
            <span className="text-white font-semibold text-base leading-tight">
              Riya
            </span>
            <span className="text-white text-xs flex items-center gap-1 leading-tight">
              <span className="text-green-400 text-[10px]">●</span>
              Active now
            </span>
          </div>

          {/* Persona Selector Dropdown */}
          <div className="ml-2">
            <PersonaSelector 
              currentPersona={user?.persona} 
              compact={true}
              onPersonaChange={async (personaId) => {
                console.log('[TopNavbar] Persona changed to:', personaId);
                // Immediately dispatch event to notify ChatPage
                const personaChangeEvent = new CustomEvent('personaChanged', { 
                  detail: { personaId } 
                });
                window.dispatchEvent(personaChangeEvent);
                console.log('[TopNavbar] Dispatched personaChanged event with personaId:', personaId);
                
                // Refetch user to get updated persona immediately
                await refetchUser();
                console.log('[TopNavbar] User refetched after persona change');
                // Invalidate chat messages to refresh with new persona
                queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
                queryClient.invalidateQueries({ queryKey: ["messages", user?.id] });
              }}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Voice Call Button */}
          <Link href="/call">
            <button
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors flex-shrink-0"
              title="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
          </Link>

          {/* Dropdown Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Dropdown Menu Content */}
            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]"
                    onClick={() => setIsDropdownOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-50 border border-white/40 overflow-hidden py-2 ring-1 ring-black/5"
                  >



                    {/* Settings */}
                    <Link href="/settings">
                      <button
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                          <Settings className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-sm">Settings</span>
                      </button>
                    </Link>

                    {/* Admin Analytics - Password protected, visible to all */}
                    <>
                      <div className="h-px bg-gray-100 my-1 mx-4"></div>
                      <Link href="/admin/analytics">
                        <button
                          onClick={() => {
                            analytics.track('navbar_click', {
                              destination: 'admin_analytics',
                              user_type: user?.premium_user ? 'premium' : 'free'
                            });
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                        >
                          <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">Admin Analytics</span>
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">Password Protected</span>
                          </div>
                        </button>
                      </Link>
                    </>

                    <div className="h-px bg-gray-100 my-1 mx-4"></div>

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 group"
                    >
                      <div className="p-2 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm">Logout</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <style>{`
        .navbar-gradient {
          background: linear-gradient(135deg, #8B4FB8 0%, #E94B9F 100%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .profile-pic {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid white;
          object-fit: cover;
        }

        @media (max-width: 640px) {
          .profile-pic {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        triggerContext="manual"
      />
    </nav>
  );
}

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
  Heart,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const actionItems = [
  { title: "Voice Call", url: "/call", icon: Phone },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function TopNavbar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const isChatPage = location === '/chat';
  const isCallPage = location === '/call';

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
    window.location.href = '/signup';
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
      className="fixed top-0 left-0 right-0 h-[60px] z-50 safe-area-inset-top"
      style={{
        background: '#FF69B4', // Solid pink background
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        height: 'calc(60px + var(--safe-area-inset-top, 0px))',
      }}
    >
      <div className="h-full w-full px-3 sm:px-4 flex items-center justify-between max-w-full overflow-hidden">
        {/* Left: Back Button (Call Page) or Profile Section (Other Pages) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {isCallPage ? (
            /* Back Button for Call Page */
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/chat')}
              className="p-2 rounded-full text-white hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Back to Chat"
              aria-label="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          ) : (
            <>
              {/* Profile Circle with Riya text inside */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white flex items-center justify-center"
                  style={{
                    background: '#FF69B4',
                  }}
                >
                  <span className="text-white font-bold text-xs sm:text-sm">Riya</span>
                </div>
                {/* Green dot for active status - positioned bottom-right */}
                <div 
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"
                  style={{ borderColor: '#FF69B4' }}
                ></div>
              </div>

              {/* Name and Status - Hidden on very small screens */}
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-white font-semibold text-sm sm:text-base leading-tight truncate">
                  Riya
                </span>
                <span className="text-white text-[10px] sm:text-xs flex items-center gap-1 leading-tight">
                  <span className="text-green-400 text-[8px] sm:text-[10px]">●</span>
                  <span className="truncate">Active now</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Credits and Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* ₹200 Left with heart icon - Smaller on mobile */}
          {isChatPage && (
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                ₹{typeof remainingCredits === 'number' ? remainingCredits : '200'}
              </span>
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white flex-shrink-0" />
            </div>
          )}

          {/* Voice Call Button - Larger touch target on mobile */}
          <Link href="/call">
            <button
              className="p-2.5 sm:p-2 rounded-full text-white hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Voice Call"
              aria-label="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
          </Link>

          {/* Dropdown Menu Trigger - Larger touch target on mobile */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2.5 sm:p-2 rounded-full text-white hover:bg-white/20 active:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="More options"
              aria-label="More options"
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
                    className="absolute right-0 top-full mt-2 sm:mt-3 w-72 sm:w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-50 border border-white/40 overflow-hidden py-2 ring-1 ring-black/5"
                  >
                    {/* Relationship Profile */}
                    <Link href="/summary">
                      <button className="w-full px-4 py-3 text-left text-gray-700 hover:bg-pink-50 transition-colors flex items-center gap-3 group">
                        <div className="text-pink-500 p-2 bg-pink-100 rounded-full group-hover:bg-pink-200 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                        <span className="font-medium text-sm">Relationship Profile</span>
                      </button>
                    </Link>

                    <div className="h-px bg-gray-100 my-1 mx-4"></div>



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

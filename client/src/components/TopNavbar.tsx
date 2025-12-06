import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Phone,
  Video,
  MoreVertical,
  Settings,
  LogOut,
  Crown,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

const actionItems = [
  { title: "Voice Call", url: "/call", icon: Phone },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function TopNavbar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    console.log('🚪 Logout button clicked!');
    setIsDropdownOpen(false);
    await logout();
    console.log('✅ Logout complete, redirecting...');
    // Redirect to signup page
    window.location.href = '/signup';
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 h-[60px] z-50 shadow-md"
      style={{
        background: 'linear-gradient(135deg, #8B4FB8 0%, #E94B9F 100%)',
      }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Left: Profile Section */}
        <Link href="/chat">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
            {/* Profile Picture */}
            <div
              className="w-11 h-11 rounded-full border-2 border-white flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #8B4FB8 0%, #E94B9F 100%)',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="Riya"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-white font-bold text-lg">RI</span>';
                }}
              />
            </div>

            {/* Name and Status */}
            <div className="flex flex-col">
              <span className="text-white font-semibold text-base leading-tight">
                Riya
              </span>
              <span className="text-white text-xs opacity-80 flex items-center gap-1">
                <span className="text-green-400 text-[10px]">●</span>
                Online
              </span>
            </div>
          </div>
        </Link>

        {/* Right: Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Voice Call Button (Visible) */}
          <Link href="/call">
            <button
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              title="Voice Call"
            >
              <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
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
                    {/* Relationship Profile */}
                    <Link href="/summary">
                      <button className="w-full px-4 py-3 text-left text-gray-700 hover:bg-pink-50 transition-colors flex items-center gap-3 group">
                        <div className="text-pink-500 p-2 bg-pink-100 rounded-full group-hover:bg-pink-200 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                        <span className="font-medium text-sm">Relationship Profile</span>
                      </button>
                    </Link>

                    {/* Premium */}
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        const paywallEvent = new CustomEvent('openPaywall');
                        window.dispatchEvent(paywallEvent);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-700 hover:bg-yellow-50 transition-colors flex items-center gap-3 group"
                    >
                      <div className="p-2 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition-colors">
                        <Crown className="w-4 h-4 text-yellow-600" />
                      </div>
                      <span className="font-medium text-sm">Upgrade to Premium</span>
                    </button>

                    {/* Gallery */}
                    <Link href="/gallery">
                      <button
                        onClick={() => {
                          analytics.track('navbar_click', {
                            destination: 'gallery',
                            user_type: user?.premium_user ? 'premium' : 'free'
                          });
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                          <ImageIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">Private Gallery</span>
                          <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wide">New Content</span>
                        </div>
                      </button>
                    </Link>

                    <div className="h-px bg-gray-100 my-1 mx-4"></div>

                    {/* Memories */}
                    <Link href="/memories">
                      <button
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                          <Video className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-sm">Memories</span>
                      </button>
                    </Link>

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
    </nav>
  );
}

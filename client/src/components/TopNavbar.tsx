import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Phone,
  Video,
  MoreVertical,
  Settings,
  LogOut,
  Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

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
          {/* Relationship Profile Button */}
          <Link href="/summary">
            <button
              className="px-3 py-2 bg-white/95 hover:bg-white rounded-full transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 border border-pink-200"
              title="Relationship Profile"
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Heart with Y-stem and plus icon */}
                <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Glow effect */}
                  <defs>
                    <linearGradient id="heartGradient" x1="10" y1="2" x2="10" y2="20" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="50%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <g filter="url(#glow)">
                    {/* Heart shape */}
                    <path
                      d="M10 5C10 5 7.5 2.5 5 2.5C3 2.5 1.5 4 1.5 6C1.5 9 10 14 10 14C10 14 18.5 9 18.5 6C18.5 4 17 2.5 15 2.5C12.5 2.5 10 5 10 5Z"
                      stroke="url(#heartGradient)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    
                    {/* Y-shaped stem extending from heart */}
                    <path
                      d="M10 14L10 17M8 19L10 17L12 19"
                      stroke="url(#heartGradient)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Small plus sign at top-right */}
                    <g transform="translate(14, 2)">
                      <line x1="2" y1="0" x2="2" y2="4" stroke="#ec4899" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="0" y1="2" x2="4" y2="2" stroke="#ec4899" strokeWidth="1.2" strokeLinecap="round"/>
                    </g>
                  </g>
                </svg>
              </div>
              <span className="text-xs font-semibold text-purple-900 hidden sm:inline">Relationship Profile</span>
            </button>
          </Link>

          {/* Premium/Payments Button */}
          <button
            onClick={() => {
              const paywallEvent = new CustomEvent('openPaywall');
              window.dispatchEvent(paywallEvent);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 rounded-full transition-all duration-300 flex items-center gap-1.5 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            title="Upgrade to Premium"
          >
            <Crown className="w-4 h-4 text-yellow-900" />
            <span className="text-xs font-bold text-yellow-900 hidden sm:inline">Premium</span>
          </button>

          {actionItems.map((item) => (
            <Link key={item.url} href={item.url}>
              <button
                className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                title={item.title}
                data-testid={`nav-${item.title.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </Link>
          ))}

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setLocation('/memories');
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Memories
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      data-testid="nav-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add custom CSS for the navbar */}
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

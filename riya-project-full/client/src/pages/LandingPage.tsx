import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Video, Phone, Mic } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gray-900 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Main Content - Centered Phone Display */}
      <div className="relative z-10 w-full max-w-[375px] flex flex-col items-center">
        {/* Riya AI Text at Top */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8"
          data-testid="text-riya-ai-title"
        >
          Riya AI
        </motion.h1>

        {/* Smartphone Frame - Video Call Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full bg-black rounded-[2.5rem] p-2 shadow-2xl"
        >
          <div className="bg-gray-900 rounded-[2rem] overflow-hidden relative">
            {/* Status Bar */}
            <div className="bg-black px-4 py-2 flex items-center justify-between text-white text-xs font-medium">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                {/* Signal bars */}
                <div className="flex items-end gap-0.5">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1.5 bg-white rounded-full"></div>
                  <div className="w-1 h-2 bg-white rounded-full"></div>
                  <div className="w-1 h-2.5 bg-white rounded-full"></div>
                </div>
                {/* WiFi icon */}
                <div className="w-4 h-3 border border-white rounded-sm">
                  <div className="w-full h-full bg-white rounded-sm"></div>
                </div>
                {/* Battery */}
                <div className="w-6 h-3 border border-white rounded-sm">
                  <div className="w-5/6 h-full bg-white rounded-sm"></div>
                </div>
              </div>
            </div>

            {/* Video Call Screen - Full Background Image */}
            <div className="relative min-h-[600px] sm:min-h-[700px] flex flex-col items-center justify-center overflow-hidden">
              {/* Background Image - Woman's Photo */}
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop&crop=face"
                  alt="Riya"
                  className="w-full h-full object-cover"
                />
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/20"></div>
              </div>

              {/* Picture-in-Picture - Top Right */}
              <div className="absolute top-4 right-4 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shadow-lg z-10">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face"
                  alt="Riya"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content Container */}
              <div className="relative z-10 w-full px-4 flex flex-col items-center justify-center flex-1">
                {/* Text Overlay - Semi-transparent Dark Rectangle */}
                <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-5 py-4 mb-8 max-w-[300px] text-center">
                  <p className="text-white font-bold text-base sm:text-lg mb-2 leading-tight">
                    Ab Har Baat Hogi Aasaan,<br />
                    Connect Karo Aur Baat Karo!
                  </p>
                  <p className="text-white/90 text-sm italic">
                    — Always here for you.
                  </p>
                </div>

                {/* Call Controls */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  {/* Video Button */}
                  <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Video className="w-5 h-5 text-white" />
                  </button>
                  
                  {/* End Call Button - Red, Larger */}
                  <button className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg">
                    <Phone className="w-6 h-6 text-white rotate-90" />
                  </button>
                  
                  {/* Mic Button */}
                  <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Mic className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Get Started Button */}
                <Link href="/signup" className="w-full max-w-[280px] mb-4">
                  <Button
                    className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                    data-testid="button-get-started"
                  >
                    Let's Get Started
                  </Button>
                </Link>

                {/* Login Link */}
                <p className="text-white/80 text-xs sm:text-sm text-center">
                  Already have an account?{" "}
                  <Link href="/login">
                    <span className="text-white font-semibold underline underline-offset-2 cursor-pointer hover:text-purple-300 transition-colors">
                      Login
                    </span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

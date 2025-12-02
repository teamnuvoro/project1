import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface ProfileCreatedScreenProps {
  onComplete: () => void;
}

export function ProfileCreatedScreen({ onComplete }: ProfileCreatedScreenProps) {
  useEffect(() => {
    // Auto-transition after animation completes
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {/* Mobile Container */}
      <div className="w-full max-w-[430px] h-screen bg-gradient-to-b from-purple-200 via-pink-200 to-orange-200 flex flex-col items-center justify-center px-10">
        {/* Animated Success Icon */}
        <div className="relative mb-8">
          {/* Outer ripple circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-purple-400/30 rounded-full animate-ping" style={{ animationDuration: "1.5s" }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-purple-300/20 rounded-full animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }}></div>
          </div>
          
          {/* Main checkmark circle */}
          <div className="relative w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center animate-scale-in">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-white animate-check-in" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-4xl text-gray-800 mb-4" style={{ animationDelay: "0.3s" }}>
            Profile Created! ✨
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed px-4" style={{ animationDelay: "0.5s" }}>
            Select your companion now
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-12 animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>

        <style>{`
          @keyframes scale-in {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes check-in {
            0% {
              transform: scale(0) rotate(-45deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotate(10deg);
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }

          @keyframes fade-in-up {
            0% {
              transform: translateY(20px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes fade-in {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }

          .animate-scale-in {
            animation: scale-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
          }

          .animate-check-in {
            animation: check-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s forwards;
            opacity: 0;
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
            opacity: 0;
          }

          .animate-fade-in {
            animation: fade-in 0.6s ease-out forwards;
            opacity: 0;
          }
        `}</style>
      </div>
    </div>
  );
}

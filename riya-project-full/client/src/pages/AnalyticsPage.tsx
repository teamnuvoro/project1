import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Heart,
  Target,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AnalyticsResponse {
  engagement: {
    totalUsers: number;
    activeUsers7d: number;
    avgMessagesPerSession: number;
    totalMessages: number;
    voiceCallSessions: number;
    voiceMinutes: number;
  };
  conversion: {
    premiumUsers: number;
    freeToPaidConversion: number;
    planBreakdown: Record<string, number>;
  };
  quality: {
    confidenceScore: number;
  };
}

interface StrengthCard {
  icon: React.ReactNode;
  title: string;
  score: number;
  color: string;
  traits: string[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/analytics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/analytics");
      return response.json();
    },
  });

  const strengthCards: StrengthCard[] = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Communication Style",
      score: 85,
      color: "bg-blue-500",
      traits: [
        "You value open and honest conversations",
        "Prefer expressing feelings through words",
        "Need regular emotional check-ins"
      ]
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Emotional Intelligence",
      score: 78,
      color: "bg-pink-500",
      traits: [
        "You're empathetic and understanding",
        "Can sometimes overthink situations",
        "Value emotional depth in relationships"
      ]
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Relationship Goals",
      score: 92,
      color: "bg-purple-500",
      traits: [
        "Looking for long-term commitment",
        "Value trust and loyalty",
        "Ready for meaningful connection"
      ]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Header - Responsive */}
      <header className="gradient-header text-white px-3 sm:px-4 py-3 sm:py-4 w-full flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/chat">
            <button className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0" data-testid="button-back-to-chat">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold text-base sm:text-lg">Your Relationship Analysis</h1>
            <p className="text-sm text-white/80">Personalized insights by Riya</p>
          </div>
        </div>
      </header>

      {/* Content - Responsive Flexbox */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-2xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto">
        {/* Greeting Card - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-sm w-full"
        >
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base sm:text-lg text-foreground">
                Hello {user?.name || "User"}! 👋
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mt-1">
                Based on our conversations, I've analyzed your relationship style and identified your strengths. Let's explore what makes you unique in relationships.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Strengths Section - Responsive */}
        <div className="w-full">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
            Your Relationship Strengths
          </h2>

          <div className="space-y-3 sm:space-y-4 w-full">
            {strengthCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="insight-card-modern border-0 shadow-lg w-full"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`p-2 sm:p-2.5 ${card.color} text-white rounded-xl shadow-md flex-shrink-0`}>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6">{card.icon}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">{card.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Your relationship strength</p>
                    </div>
                  </div>
                  <div className="text-right bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 border border-purple-100 flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-foreground">{card.score}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar mb-3 sm:mb-4 w-full">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${card.score}%` }}
                    transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                  />
                </div>

                {/* Traits - Responsive */}
                <div className="space-y-2 sm:space-y-2.5 pt-2 border-t border-gray-100">
                  {card.traits.map((trait, traitIndex) => (
                    <div key={traitIndex} className="flex items-start gap-2 sm:gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-foreground leading-relaxed break-words">{trait}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Back to Chat Button - Responsive */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="pt-4 sm:pt-6 pb-4 sm:pb-6 w-full"
        >
          <Link href="/chat" className="block w-full">
            <button className="w-full py-3 sm:py-4 gradient-primary-button text-white rounded-full text-sm sm:text-base font-medium shadow-lg shadow-purple-300/30">
              Back to Chat with Riya
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

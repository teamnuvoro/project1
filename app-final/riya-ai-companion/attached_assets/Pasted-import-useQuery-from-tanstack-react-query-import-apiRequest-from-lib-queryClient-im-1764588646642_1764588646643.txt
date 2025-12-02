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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="gradient-header text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors" data-testid="button-back-to-chat">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="font-semibold text-lg">Your Relationship Analysis</h1>
            <p className="text-sm text-white/80">Personalized insights by Riya</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Greeting Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">
                Hello {user?.name || "User"}!
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mt-1">
                Based on our conversation, I've identified your relationship style and areas where you can grow. Let's explore what makes you unique in relationships.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Strengths Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Your Relationship Strengths
          </h2>

          <div className="space-y-4">
            {strengthCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="analysis-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${card.color} text-white rounded-xl`}>
                      {card.icon}
                    </div>
                    <h3 className="font-semibold text-foreground">{card.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-foreground">{card.score}</span>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar mb-4">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${card.score}%` }}
                    transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                  />
                </div>

                {/* Traits */}
                <div className="space-y-2">
                  {card.traits.map((trait, traitIndex) => (
                    <div key={traitIndex} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{trait}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Back to Chat Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="pt-4"
        >
          <Link href="/chat">
            <button className="w-full py-4 gradient-primary-button text-white rounded-full font-medium shadow-lg shadow-purple-300/30">
              Back to Chat with Riya
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

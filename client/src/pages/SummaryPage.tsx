import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Heart,
  ListCheck,
  TrendingUp,
  MessageCircle,
  Brain,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";

interface SummaryResponse {
  hasSummary: boolean;
  summary?: {
    partnerTypeOneLiner: string | null;
    top3TraitsYouValue: string[] | null;
    whatYouMightWorkOn: string[] | null;
    nextTimeFocus: string[] | null;
    loveLanguageGuess: string | null;
    communicationFit: string | null;
    confidenceScore: string | number | null;
    updatedAt: string | null;
  };
}

const formatTimestamp = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

export default function SummaryPage() {
  const { data, isLoading, error } = useQuery<SummaryResponse>({
    queryKey: ["/api/summary/latest"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/summary/latest");
      return response.json();
    },
  });

  const summary = data?.summary;
  const confidencePercent = summary?.confidenceScore
    ? Math.round(Number(summary.confidenceScore) * 100)
    : 30;

  if (isLoading) {
    return (
      <div className="summary-shell">
        <div className="summary-panel summary-empty">
          <p>Loading your insights…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="summary-shell">
        <div className="summary-panel summary-empty error">
          <p>Unable to load summary. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="summary-shell">
        <div className="summary-panel summary-empty">
          <Brain className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold">No summary yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Complete a conversation to generate your first relationship insights.
          </p>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline">Start Chatting</Button>
            </Link>
            <Link href="/call">
              <Button>Start Voice Call</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-auto">
      {/* Full-width Gradient Header Banner - Responsive */}
      <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 w-full">
        <div className="max-w-4xl mx-auto w-full relative">
          {/* Back Button */}
          <Link href="/chat">
            <button className="mb-4 sm:mb-6 p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Link>
          
          {/* Title Section - Responsive */}
          <div className="mb-4 sm:mb-6 pr-20 sm:pr-24">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Your Relationship Insights</h1>
            <p className="text-sm sm:text-base md:text-lg text-white/90">
              Based on your conversations with Riya
            </p>
          </div>
          
          {/* Confidence Badge - Top Right - Responsive */}
          <div className="absolute top-4 sm:top-6 right-2 sm:right-4 md:right-8 bg-white rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 shadow-lg">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Confidence</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">{confidencePercent}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Responsive Flexbox */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Welcome Card - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm w-full"
        >
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-purple-100 rounded-xl flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg sm:text-xl text-gray-900 mb-1 sm:mb-2">
                Here's what I've learned about you 💕
              </h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                These insights are based on our conversations and help you understand your relationship style better.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Ideal Partner Card - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <Card className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm w-full">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-pink-100 rounded-xl flex-shrink-0">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                  YOUR IDEAL PARTNER
                </p>
                <p className="text-sm sm:text-base text-gray-900 leading-relaxed">
                  {summary.partnerTypeOneLiner || "Still learning your vibe... Keep chatting with me to discover more!"}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Top Traits Card - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <Card className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm w-full">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl flex-shrink-0">
                <ListCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
                  TOP 3 TRAITS YOU VALUE
                </p>
                <div className="space-y-2 sm:space-y-3">
                  {(summary.top3TraitsYouValue || []).map((trait, idx) => (
                    <div key={idx} className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-gray-900 leading-relaxed break-words">{trait}</span>
                    </div>
                  ))}
                  {(!summary.top3TraitsYouValue || summary.top3TraitsYouValue.length === 0) && (
                    <p className="text-sm text-gray-500 italic">
                      Keep chatting to discover your top traits!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Growth Areas & Next Focus - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full"
          >
            <Card className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm h-full w-full">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-orange-100 rounded-xl flex-shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
                    Growth Areas
                  </p>
                  <div className="space-y-2 sm:space-y-3">
                    {(summary.whatYouMightWorkOn || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 sm:gap-3">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-gray-900 leading-relaxed break-words">{item}</span>
                      </div>
                    ))}
                    {(!summary.whatYouMightWorkOn || summary.whatYouMightWorkOn.length === 0) && (
                      <p className="text-sm text-gray-500 italic">
                        Areas to explore...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full"
          >
            <Card className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm h-full w-full">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-teal-100 rounded-xl flex-shrink-0">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
                    Next Time Focus
                  </p>
                  <div className="space-y-2 sm:space-y-3">
                    {(summary.nextTimeFocus || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 sm:gap-3">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-gray-900 leading-relaxed break-words">{item}</span>
                      </div>
                    ))}
                    {(!summary.nextTimeFocus || summary.nextTimeFocus.length === 0) && (
                      <p className="text-sm text-gray-500 italic">
                        What to explore next...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Communication & Love Language Card - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full"
        >
          <Card className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm w-full">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-purple-100 rounded-xl flex-shrink-0">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 sm:mb-6">
                  Communication & Connection
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Love Language Guess
                    </p>
                    <p className="text-sm sm:text-base text-gray-900 font-medium break-words">
                      {summary.loveLanguageGuess || "Still learning your style..."}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Communication Style
                    </p>
                    <p className="text-sm sm:text-base text-gray-900 font-medium break-words">
                      {summary.communicationFit || "Getting to know you better..."}
                    </p>
                  </div>
                </div>
                {summary.updatedAt && (
                  <p className="text-xs text-gray-500 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100 text-right">
                    Last updated: {formatTimestamp(summary.updatedAt)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Back to Chat Button - Responsive */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="pt-4 sm:pt-6 pb-6 sm:pb-8 w-full"
        >
          <Link href="/chat" className="block w-full">
            <button className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm sm:text-base font-semibold shadow-lg shadow-purple-300/30 hover:shadow-xl hover:from-purple-600 hover:to-pink-600 transition-all">
              Continue Chatting with Riya
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-gradient-to-b from-purple-50/30 via-white to-pink-50/30">
      {/* Header */}
      <header className="gradient-header text-white px-4 py-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <Link href="/chat">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Award className="w-4 h-4" />
            <div>
              <p className="text-xs text-white/80">Confidence</p>
              <p className="text-sm font-semibold">{confidencePercent}%</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold">Your Relationship Insights</h1>
          <p className="text-sm text-white/80 mt-1">
            Based on your conversations with Riya
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">
                Here's what I've learned about you 💕
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mt-1">
                These insights are based on our conversations and help you understand your relationship style better.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Ideal Partner Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="insight-card-modern border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 -m-6 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Your Ideal Partner
                  </p>
                </div>
              </div>
            </div>
            <div className="px-2 pb-4">
              <p className="text-base text-foreground leading-relaxed">
                {summary.partnerTypeOneLiner || "Still learning your vibe... Keep chatting with me to discover more!"}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Top Traits Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="insight-card-modern border-0 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <ListCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Top 3 Traits You Value
                </p>
                <div className="space-y-2">
                  {(summary.top3TraitsYouValue || []).map((trait, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{trait}</span>
                    </div>
                  ))}
                  {(!summary.top3TraitsYouValue || summary.top3TraitsYouValue.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">
                      Keep chatting to discover your top traits!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Growth Areas & Next Focus */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="insight-card-modern border-0 shadow-lg h-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Growth Areas
                  </p>
                  <div className="space-y-2">
                    {(summary.whatYouMightWorkOn || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{item}</span>
                      </div>
                    ))}
                    {(!summary.whatYouMightWorkOn || summary.whatYouMightWorkOn.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">
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
          >
            <Card className="insight-card-modern border-0 shadow-lg h-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-teal-100 rounded-xl">
                  <MessageCircle className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Next Time Focus
                  </p>
                  <div className="space-y-2">
                    {(summary.nextTimeFocus || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{item}</span>
                      </div>
                    ))}
                    {(!summary.nextTimeFocus || summary.nextTimeFocus.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">
                        What to explore next...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Communication & Love Language Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="insight-card-modern border-0 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Communication & Connection
                </p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Love Language
                    </p>
                    <p className="text-base text-foreground font-medium">
                      {summary.loveLanguageGuess || "Still learning your style..."}
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Communication Style
                    </p>
                    <p className="text-base text-foreground font-medium">
                      {summary.communicationFit || "Getting to know you better..."}
                    </p>
                  </div>
                </div>
                {summary.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-gray-100">
                    Last updated: {formatTimestamp(summary.updatedAt)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Back to Chat Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="pt-4"
        >
          <Link href="/chat">
            <button className="w-full py-4 gradient-primary-button text-white rounded-full font-medium shadow-lg shadow-purple-300/30 hover:shadow-xl transition-shadow">
              Continue Chatting with Riya
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

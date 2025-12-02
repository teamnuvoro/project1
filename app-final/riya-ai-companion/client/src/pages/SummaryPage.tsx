import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Heart,
  Shield,
  Handshake,
  MessageCircle,
  Brain,
  Sparkles,
  Leaf,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getUnderstandingLabel = (percent: number) => {
  if (percent < 30) return "Riya is just getting to know you. Keep chatting to build deeper insights.";
  if (percent < 50) return "Riya is learning about your ideal relationship. Keep chatting to build deeper insights.";
  if (percent < 70) return "Riya understands you pretty well now. A few more chats will deepen this connection.";
  return "Riya has developed a strong understanding of your relationship preferences.";
};

const traitDescriptions: Record<string, string> = {
  "Emotional understanding": "Deep empathy and connection",
  "Emotional support": "Deep empathy and connection",
  "Playful communication": "Light-hearted and fun exchanges",
  "Good communication": "Clear and open dialogue",
  "Shared ambition": "Growth-oriented mindset",
  "Honesty": "Authentic and truthful interactions",
  "Trust": "Building secure foundations",
  "Loyalty": "Committed and dependable",
  "Humor": "Light-hearted and fun exchanges",
  "Intelligence": "Stimulating conversations",
  "Kindness": "Caring and compassionate nature",
  "Respect": "Mutual appreciation",
};

const getTraitDescription = (trait: string): string => {
  // Check if trait already has description format "Trait - Description"
  if (trait.includes(' - ')) {
    const parts = trait.split(' - ');
    return parts[1] || "Important to your connection";
  }
  return traitDescriptions[trait] || "Important to your connection";
};

const getTraitName = (trait: string): string => {
  // Extract trait name if in "Trait - Description" format
  if (trait.includes(' - ')) {
    return trait.split(' - ')[0];
  }
  return trait;
};

const traitColors = [
  { bg: "bg-pink-100", text: "text-pink-300", badge: "bg-pink-500" },
  { bg: "bg-blue-50", text: "text-blue-200", badge: "bg-blue-400" },
  { bg: "bg-cyan-50", text: "text-cyan-200", badge: "bg-teal-400" },
];

const focusIcons: Record<string, typeof Heart> = {
  "Love Language": Heart,
  "Emotional Security": Shield,
  "Trust Patterns": Handshake,
};

const getFocusIcon = (topic: string) => {
  for (const [key, Icon] of Object.entries(focusIcons)) {
    if (topic.toLowerCase().includes(key.toLowerCase())) {
      return Icon;
    }
  }
  return Sparkles;
};

export default function SummaryPage() {
  const { toast } = useToast();
  
  const { data, isLoading, error, refetch } = useQuery<SummaryResponse | null>({
    queryKey: ["/api/summary/latest"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/summary/latest", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            return { hasSummary: false, summary: null };
          }
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        return response.json();
      } catch (err) {
        console.error("[SummaryPage] Fetch error:", err);
        return { hasSummary: false, summary: null };
      }
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/summary/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary/latest"] });
      toast({
        title: "Insights Updated",
        description: "Your relationship profile has been refreshed based on your latest conversations.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not refresh",
        description: error.message || "Have more conversations to generate new insights.",
        variant: "destructive",
      });
    },
  });

  const summary = data?.summary;
  const confidencePercent = summary?.confidenceScore
    ? Math.round(Number(summary.confidenceScore) * 100)
    : 42;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-destructive">Unable to load summary. Please try again.</p>
            <Button onClick={() => refetch()} data-testid="button-retry">Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Brain className="h-12 w-12 text-pink-400" />
          <h2 className="text-xl font-semibold">No insights yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Have a few conversations with Riya to generate your relationship insights.
          </p>
          <div className="flex gap-3 pt-2">
            <Link href="/">
              <Button variant="outline" data-testid="button-start-chatting">Start Chatting</Button>
            </Link>
            <Link href="/call">
              <Button data-testid="button-start-call">Start Voice Call</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const traits = summary.top3TraitsYouValue || [];
  const workOnItems = summary.whatYouMightWorkOn || [];
  const focusTopics = summary.nextTimeFocus || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800" data-testid="summary-page">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Link href="/chat">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2" data-testid="button-back-to-chat">
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>
        </Link>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Relationship Insights</h1>
          <p className="text-muted-foreground text-sm">Based on your conversations with Riya</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="mt-2 gap-2"
            data-testid="button-refresh-analysis"
          >
            {regenerateMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Refresh Analysis
              </>
            )}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Understanding Level</h2>
          
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-pink-100 dark:text-pink-900"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${confidencePercent * 2.64} 264`}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-confidence-score">{confidencePercent}%</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {getUnderstandingLabel(confidencePercent)}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>New</span>
              <span>Getting to know you</span>
              <span>Deep connection</span>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-5 shadow-sm" data-testid="card-partner-vibe">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Ideal Partner Vibe</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-200 leading-relaxed" data-testid="text-partner-vibe">
            {summary.partnerTypeOneLiner || "You connect best with someone warm, emotionally expressive, and grounded who values deep conversations."}
          </p>
        </div>

        {traits.length > 0 && (
          <div data-testid="card-traits">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 3 Traits You Value Most</h2>
            <div className="space-y-3">
              {traits.slice(0, 3).map((trait, idx) => {
                const colors = traitColors[idx] || traitColors[0];
                return (
                  <div 
                    key={idx} 
                    className={`${colors.bg} rounded-2xl p-5 relative overflow-hidden`}
                    data-testid={`trait-item-${idx}`}
                  >
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[80px] font-bold ${colors.text} opacity-50 select-none`}>
                      {idx + 1}
                    </span>
                    
                    <div className={`${colors.badge} w-8 h-8 rounded-lg flex items-center justify-center mb-3`}>
                      <span className="text-white text-sm font-bold">{idx + 1}</span>
                    </div>
                    
                    <p className="font-semibold text-gray-900 text-lg relative z-10" data-testid={`text-trait-${idx}`}>
                      {getTraitName(trait)}
                    </p>
                    <p className="text-gray-600 text-sm relative z-10">{getTraitDescription(trait)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-400">Growth Areas</p>

        {workOnItems.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm" data-testid="card-growth-areas">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What You Might Work On</h2>
            </div>
            <div className="space-y-4">
              {workOnItems.map((item, idx) => {
                const icons = [MessageCircle, Sparkles, Leaf];
                const iconColors = ["text-purple-400", "text-yellow-400", "text-green-400"];
                const Icon = icons[idx % icons.length];
                const iconColor = iconColors[idx % iconColors.length];
                return (
                  <div key={idx} className="flex items-start gap-3" data-testid={`growth-item-${idx}`}>
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 pt-2">{item}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {focusTopics.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm" data-testid="card-focus-topics">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Next Time's Focus</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 ml-13">
              These topics will help Riya understand you better and increase your confidence score
            </p>
            <div className="flex flex-wrap gap-2">
              {focusTopics.map((topic, idx) => {
                const Icon = getFocusIcon(topic);
                const pillColors = [
                  "bg-pink-100 text-pink-600 border-pink-200",
                  "bg-purple-100 text-purple-600 border-purple-200", 
                  "bg-orange-100 text-orange-600 border-orange-200",
                ];
                const color = pillColors[idx % pillColors.length];
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 ${color} rounded-full border`}
                    data-testid={`focus-topic-${idx}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{topic}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm" data-testid="card-love-language">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Love Language</span>
            </div>
            <p className="text-gray-900 dark:text-white font-semibold" data-testid="text-love-language">
              {summary.loveLanguageGuess || "Words of Affirmation"}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm" data-testid="card-communication">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Communication</span>
            </div>
            <p className="text-gray-900 dark:text-white font-semibold" data-testid="text-communication">
              {summary.communicationFit || "Thoughtful & Direct"}
            </p>
          </div>
        </div>

        {summary.updatedAt && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4" data-testid="text-last-updated">
            Last updated: {formatTimestamp(summary.updatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

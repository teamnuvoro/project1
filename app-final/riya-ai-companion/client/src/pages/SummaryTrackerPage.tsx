import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Brain,
  Sparkles,
  Leaf,
  RefreshCw,
  Zap,
  Target,
  Sun,
  TrendingUp,
  Users,
  MapPin,
  Lightbulb,
  ChevronRight,
  AlertCircle,
  WifiOff,
} from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { generateUserSummary, useEdgeFunctions, isEdgeFunctionsConfigured } from "@/lib/edgeFunctions";
import { useCachedSummary, useCachedProgression, DEFAULT_FIRST_TIME_SUMMARY } from "@/hooks/useCachedSummary";
import { ErrorBoundary, NetworkErrorFallback, EmptyStateFallback } from "@/components/ErrorBoundary";
import {
  safeParseArray,
  safeParseString,
  safeParseNumber,
  truncateText,
  limitArray,
  calculateUnderstandingLevel,
} from "@/lib/errorTypes";
import { useState, memo, useCallback } from "react";

const MAX_ARRAY_DISPLAY = 10;
const MAX_TEXT_LENGTH = 200;
const MAX_SUMMARY_PREVIEW = 300;

interface UserCumulativeSummary {
  id?: string;
  user_id?: string;
  cumulative_summary: string | null;
  ideal_partner_type: string | null;
  user_personality_traits: string[] | null;
  communication_style: string | null;
  emotional_needs: string[] | null;
  values: string[] | null;
  interests: string[] | null;
  relationship_expectations: string | null;
  what_to_explore: string[] | null;
  suggested_conversation_starters: string[] | null;
  growth_areas: string[] | null;
  understanding_level: number;
  total_sessions_count: number;
  total_messages_count: number;
  engagement_level: string | null;
  primary_conversation_theme: string | null;
  mood_pattern: string | null;
  created_at?: string;
  updated_at?: string;
  last_analysis_at?: string;
}

interface ProgressionStep {
  session: number;
  level: number;
  increment: number;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Never";
  }
};

const getUnderstandingLabel = (level: number): string => {
  const safeLevel = safeParseNumber(level, 25);
  if (safeLevel < 30) return "Riya is just getting to know you. Keep chatting!";
  if (safeLevel < 45) return "Building foundational understanding of who you are.";
  if (safeLevel < 60) return "Riya understands your personality well now.";
  if (safeLevel < 75) return "Deep connection established. Keep exploring!";
  return "Maximum understanding achieved. You're truly known.";
};

const CircularProgress = memo(function CircularProgress({ 
  value, 
  maxValue = 75 
}: { 
  value: number; 
  maxValue?: number 
}) {
  const safeValue = safeParseNumber(value, 25);
  const percentage = Math.min((safeValue / maxValue) * 100, 100);
  const strokeDasharray = percentage * 2.64;

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-purple-100 dark:text-purple-900"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#trackerGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${strokeDasharray} 264`}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="trackerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold text-gray-900 dark:text-white"
          data-testid="text-understanding-level"
        >
          {Math.round(safeValue)}%
        </span>
        <span className="text-xs text-gray-500">of {maxValue}%</span>
      </div>
    </div>
  );
});

const ProgressionTimeline = memo(function ProgressionTimeline({
  progression,
}: {
  progression: ProgressionStep[];
}) {
  const safeProgression = safeParseArray(progression, []);
  const displaySteps = limitArray(safeProgression, MAX_ARRAY_DISPLAY);
  const hasMore = safeProgression.length > MAX_ARRAY_DISPLAY;

  if (displaySteps.length === 0) {
    return (
      <EmptyStateFallback
        title="No progression yet"
        description="Complete your first chat session to see your progress"
        icon={<TrendingUp className="h-8 w-8 text-purple-500" />}
      />
    );
  }

  return (
    <div className="space-y-2">
      {displaySteps.map((step, idx) => (
        <div
          key={step.session}
          className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20"
          data-testid={`progression-step-${idx}`}
        >
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {step.session}
          </div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(safeParseNumber(step.level, 25) / 75) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16 text-right">
            {safeParseNumber(step.level, 25)}%
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            +{safeParseNumber(step.increment, 0)}%
          </Badge>
        </div>
      ))}
      {hasMore && (
        <p className="text-xs text-center text-gray-500 mt-2">
          Showing {MAX_ARRAY_DISPLAY} of {safeProgression.length} sessions
        </p>
      )}
    </div>
  );
});

const SummaryCard = memo(function SummaryCard({
  title,
  value,
  icon: Icon,
  bgClass,
  testId,
}: {
  title: string;
  value: string | null;
  icon: typeof Heart;
  bgClass: string;
  testId: string;
}) {
  const displayValue = safeParseString(value, "Not yet determined");

  return (
    <Card className={`${bgClass} border-0 shadow-sm`} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-white/80" />
          <span className="text-xs text-white/80 font-medium">{title}</span>
        </div>
        <p className="text-white font-semibold text-sm leading-tight">
          {displayValue}
        </p>
      </CardContent>
    </Card>
  );
});

const TraitBadges = memo(function TraitBadges({
  items,
  icon,
  colorClass,
  testIdPrefix,
}: {
  items: string[] | null;
  icon: string;
  colorClass: string;
  testIdPrefix: string;
}) {
  const safeItems = safeParseArray(items, []);
  const displayItems = limitArray(safeItems, MAX_ARRAY_DISPLAY);
  const hasMore = safeItems.length > MAX_ARRAY_DISPLAY;

  if (displayItems.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Not yet determined</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item, idx) => (
          <Badge
            key={idx}
            className={`${colorClass} px-3 py-1.5 text-sm font-medium`}
            data-testid={`${testIdPrefix}-${idx}`}
          >
            <span className="mr-1">{icon}</span>
            {truncateText(safeParseString(item, ""), 30)}
          </Badge>
        ))}
      </div>
      {hasMore && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              View all {safeItems.length} items <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>All Items ({safeItems.length})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="flex flex-wrap gap-2 p-4">
                {safeItems.map((item, idx) => (
                  <Badge
                    key={idx}
                    className={`${colorClass} px-3 py-1.5 text-sm font-medium`}
                  >
                    <span className="mr-1">{icon}</span>
                    {safeParseString(item, "")}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

const ExpandableSummary = memo(function ExpandableSummary({
  summary,
}: {
  summary: string | null;
}) {
  const safeSummary = safeParseString(summary, "");

  if (!safeSummary) {
    return (
      <p className="text-sm text-white/70 italic">
        Chat more with Riya to unlock insights about yourself.
      </p>
    );
  }

  const isLong = safeSummary.length > MAX_SUMMARY_PREVIEW;
  const preview = isLong
    ? truncateText(safeSummary, MAX_SUMMARY_PREVIEW)
    : safeSummary;

  return (
    <div>
      <p className="text-sm text-white/90 leading-relaxed">{preview}</p>
      {isLong && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white mt-2 p-0 h-auto"
            >
              Read full summary <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                What Riya Knows About You
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <p className="text-sm leading-relaxed p-4">{safeSummary}</p>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

function FirstTimeUserState({ onGenerateClick, isGenerating }: { onGenerateClick: () => void; isGenerating: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl animate-pulse" />
          <div className="relative p-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30">
            <Heart className="h-16 w-16 text-purple-500" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Your Journey
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Chat with Riya to build your profile! The more you talk, the better she understands you.
          </p>
        </div>

        <Card className="w-full max-w-sm bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Starting Level</span>
              <Badge className="bg-purple-500 text-white">25%</Badge>
            </div>
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-4">
          <Link href="/chat">
            <Button variant="default" size="lg" data-testid="button-start-chatting">
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Chatting
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={onGenerateClick}
            disabled={isGenerating}
            data-testid="button-generate-now"
          >
            {isGenerating ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 mr-2" />
            )}
            Analyze Now
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-64 mx-auto" />
        <div className="flex justify-center">
          <Skeleton className="h-32 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ 
  error, 
  onRetry, 
  retryCount 
}: { 
  error: Error | null; 
  onRetry: () => void; 
  retryCount: number 
}) {
  const isNetworkError = error?.message?.includes("network") || error?.message?.includes("fetch");

  if (isNetworkError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
          <NetworkErrorFallback onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto p-3 rounded-full bg-destructive/10 w-fit">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Unable to load insights</h3>
              <p className="text-sm text-muted-foreground">
                {error?.message || "Something went wrong. Please try again."}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Retry attempt {retryCount} of 3...
                </p>
              )}
            </div>
            <Button onClick={onRetry} className="w-full" data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Link href="/chat">
              <Button variant="ghost" className="w-full" data-testid="button-go-to-chat">
                Go to Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryTrackerContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAllExplore, setShowAllExplore] = useState(false);

  const userId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem("userId") : null);

  const {
    summaryData,
    isLoading,
    error,
    isError,
    isFirstTimeUser,
    retryCount,
    refetch,
  } = useCachedSummary(userId);

  const { progressionData } = useCachedProgression(userId, !!summaryData?.success);

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      
      const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();
      console.log("[SummaryTrackerPage] Regenerate using Edge Functions:", shouldUseEdge);

      // =========================================================================
      // NEW: Use Supabase Edge Function when configured
      // =========================================================================
      if (shouldUseEdge) {
        try {
          return await generateUserSummary(userId);
        } catch (edgeErr) {
          console.warn("[SummaryTrackerPage] Edge Function error, falling back to Express:", edgeErr);
          // Fall through to Express fallback
        }
      }

      // =========================================================================
      // Express API fallback
      // =========================================================================
      const response = await fetch(`/api/user-summary/${userId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-summary", userId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/user-summary", userId, "progression"],
      });
      toast({
        title: "Analysis Complete",
        description: "Your cumulative insights have been refreshed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRegenerate = useCallback(() => {
    regenerateMutation.mutate();
  }, [regenerateMutation]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError && error) {
    return <ErrorState error={error as Error} onRetry={handleRetry} retryCount={retryCount} />;
  }

  if (isFirstTimeUser || !summaryData?.summary) {
    return (
      <FirstTimeUserState
        onGenerateClick={handleRegenerate}
        isGenerating={regenerateMutation.isPending}
      />
    );
  }

  const summary: UserCumulativeSummary = {
    ...DEFAULT_FIRST_TIME_SUMMARY,
    ...summaryData.summary,
    understanding_level: calculateUnderstandingLevel(
      safeParseNumber(summaryData.summary?.total_sessions_count, 0)
    ),
  };

  const progression = safeParseArray(progressionData?.progression, []);
  const exploreItems = safeParseArray(summary.what_to_explore, []);
  const growthAreas = safeParseArray(summary.growth_areas, []);
  const conversationStarters = safeParseArray(summary.suggested_conversation_starters, []);

  return (
    <ScrollArea className="h-screen">
      <div
        className="min-h-screen bg-gradient-to-b from-purple-50 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-800"
        data-testid="summary-tracker-page"
      >
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
              data-testid="button-refresh"
            >
              {regenerateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Your Understanding Journey
            </h1>
            <p className="text-muted-foreground text-sm">
              How well Riya understands you based on all your conversations
            </p>
          </div>

          {/* Understanding Level Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg" data-testid="card-understanding">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <CircularProgress value={summary.understanding_level} />
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    Understanding Level
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {getUnderstandingLabel(summary.understanding_level)}
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">How understanding grows:</p>
                    <ul className="space-y-0.5">
                      <li>Session 1: Starts at 25%</li>
                      <li>Sessions 2-4: +10%, +5%, +5% (rapid learning)</li>
                      <li>Sessions 5+: +2.5%, +1.5%, +1% (deep understanding)</li>
                      <li>Maximum: 75%</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.understanding_level / 75) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>New (25%)</span>
                  <span>Growing (50%)</span>
                  <span>Deep (75%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progression Timeline */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm" data-testid="card-progression">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Session Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressionTimeline progression={progression} />
              {progressionData?.sessionsToMax && progressionData.sessionsToMax > 0 && (
                <p className="text-xs text-center text-gray-500 mt-3">
                  ~{progressionData.sessionsToMax} more sessions to reach maximum understanding
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cumulative Summary */}
          <Card
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
            data-testid="card-cumulative-summary"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5" />
                <h3 className="font-semibold">What Riya Knows About You</h3>
              </div>
              <ExpandableSummary summary={summary.cumulative_summary} />
            </CardContent>
          </Card>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard
              title="Ideal Partner"
              value={summary.ideal_partner_type}
              icon={Heart}
              bgClass="bg-gradient-to-br from-pink-500 to-rose-500"
              testId="card-ideal-partner"
            />
            <SummaryCard
              title="Communication"
              value={summary.communication_style}
              icon={MessageCircle}
              bgClass="bg-gradient-to-br from-blue-500 to-cyan-500"
              testId="card-communication"
            />
            <SummaryCard
              title="Expectations"
              value={summary.relationship_expectations}
              icon={Users}
              bgClass="bg-gradient-to-br from-green-500 to-emerald-500"
              testId="card-expectations"
            />
            <SummaryCard
              title="Primary Topic"
              value={summary.primary_conversation_theme}
              icon={Target}
              bgClass="bg-gradient-to-br from-yellow-500 to-orange-500"
              testId="card-primary-topic"
            />
            <SummaryCard
              title="Mood Pattern"
              value={summary.mood_pattern}
              icon={Sun}
              bgClass="bg-gradient-to-br from-orange-500 to-red-500"
              testId="card-mood"
            />
            <SummaryCard
              title="Engagement"
              value={summary.engagement_level}
              icon={Zap}
              bgClass="bg-gradient-to-br from-purple-500 to-violet-500"
              testId="card-engagement"
            />
          </div>

          {/* Traits Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm" data-testid="card-traits">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Your Profile Traits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Personality Traits</p>
                <TraitBadges
                  items={summary.user_personality_traits}
                  icon="✨"
                  colorClass="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  testIdPrefix="trait-personality"
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Emotional Needs</p>
                <TraitBadges
                  items={summary.emotional_needs}
                  icon="💙"
                  colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  testIdPrefix="trait-emotional"
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Core Values</p>
                <TraitBadges
                  items={summary.values}
                  icon="🎯"
                  colorClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  testIdPrefix="trait-values"
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Interests</p>
                <TraitBadges
                  items={summary.interests}
                  icon="🌟"
                  colorClass="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  testIdPrefix="trait-interests"
                />
              </div>
            </CardContent>
          </Card>

          {/* Growth Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm" data-testid="card-growth">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-500" />
                Growth & Exploration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* What to Explore */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topics to Explore
                  </p>
                </div>
                {exploreItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {limitArray(exploreItems, showAllExplore ? 100 : 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                        data-testid={`explore-item-${idx}`}
                      >
                        <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {truncateText(safeParseString(item, ""), MAX_TEXT_LENGTH)}
                        </span>
                      </div>
                    ))}
                    {exploreItems.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllExplore(!showAllExplore)}
                        className="text-xs"
                      >
                        {showAllExplore ? "Show less" : `View all ${exploreItems.length} topics`}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Keep chatting to discover topics</p>
                )}
              </div>

              {/* Growth Areas */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Growth Areas
                  </p>
                </div>
                {growthAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {limitArray(growthAreas, MAX_ARRAY_DISPLAY).map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        data-testid={`growth-area-${idx}`}
                      >
                        {truncateText(safeParseString(item, ""), 30)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Not yet determined</p>
                )}
              </div>

              {/* Conversation Starters */}
              {conversationStarters.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suggested Topics
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {limitArray(conversationStarters, 5).map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300"
                        data-testid={`starter-${idx}`}
                      >
                        {truncateText(safeParseString(item, ""), 40)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Footer */}
          <Card className="bg-gray-50 dark:bg-gray-800/50 border-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Sessions: {safeParseNumber(summary.total_sessions_count, 0)}
                </span>
                <span>
                  Messages: {safeParseNumber(summary.total_messages_count, 0)}
                </span>
                <span>
                  Updated: {formatDate(summary.last_analysis_at || summary.updated_at)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

export default function SummaryTrackerPage() {
  return (
    <ErrorBoundary>
      <SummaryTrackerContent />
    </ErrorBoundary>
  );
}

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Award,
  Heart,
  ListCheck,
  TrendingUp,
  MessageCircle,
  Brain,
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
    <div className="summary-shell">
      <div className="summary-panel">
        <header className="summary-header">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <div className="confidence-chip">
            <Award className="h-4 w-4" />
            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-sm font-semibold">{confidencePercent}% sure</p>
            </div>
          </div>
        </header>

        <div className="text-center space-y-2 mt-6 mb-10">
          <h1 className="text-3xl font-bold">Your Relationship Insights</h1>
          <p className="text-muted-foreground">
            Based on your conversations with Riya
          </p>
        </div>

        <div className="summary-grid">
          <Card className="insight-card">
            <div className="card-icon heart">
              <Heart />
            </div>
            <p className="card-kicker">Your Ideal Partner</p>
            <p className="card-body">
              {summary.partnerTypeOneLiner || "Still learning your vibe"}
            </p>
          </Card>

          <Card className="insight-card">
            <div className="card-icon">
              <ListCheck />
            </div>
            <p className="card-kicker">Top 3 Traits You Value</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
              {(summary.top3TraitsYouValue || []).map((trait, idx) => (
                <li key={idx}>{trait}</li>
              ))}
            </ul>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="insight-card">
              <div className="card-icon">
                <TrendingUp />
              </div>
              <p className="card-kicker">Growth Areas</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                {(summary.whatYouMightWorkOn || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card className="insight-card">
              <div className="card-icon">
                <MessageCircle />
              </div>
              <p className="card-kicker">Next Time Focus</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                {(summary.nextTimeFocus || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="insight-card">
            <div className="card-icon brain">
              <Brain />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Love Language Guess
                </p>
                <p className="text-base mt-1">
                  {summary.loveLanguageGuess || "Still learning your style"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Communication Style
                </p>
                <p className="text-base mt-1">
                  {summary.communicationFit || "Getting to know you better"}
                </p>
              </div>
            </div>
            {summary.updatedAt && (
              <p className="text-xs text-muted-foreground text-right mt-4">
                Last updated: {formatTimestamp(summary.updatedAt)}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

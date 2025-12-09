import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

// Event translation map
const EVENT_TRANSLATIONS: Record<string, string> = {
  chat_sent: "The user successfully sent a message to Riya. Measures core product usage.",
  tip_clicked: "The user engaged with a suggested conversation starter (e.g., 'Tell me about your day'). Measures engagement with the prompt helpers.",
  login_otp_success: "The user successfully logged into the app. Measures successful authentication.",
  paywall_triggered: "The user hit their free message limit and saw the upgrade popup. Key trigger for conversion funnel.",
  pay_daily_selected: "The user clicked the ₹19 'Daily Pass' button on the paywall. Measures purchase intent for the cheapest plan.",
  pay_weekly_selected: "The user clicked the ₹49 'Weekly Pass' button on the paywall. Measures purchase intent for the premium plan.",
  profile_edit_attempt: "The user clicked the button to edit their own profile information. Measures user investment in their account.",
  session_start: "The user opened the application for the first time in a session. Measures daily user load.",
  voice_call_started: "The user initiated a voice call with Riya.",
  voice_call_ended: "The user ended a voice call with Riya.",
  payment_successful: "The user completed a payment successfully.",
  payment_failed: "The user's payment attempt failed.",
};

interface AnalyticsData {
  metrics: {
    totalActiveUsers: number;
    conversionRate: number;
    highestTrafficPage: string;
    paywallHits: number;
    successfulPayments: number;
    totalEvents: number;
    dateRange: {
      start: string;
      end: string;
      days: number;
    };
  };
  recentEvents: Array<{
    event_time: string;
    user_id: string;
    event_name: string;
    event_place: string;
    event_data?: any;
  }>;
  top5EventNames: Array<{ name: string; count: number }>;
  top5EventPlaces: Array<{ place: string; count: number }>;
  rawData: {
    eventsCount: number;
    sessionsCount: number;
    subscriptionsCount: number;
    paymentsCount: number;
  };
}

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [days, setDays] = useState(7);

  // Check if user is admin (you can add this to your user object)
  useEffect(() => {
    // For now, we'll check on the backend, but you might want to add client-side check
    // if (user && !user.is_admin) {
    //   setLocation('/chat');
    // }
  }, [user, setLocation]);

  const { data, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics', days],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics?days=${days}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    retry: false,
  });

  const getEventExplanation = (eventName: string): string => {
    return EVENT_TRANSLATIONS[eventName] || `Technical event: ${eventName}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="text-destructive text-lg font-semibold">Error Loading Analytics</div>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button onClick={() => refetch()}>Retry</Button>
          <Button variant="outline" onClick={() => setLocation('/chat')}>Go to Chat</Button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Data from {new Date(data.metrics.dateRange.start).toLocaleDateString()} to{' '}
              {new Date(data.metrics.dateRange.end).toLocaleDateString()} ({data.metrics.dateRange.days} days)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={days === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(7)}
            >
              7 Days
            </Button>
            <Button
              variant={days === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(30)}
            >
              30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Section A: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold mt-2">{data.metrics.totalActiveUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">Last {days} days</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold mt-2">{data.metrics.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.metrics.successfulPayments} / {data.metrics.paywallHits} paywall hits
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Highest Traffic</p>
                <p className="text-lg font-bold mt-2 truncate">{data.metrics.highestTrafficPage}</p>
                <p className="text-xs text-muted-foreground mt-1">Most visited page</p>
              </div>
              <BarChart3 className="w-10 h-10 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paywall Hits</p>
                <p className="text-3xl font-bold mt-2">{data.metrics.paywallHits}</p>
                <p className="text-xs text-muted-foreground mt-1">Total triggers</p>
              </div>
              <DollarSign className="w-10 h-10 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Section B: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Top 5 Event Names</h2>
            <div className="space-y-3">
              {data.top5EventNames.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getEventExplanation(item.name)}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold ml-4">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Top 5 Event Places</h2>
            <div className="space-y-3">
              {data.top5EventPlaces.map((item, index) => (
                <div key={item.place} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                    <p className="text-sm font-medium truncate flex-1">{item.place}</p>
                  </div>
                  <span className="text-lg font-bold ml-4">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section C: Recent Events Table */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent User Events (Last 50)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Time</th>
                  <th className="text-left p-2 font-semibold">User ID</th>
                  <th className="text-left p-2 font-semibold">Event Name</th>
                  <th className="text-left p-2 font-semibold">Place</th>
                  <th className="text-left p-2 font-semibold">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.map((event, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-xs">
                      {new Date(event.event_time).toLocaleString()}
                    </td>
                    <td className="p-2 font-mono text-xs">{event.user_id}</td>
                    <td className="p-2 font-medium">{event.event_name}</td>
                    <td className="p-2 text-muted-foreground">{event.event_place || 'N/A'}</td>
                    <td className="p-2 text-xs text-muted-foreground max-w-md">
                      {getEventExplanation(event.event_name)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Raw Data Summary */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Data Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{data.rawData.eventsCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions</p>
              <p className="text-2xl font-bold">{data.rawData.sessionsCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subscriptions</p>
              <p className="text-2xl font-bold">{data.rawData.subscriptionsCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payments</p>
              <p className="text-2xl font-bold">{data.rawData.paymentsCount}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


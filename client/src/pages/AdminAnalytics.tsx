import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, BarChart3, TrendingUp, Users, DollarSign, Lock, Clock, RefreshCw, User, PieChart, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Comprehensive Event Translation Map (from Tracking Plan)
const EVENT_TRANSLATIONS: Record<string, string> = {
  // Authentication & Onboarding
  login_successful: "User logged in successfully.",
  login_otp_success: "User successfully logged into the app. Measures successful authentication.",
  returning_user_login: "User came back after 24h!",
  signup_started: "User started the signup process.",
  otp_verified: "User verified their phone number with OTP.",
  daily_active_user: "User was active today.",
  
  // Persona Selection
  persona_selected: "User chose their AI type.",
  persona_selection: "User selected a persona type.",
  persona_alignment_viewed: "User viewed persona alignment information.",
  
  // Chat & Messaging
  chat_sent: "User successfully sent a message to Riya. Measures core product usage.",
  message_sent: "User sent a chat message.",
  chat_opened: "User opened the chat interface.",
  tip_clicked: "User engaged with a suggested conversation starter.",
  free_message_warning_shown: "User saw the 18-msg warning.",
  message_limit_hit: "PAYWALL TRIGGERED (20 Msgs).",
  paywall_triggered: "User hit their free message limit and saw the upgrade popup. Key trigger for conversion funnel.",
  
  // Payments & Conversion
  pay_daily_selected: "User clicked the ₹19 'Daily Pass' button on the paywall.",
  pay_weekly_selected: "User clicked the ₹49 'Weekly Pass' button on the paywall.",
  payment_successful: "User completed a payment successfully.",
  payment_failed: "User's payment attempt failed.",
  
  // Features & CTAs
  cta_voice_call_clicked: "User tried to start a voice call.",
  cta_summary_clicked: "User clicked to view summary.",
  voice_call_started: "User initiated a voice call with Riya.",
  voice_call_ended: "User ended a voice call with Riya.",
  
  // Session & Engagement
  session_start: "User opened the application for the first time in a session.",
  session_length_recorded: "Session length was recorded.",
  profile_edit_attempt: "User clicked the button to edit their own profile information.",
};

// Get event explanation with property details
export function getEventExplanation(eventName: string, eventData?: any): string {
  const baseExplanation = EVENT_TRANSLATIONS[eventName] || `Technical event: ${eventName}`;
  
  // Add property details if available
  if (eventData) {
    const details: string[] = [];
    
    if (eventData.persona_type) details.push(`Persona: ${eventData.persona_type}`);
    if (eventData.message_count !== undefined) details.push(`Messages: ${eventData.message_count}`);
    if (eventData.total_messages_sent !== undefined) details.push(`Total: ${eventData.total_messages_sent}`);
    if (eventData.session_length_sec) details.push(`Session: ${Math.round(eventData.session_length_sec / 60)}min`);
    if (eventData.placement) details.push(`Placement: ${eventData.placement}`);
    if (eventData.days_since_last_session) details.push(`Days since last: ${eventData.days_since_last_session}`);
    if (eventData.returning_user) details.push(`Returning: ${eventData.returning_user ? 'Yes' : 'No'}`);
    
    if (details.length > 0) {
      return `${baseExplanation} (${details.join(', ')})`;
    }
  }
  
  return baseExplanation;
}

// Get screen color based on event place/name
export function getScreenColor(eventPlace: string, eventName: string): string {
  const place = (eventPlace || '').toLowerCase();
  const name = (eventName || '').toLowerCase();
  
  if (place.includes('chat') || name.includes('message') || name.includes('chat')) {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  if (place.includes('paywall') || name.includes('paywall') || name.includes('limit')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  if (place.includes('onboard') || name.includes('signup') || name.includes('persona')) {
    return 'bg-purple-100 text-purple-700 border-purple-200';
  }
  if (name.includes('payment') || name.includes('pay_')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

interface AnalyticsData {
  metrics: {
    // Pulse Cards
    dailyActiveUsers: number;
    retentionRate: number;
    paywallEfficiency: number;
    avgSessionTime: number;
    // Legacy
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
  // Charts data
  personaPopularity: Array<{ persona: string; count: number }>;
  conversionFunnel: {
    signup_started: number;
    otp_verified: number;
    persona_selected: number;
    chat_opened: number;
    message_limit_hit: number;
  };
  featureUsage: {
    voice_call_clicked: number;
    summary_clicked: number;
    persona_alignment_viewed: number;
  };
  // Tables
  recentEvents: Array<{
    event_time: string;
    user_id: string;
    event_name: string;
    event_place: string;
    event_data?: any;
  }>;
  top5EventNames: Array<{ name: string; count: number }>;
  top5EventPlaces: Array<{ place: string; count: number }>;
  // User list
  uniqueUserIds: string[];
  // Raw data
  rawData: {
    eventsCount: number;
    sessionsCount: number;
    subscriptionsCount: number;
    paymentsCount: number;
  };
  // Debug info (optional)
  debug?: {
    totalEventsFetched: number;
    filteredEventsCount: number;
    recentEventsCount: number;
    sampleEvent: any;
  };
}

// Admin password - stored as constant
const ADMIN_PASSWORD = 'nuvoro@101';
const AUTH_STORAGE_KEY = 'admin_analytics_auth';

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [days, setDays] = useState(7);
  const [selectedUserId, setSelectedUserId] = useState<string>('all'); // 'all' for global view
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    } else {
      setShowPasswordDialog(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
      toast({
        title: "Access Granted",
        description: "Welcome to Admin Analytics",
      });
      setPassword('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setShowPasswordDialog(true);
    setPassword('');
    toast({
      title: "Logged Out",
      description: "You have been logged out of Admin Analytics",
    });
  };

  const { data, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics', days, selectedUserId, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const url = `/api/admin/analytics?days=${days}&userId=${user.id}${selectedUserId !== 'all' ? `&filterUserId=${selectedUserId}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // If auth fails, clear session and show password dialog
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          setIsAuthenticated(false);
          setShowPasswordDialog(true);
          throw new Error('Session expired. Please enter the password again.');
        }
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    retry: false,
    enabled: !!user?.id && isAuthenticated, // Only fetch if user is logged in AND password authenticated
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  // getEventExplanation is now defined above with property details support

  // Password Dialog
  if (showPasswordDialog && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          if (!open && !isAuthenticated) {
            // Don't allow closing without authentication - redirect to chat
            setLocation('/chat');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <DialogTitle>Admin Access Required</DialogTitle>
              </div>
              <DialogDescription>
                Please enter the admin password to access the analytics dashboard.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter admin password"
                  className={passwordError ? 'border-red-500' : ''}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Access Dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/chat')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
    <div className="h-full w-full overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                Protected
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Data from {new Date(data.metrics.dateRange.start).toLocaleDateString()} to{' '}
              {new Date(data.metrics.dateRange.end).toLocaleDateString()} ({data.metrics.dateRange.days} days)
              {selectedUserId !== 'all' && (
                <span className="ml-2 text-blue-600 font-medium">
                  • Viewing user: {selectedUserId.substring(0, 8)}...
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* User Selector */}
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users (Global View)</SelectItem>
                {data.uniqueUserIds?.map((userId) => (
                  <SelectItem key={userId} value={userId}>
                    {userId.substring(0, 12)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <Lock className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Section 1: The "Pulse" Cards (Global View) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users (DAU)</p>
                <p className="text-3xl font-bold mt-2">{data.metrics.dailyActiveUsers || data.metrics.totalActiveUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">Last {days} days</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                <p className="text-3xl font-bold mt-2">{data.metrics.retentionRate?.toFixed(1) || '0.0'}%</p>
                <p className={`text-xs mt-1 ${(data.metrics.retentionRate || 0) > 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {(data.metrics.retentionRate || 0) > 20 ? '✓ Good' : 'Returning users'}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paywall Efficiency</p>
                <p className="text-3xl font-bold mt-2">{data.metrics.paywallEfficiency?.toFixed(1) || '0.0'}%</p>
                <p className="text-xs text-muted-foreground mt-1">Selection rate</p>
              </div>
              <DollarSign className="w-10 h-10 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Session Time</p>
                <p className="text-3xl font-bold mt-2">
                  {data.metrics.avgSessionTime ? `${Math.round(data.metrics.avgSessionTime / 60)}m` : '0m'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Average duration</p>
              </div>
              <Clock className="w-10 h-10 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Section 2: Engagement Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart A: Persona Popularity (Pie Chart) */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Persona Popularity
            </h2>
            {data.personaPopularity && data.personaPopularity.length > 0 ? (
              <div className="space-y-3">
                {data.personaPopularity.map((item, index) => {
                  const total = data.personaPopularity.reduce((sum, p) => sum + p.count, 0);
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
                  return (
                    <div key={item.persona} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{item.persona || 'Unknown'}</span>
                        <span className="text-sm font-bold">{item.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${colors[index % colors.length]} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No persona selections yet</p>
            )}
          </Card>

          {/* Chart B: Conversion Funnel (Bar Chart) */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Conversion Funnel
            </h2>
            {data.conversionFunnel ? (
              <div className="space-y-3">
                {[
                  { label: 'Signup Started', value: data.conversionFunnel.signup_started },
                  { label: 'OTP Verified', value: data.conversionFunnel.otp_verified },
                  { label: 'Persona Selected', value: data.conversionFunnel.persona_selected },
                  { label: 'Chat Opened', value: data.conversionFunnel.chat_opened },
                  { label: 'Paywall Hit', value: data.conversionFunnel.message_limit_hit },
                ].map((step, index) => {
                  const maxValue = Math.max(...[
                    data.conversionFunnel.signup_started,
                    data.conversionFunnel.otp_verified,
                    data.conversionFunnel.persona_selected,
                    data.conversionFunnel.chat_opened,
                    data.conversionFunnel.message_limit_hit,
                  ]);
                  const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
                  return (
                    <div key={step.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{step.label}</span>
                        <span className="text-sm font-bold">{step.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No funnel data yet</p>
            )}
          </Card>

          {/* Chart C: Feature Usage (Horizontal Bars) */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Feature Usage
            </h2>
            {data.featureUsage ? (
              <div className="space-y-4">
                {[
                  { label: 'Voice Call Clicked', value: data.featureUsage.voice_call_clicked },
                  { label: 'Summary Clicked', value: data.featureUsage.summary_clicked },
                  { label: 'Persona Alignment Viewed', value: data.featureUsage.persona_alignment_viewed },
                ].map((feature) => {
                  const maxValue = Math.max(
                    data.featureUsage.voice_call_clicked,
                    data.featureUsage.summary_clicked,
                    data.featureUsage.persona_alignment_viewed
                  );
                  const percentage = maxValue > 0 ? (feature.value / maxValue) * 100 : 0;
                  return (
                    <div key={feature.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{feature.label}</span>
                        <span className="text-sm font-bold">{feature.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No feature usage data yet</p>
            )}
          </Card>
        </div>

        {/* Section 3: The "User Journey" Table - Preview with Link to Full Page */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">User Journey Table</h2>
            <Button
              onClick={() => setLocation('/admin/analytics/journey')}
              className="flex items-center gap-2"
            >
              View Full Table
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Preview of recent events */}
          <div className="space-y-3">
            {data.recentEvents && data.recentEvents.slice(0, 5).map((event, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 w-32 text-xs font-mono text-muted-foreground">
                  {new Date(event.event_time).toLocaleString()}
                </div>
                <div className="flex-shrink-0 w-24 font-mono text-xs text-muted-foreground">
                  {event.user_id !== 'N/A' ? `${event.user_id.substring(0, 8)}...` : 'N/A'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded">{event.event_name}</code>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScreenColor(event.event_place, event.event_name)}`}>
                      {event.event_place || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {getEventExplanation(event.event_name, event.event_data)}
                  </p>
                </div>
              </div>
            ))}
            {(!data.recentEvents || data.recentEvents.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No events found. Events will appear here as they are tracked.</p>
              </div>
            )}
            {data.recentEvents && data.recentEvents.length > 5 && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/admin/analytics/journey')}
                  className="w-full"
                >
                  View All {data.recentEvents.length} Events
                </Button>
              </div>
            )}
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


import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Search, Filter, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getEventExplanation, getScreenColor } from "./AdminAnalytics";

interface Event {
  event_time: string;
  user_id: string;
  event_name: string;
  event_place: string;
  event_data?: any;
}

export default function UserJourneyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [days, setDays] = useState(7);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 50;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<{
    recentEvents: Event[];
    uniqueUserIds: string[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ['/api/admin/journey', days, selectedUserId, searchQuery, eventFilter, currentPage, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      // Use new paginated endpoint
      const url = `/api/admin/journey?days=${days}&page=${currentPage}&limit=${eventsPerPage}&userId=${user.id}${selectedUserId !== 'all' ? `&filterUserId=${selectedUserId}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}${eventFilter !== 'all' ? `&event_type=${encodeURIComponent(eventFilter)}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      return {
        recentEvents: result.events || [],
        uniqueUserIds: [] // Will be fetched separately if needed
      };
    },
    retry: false,
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Server-side filtering is now handled by the API
  // Client-side filtering is minimal (just for display)
  const filteredEvents = data?.recentEvents || [];
  const paginatedEvents = filteredEvents;
  const totalPages = data?.pagination?.totalPages || 1;

  // Get unique event names for filter
  const uniqueEventNames = Array.from(new Set(data?.recentEvents?.map(e => e.event_name) || [])).sort();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Loading user journey data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="text-destructive text-lg font-semibold">Error Loading Data</div>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/admin/analytics')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Analytics
            </Button>
            <div>
              <h1 className="text-3xl font-bold">User Journey Table</h1>
              <p className="text-muted-foreground mt-1">
                Detailed event tracking and user behavior analysis
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {data?.uniqueUserIds?.map((userId) => (
                  <SelectItem key={userId} value={userId}>
                    {userId.substring(0, 12)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={days === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => { setDays(7); setCurrentPage(1); }}
            >
              7 Days
            </Button>
            <Button
              variant={days === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => { setDays(30); setCurrentPage(1); }}
            >
              30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search events, screens, or user IDs..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {uniqueEventNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {paginatedEvents.length} of {data?.pagination?.total || filteredEvents.length} events
              {selectedUserId !== 'all' && ` for selected user`}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-refreshing every 10 seconds</span>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-20">
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold sticky left-0 bg-muted/50 z-30 min-w-[180px]">Time</th>
                  <th className="text-left p-4 font-semibold min-w-[120px]">User ID</th>
                  <th className="text-left p-4 font-semibold min-w-[200px]">Event Name</th>
                  <th className="text-left p-4 font-semibold min-w-[150px]">Screen</th>
                  <th className="text-left p-4 font-semibold min-w-[300px]">Explanation</th>
                  <th className="text-left p-4 font-semibold min-w-[200px]">Properties</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.length > 0 ? (
                  paginatedEvents.map((event, index) => (
                    <tr 
                      key={`${event.event_time}-${event.user_id}-${index}`} 
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 text-xs font-mono sticky left-0 bg-background z-10">
                        <div className="font-semibold">
                          {new Date(event.event_time).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(event.event_time).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <button
                          onClick={() => {
                            setSelectedUserId(event.user_id);
                            setCurrentPage(1);
                            toast({
                              title: "Filtered by user",
                              description: "Showing events for this user only",
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {event.user_id !== 'N/A' ? `${event.user_id.substring(0, 12)}...` : 'N/A'}
                        </button>
                      </td>
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{event.event_name}</code>
                          {event.event_name === 'message_sent' && event.event_data?.session_id && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/admin/session/${event.event_data.session_id}/transcript`, {
                                    headers: { 'Content-Type': 'application/json' }
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    setTranscriptData(data);
                                    setSelectedSessionId(event.event_data.session_id);
                                    setShowTranscriptModal(true);
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "Failed to load transcript",
                                      variant: "destructive"
                                    });
                                  }
                                } catch (err) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to load transcript",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                              title="View conversation transcript"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getScreenColor(event.event_place, event.event_name)}`}>
                          {event.event_place || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-xs max-w-md">
                        {getEventExplanation(event.event_name, event.event_data)}
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground max-w-xs">
                        {event.event_data && Object.keys(event.event_data).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800 font-sans font-medium">
                              View ({Object.keys(event.event_data).length} props)
                            </summary>
                            <pre className="mt-2 text-[10px] bg-gray-50 p-3 rounded overflow-auto max-h-60 border">
                              {JSON.stringify(event.event_data, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">No properties</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-semibold">No events found</p>
                        <p className="text-sm">
                          {searchQuery || eventFilter !== 'all' || selectedUserId !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Events will appear here as they are tracked'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredEvents.length} events)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Transcript Modal */}
        <Dialog open={showTranscriptModal} onOpenChange={setShowTranscriptModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Conversation Transcript</span>
                <button
                  onClick={() => setShowTranscriptModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </DialogTitle>
              <DialogDescription>
                Session: {selectedSessionId?.substring(0, 12)}...
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              {transcriptData?.transcript && transcriptData.transcript.length > 0 ? (
                transcriptData.transcript.map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-50 ml-8 border-l-4 border-blue-500'
                        : 'bg-purple-50 mr-8 border-l-4 border-purple-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        {msg.role === 'user' ? '👤 User' : '🤖 Riya'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No transcript available</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


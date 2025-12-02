import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, MessageCircle, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionWithPreview {
    id: string;
    user_id: string;
    type: string;
    created_at: string;
    createdAt?: string;
    messageCount: number;
    preview: {
        userMessage: string | null;
        aiResponse: string | null;
    };
}

export default function HistoryPage() {
    const [, setLocation] = useLocation();

    const { data: sessions, isLoading } = useQuery<SessionWithPreview[]>({
        queryKey: ["/api/sessions"],
        queryFn: async () => {
            try {
                const response = await fetch("/api/sessions", {
                    credentials: "include",
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        return [];
                    }
                    throw new Error(`Failed to fetch: ${response.status}`);
                }
                const data = await response.json();
                return Array.isArray(data) ? data : [];
            } catch (err) {
                console.error("[HistoryPage] Fetch error:", err);
                return [];
            }
        },
        retry: 1,
    });

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/chat")}
                    className="rounded-full hover:bg-secondary/20"
                    data-testid="button-back"
                >
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">Chat History</h1>
            </header>

            {/* Content */}
            <main className="flex-1 container max-w-2xl mx-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        Loading history...
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
                        <MessageCircle className="h-12 w-12 opacity-20" />
                        <p>No chat history found.</p>
                        <Button onClick={() => setLocation("/chat")} data-testid="button-start-chat">
                            Start a Conversation
                        </Button>
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-6rem)]">
                        <div className="space-y-4 pb-8">
                            {sessions?.map((session) => (
                                <Card
                                    key={session.id}
                                    className="cursor-pointer hover:shadow-md transition-all border-secondary/20 hover:border-primary/30"
                                    onClick={() => setLocation(`/history/${session.id}`)}
                                    data-testid={`card-session-${session.id}`}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-medium text-primary">
                                                {format(new Date(session.created_at || session.createdAt || new Date()), "MMMM d, yyyy")}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">
                                                    {session.type === "call" ? "Voice Call" : "Chat"}
                                                </span>
                                                {session.messageCount > 0 && (
                                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full" data-testid={`text-message-count-${session.id}`}>
                                                        {session.messageCount} msgs
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>
                                                    {format(new Date(session.created_at || session.createdAt || new Date()), "h:mm a")}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Message Preview */}
                                        {session.preview?.userMessage && (
                                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">You</span>
                                                    <p className="text-sm text-gray-700 line-clamp-2" data-testid={`text-user-preview-${session.id}`}>
                                                        {session.preview.userMessage}
                                                    </p>
                                                </div>
                                                {session.preview?.aiResponse && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-xs font-medium text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">Riya</span>
                                                        <p className="text-sm text-gray-600 line-clamp-2" data-testid={`text-ai-preview-${session.id}`}>
                                                            {session.preview.aiResponse}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center justify-end text-xs text-primary">
                                            <span>View conversation</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </main>
        </div>
    );
}

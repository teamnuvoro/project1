import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Session } from "@shared/schema";
import { format } from "date-fns";
import { ArrowLeft, MessageCircle, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
    const [, setLocation] = useLocation();

    const { data: sessions, isLoading } = useQuery<Session[]>({
        queryKey: ["/api/sessions"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/sessions");
            const data = await response.json();
            return data.sessions;
        },
    });

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/")}
                    className="rounded-full hover:bg-secondary/20"
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
                        <Button onClick={() => setLocation("/")}>Start a Conversation</Button>
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-6rem)]">
                        <div className="space-y-4 pb-8">
                            {sessions?.map((session) => (
                                <Card
                                    key={session.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow border-secondary/20"
                                    onClick={() => {
                                        setLocation(`/history/${session.id}`);
                                    }}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-medium text-primary">
                                                {format(new Date(session.createdAt || new Date()), "MMMM d, yyyy")}
                                            </CardTitle>
                                            <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">
                                                {session.type === "call" ? "Voice Call" : "Chat"}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>
                                                    {format(new Date(session.createdAt || new Date()), "h:mm a")}
                                                </span>
                                            </div>
                                            {/* We could add duration or message count here if available in the list view */}
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

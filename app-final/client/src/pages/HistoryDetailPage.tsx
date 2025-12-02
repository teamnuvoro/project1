import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Session, Message } from "@shared/schema";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface SessionDetail {
    session: Session;
    messages: Message[];
}

export default function HistoryDetailPage() {
    const [, params] = useRoute("/history/:id");
    const [, setLocation] = useLocation();
    const sessionId = params?.id;

    const { data, isLoading } = useQuery<SessionDetail>({
        queryKey: [`/api/sessions/${sessionId}`],
        queryFn: async () => {
            const response = await apiRequest("GET", `/api/sessions/${sessionId}`);
            return response.json();
        },
        enabled: !!sessionId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-muted-foreground">
                Loading conversation...
            </div>
        );
    }

    if (!data || !data.session) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-muted-foreground">Session not found</p>
                <Button onClick={() => setLocation("/history")}>Back to History</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/history")}
                    className="rounded-full hover:bg-secondary/20"
                >
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-base font-bold text-foreground">
                        {format(new Date(data.session.createdAt || new Date()), "MMMM d, yyyy")}
                    </h1>
                    <span className="text-xs text-muted-foreground">
                        {format(new Date(data.session.createdAt || new Date()), "h:mm a")} • {data.messages.length} messages
                    </span>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 container max-w-2xl mx-auto p-4">
                <ScrollArea className="h-[calc(100vh-6rem)] pr-4">
                    <div className="space-y-6 pb-8">
                        {data.messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                                    }`}
                            >
                                <Avatar className="h-8 w-8 mt-1">
                                    {message.role === "ai" ? (
                                        <>
                                            <AvatarImage src="/assets/riya-avatar.png" />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                <Bot className="h-4 w-4" />
                                            </AvatarFallback>
                                        </>
                                    ) : (
                                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                                            <User className="h-4 w-4" />
                                        </AvatarFallback>
                                    )}
                                </Avatar>

                                <div
                                    className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm leading-relaxed ${message.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-secondary/50 text-foreground rounded-tl-none"
                                        }`}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}

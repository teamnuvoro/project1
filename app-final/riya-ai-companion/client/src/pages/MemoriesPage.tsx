import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Loader2, Brain, Calendar, Star } from "lucide-react";
import { ChatHeader } from "@/components/chat/ChatHeader";

interface Memory {
    id: string;
    memoryType: string;
    content: string;
    context: string;
    importanceScore: number;
    createdAt: string;
    scheduledFollowupAt?: string;
}

export default function MemoriesPage() {
    const { data: memories, isLoading } = useQuery<Memory[]>({
        queryKey: ["memories"],
        queryFn: async () => {
            const res = await fetch("/api/memories");
            if (!res.ok) throw new Error("Failed to fetch memories");
            return res.json();
        },
    });

    return (
        <div className="flex flex-col h-screen bg-background">
            <ChatHeader />

            <main className="flex-1 container max-w-2xl mx-auto p-4">
                <div className="flex items-center gap-2 mb-6">
                    <Brain className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold">Riya's Memory</h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !memories?.length ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <p>Riya hasn't remembered anything specific yet.</p>
                            <p className="text-sm mt-2">Chat with her about your life to build memories!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                        <div className="space-y-4">
                            {memories.map((memory) => (
                                <Card key={memory.id} className="relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${memory.importanceScore >= 8 ? 'bg-red-500' :
                                            memory.importanceScore >= 5 ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                        }`} />
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary capitalize">
                                                    {memory.memoryType.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(memory.createdAt), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                            {memory.importanceScore >= 8 && (
                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            )}
                                        </div>
                                        <CardTitle className="text-lg mt-2">{memory.content}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {memory.context}
                                        </p>
                                        {memory.scheduledFollowupAt && (
                                            <div className="flex items-center gap-2 text-xs text-blue-500 mt-2 bg-blue-50/50 p-2 rounded">
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    Follow-up planned for {format(new Date(memory.scheduledFollowupAt), "MMM d 'at' h:mm a")}
                                                </span>
                                            </div>
                                        )}
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

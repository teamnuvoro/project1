import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Message, type Session } from "@shared/schema";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { analytics } from "@/lib/analytics";
import { sendChatMessageStreaming, useEdgeFunctions, isEdgeFunctionsConfigured } from "@/lib/edgeFunctions";

interface OptimisticMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  sessionId: string;
  createdAt: Date;
  isOptimistic?: boolean;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [failedMessage, setFailedMessage] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);

  // Get userId from auth context or localStorage
  const userId: string | null = user?.id || localStorage.getItem('userId');

  const { data: session, isLoading: isSessionLoading } = useQuery<Session>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get session");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });

  const { data: messages = [], isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: ["messages", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const res = await fetch(`/api/messages?sessionId=${session?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 1500,
    staleTime: 0,
  });

  useEffect(() => {
    if (messages.length > 0 && optimisticMessages.length > 0) {
      const serverMessageContents = new Set(
        messages.map(m => m.content.trim().toLowerCase())
      );
      
      setOptimisticMessages(prev => 
        prev.filter(optMsg => 
          !serverMessageContents.has(optMsg.content.trim().toLowerCase())
        )
      );
    }
  }, [messages]);

  interface UserUsage {
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    messageLimitReached: boolean;
    callLimitReached: boolean;
  }

  const { data: userUsage } = useQuery<UserUsage>({
    queryKey: ["/api/user/usage"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user/usage");
        if (!res.ok) {
          return { messageCount: 0, callDuration: 0, premiumUser: false, messageLimitReached: false, callLimitReached: false };
        }
        return res.json();
      } catch {
        return { messageCount: 0, callDuration: 0, premiumUser: false, messageLimitReached: false, callLimitReached: false };
      }
    },
    staleTime: 30000,
  });

  const quickReplies = [
    "Mera current relationship confusing hai",
    "Kaise pata chalega koi mujhe pasand karta hai?",
    "Main kya dhundh raha hoon samajhna chahta hoon",
    "Mujhe dating advice chahiye",
    "Mujhe trust issues ho rahe hain",
    "Kaise pata chalega main relationship ready hoon?"
  ];

  const isLoading = isSessionLoading;
  const isDev = import.meta.env.MODE === 'development';
  const isLimitReached = !isDev && (userUsage?.messageLimitReached || userUsage?.callLimitReached) && !userUsage?.premiumUser;

  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addOptimisticMessage = useCallback((content: string) => {
    if (!session) return null;
    
    const optimisticMsg: OptimisticMessage = {
      id: generateTempId(),
      content,
      role: "user",
      sessionId: session.id,
      createdAt: new Date(),
      isOptimistic: true,
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    setFailedMessage("");
    
    return optimisticMsg;
  }, [session]);

  const removeOptimisticMessage = useCallback((messageId: string) => {
    setOptimisticMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, optimisticId }: { content: string; optimisticId: string }) => {
      const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();
      
      console.log("=== CHAT DEBUG START ===");
      console.log("1. Using Edge Functions:", shouldUseEdge);
      console.log("2. Session ID:", session?.id);
      console.log("3. User ID:", userId);
      console.log("4. Message content:", content.substring(0, 50));
      
      if (!session) {
        console.error("ERROR: No active session!");
        throw new Error("No active session");
      }

      if (!userId) {
        console.error("ERROR: User not authenticated - userId is:", userId);
        throw new Error("User not authenticated. Please log in to continue.");
      }

      setIsTyping(true);
      setStreamingMessage("");
      abortControllerRef.current = new AbortController();

      // =========================================================================
      // NEW: Use Supabase Edge Function when configured
      // =========================================================================
      if (shouldUseEdge) {
        console.log("5. Using Supabase Edge Function: chat-v2");
        let accumulatedMessage = "";

        try {
          const result = await sendChatMessageStreaming(
            content,
            session.id,
            userId,
            {
              onChunk: (text) => {
                accumulatedMessage += text;
                setStreamingMessage(accumulatedMessage);
              },
              onComplete: (data) => {
                console.log("6. Stream complete:", data);
                setIsTyping(false);
                setStreamingMessage("");
                if (session?.id) {
                  queryClient.invalidateQueries({ queryKey: ["messages", session.id] });
                }
                queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
              },
              onError: (error) => {
                console.error("Stream error:", error);
                throw error;
              },
            },
            abortControllerRef.current.signal
          );

          if (result.reason === 'paywall' || result.reason === 'limit') {
            setIsTyping(false);
            removeOptimisticMessage(optimisticId);
            setPaywallOpen(true);
            queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
            return { success: false, reason: result.reason };
          }

          if (result.reason === 'aborted') {
            console.log("Stream aborted by user");
            setIsTyping(false);
            setStreamingMessage("");
            removeOptimisticMessage(optimisticId);
            return { success: false, reason: 'aborted' };
          }

          return result;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log("Stream aborted by user");
            setIsTyping(false);
            setStreamingMessage("");
            removeOptimisticMessage(optimisticId);
            return { success: false, reason: 'aborted' };
          }
          console.warn("[ChatPage] Edge Function error, falling back to Express:", error.message);
          // Reset streaming state before falling through to Express
          setStreamingMessage("");
          // DON'T set isTyping to false - Express fallback will continue with typing indicator
        }
      }

      // =========================================================================
      // Express API fallback (used when Edge Functions not configured or failed)
      // Note: isTyping is already true from the beginning of mutationFn
      // =========================================================================
      const requestBody = { 
        content, 
        sessionId: session.id,
        userId: userId
      };
      
      console.log("5. Request body (Express fallback):", JSON.stringify(requestBody));

      try {
        console.log("6. Sending fetch to /api/chat...");
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });
        
        console.log("7. Response status:", response.status, response.statusText);

        if (response.status === 402) {
          setIsTyping(false);
          removeOptimisticMessage(optimisticId);
          setPaywallOpen(true);
          queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
          return { success: false, reason: 'paywall' };
        }

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await response.json();
          if (data.limitExceeded) {
            setIsTyping(false);
            removeOptimisticMessage(optimisticId);
            setPaywallOpen(true);
            queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
            return { success: false, reason: 'limit' };
          }
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error("ERROR: No response body available!");
          throw new Error("No response body");
        }

        console.log("8. Got reader, starting to read stream...");
        let accumulatedMessage = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            setIsTyping(false);
            setStreamingMessage("");
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.done) {
                  setIsTyping(false);
                  setStreamingMessage("");
                  if (session?.id) {
                    queryClient.invalidateQueries({ queryKey: ["messages", session.id] });
                  }
                  queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
                  return { success: true };
                }

                if (data.content) {
                  accumulatedMessage += data.content;
                  setStreamingMessage(accumulatedMessage);
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError);
              }
            }
          }
        }

        if (session) {
          queryClient.invalidateQueries({ queryKey: ["messages", session.id] });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
        return { success: true };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("Stream aborted by user (Express fallback)");
          setIsTyping(false);
          setStreamingMessage("");
          removeOptimisticMessage(optimisticId);
          return { success: false, reason: 'aborted' };
        } else {
          throw error;
        }
      } finally {
        setIsTyping(false);
        setStreamingMessage("");
      }
    },
    onError: (error, variables) => {
      console.error("=== CHAT ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Variables:", variables);
      
      setIsTyping(false);
      setStreamingMessage("");
      removeOptimisticMessage(variables.optimisticId);
      setFailedMessage(variables.content);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (content: string) => {
    // Verify userId exists before attempting to send
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to send messages.",
        variant: "destructive",
      });
      return;
    }

    const optimisticMsg = addOptimisticMessage(content);
    if (!optimisticMsg) return;

    analytics.track("message_sent", {
      length: content.length,
      voiceMode: voiceModeEnabled,
      userId: userId
    });
    
    sendMessageMutation.mutate({ 
      content, 
      optimisticId: optimisticMsg.id 
    });
  };

  const serverMessageIds = new Set(messages.map(m => m.content.trim().toLowerCase()));
  const filteredOptimistic = optimisticMessages.filter(
    optMsg => !serverMessageIds.has(optMsg.content.trim().toLowerCase())
  );

  const displayMessages: (Message | OptimisticMessage)[] = [
    ...messages,
    ...filteredOptimistic,
  ];

  if (streamingMessage && session) {
    displayMessages.push({
      id: "streaming",
      content: streamingMessage,
      role: "assistant",
      sessionId: session.id,
      createdAt: new Date(),
      isStreaming: true,
    });
  }

  // Only show loading skeleton during initial page load
  if (isLoading && !session) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="gradient-header h-16" />
        <div className="flex-1 overflow-hidden flex flex-col gap-4 p-4 bg-gradient-to-b from-purple-50/50 to-white">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="h-12 w-2/3 rounded-2xl ml-auto" />
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      <div className="flex-shrink-0">
        <ChatHeader 
          sessionId={session?.id} 
          voiceModeEnabled={voiceModeEnabled}
          onVoiceModeToggle={() => setVoiceModeEnabled(!voiceModeEnabled)}
          onPaymentClick={() => setPaywallOpen(true)}
          userUsage={userUsage}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatMessages 
          messages={displayMessages as Message[]} 
          isLoading={isMessagesLoading}
          isMobile={isMobile}
          isTyping={isTyping}
        />
      </div>

      <div className="flex-shrink-0">
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending || isTyping}
          disabled={isLimitReached}
          isMobile={isMobile}
          quickReplies={messages.length <= 3 ? quickReplies : []}
          failedMessage={failedMessage}
        />
      </div>

      <PaywallSheet open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}

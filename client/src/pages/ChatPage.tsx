import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Message, type Session } from "@shared/schema";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { AmplitudePasswordModal } from "@/components/AmplitudePasswordModal";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { useExitIntent } from "@/hooks/useExitIntent";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { analytics } from "@/lib/analytics";
import { useLocation } from "wouter";
import { 
  trackChatOpened, 
  trackMessageSent, 
  trackMessageReceived,
  trackSessionStarted,
  trackMessageLimitHit,
  trackPaywallShown
} from "@/utils/amplitudeTracking";

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
  const [, setLocation] = useLocation();
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [amplitudePasswordOpen, setAmplitudePasswordOpen] = useState(false);
  
  // Exit intent detection - triggers when user tries to leave
  const { showModal: showExitModal, closeModal: closeExitModal } = useExitIntent({
    enabled: true,
    sensitivity: 30,
    delay: 60000, // Show again after 60 seconds
  });

  // Listen for paywall open event from navbar
  useEffect(() => {
    const handleOpenPaywall = () => {
      setPaywallOpen(true);
      trackPaywallShown('chat_limit');
    };
    window.addEventListener('openPaywall', handleOpenPaywall);
    return () => window.removeEventListener('openPaywall', handleOpenPaywall);
  }, []);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [failedMessage, setFailedMessage] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);

  const { data: session, isLoading: isSessionLoading } = useQuery<Session>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get session");
      return res.json();
    }
  });

  const { data: messages = [], isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: ["messages", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const res = await fetch(`/api/messages?sessionId=${session?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: false, // Disable auto-refetch to prevent message disappearing
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Track chat opened and session started (after session and messages are defined)
  useEffect(() => {
    if (session?.id) {
      trackChatOpened('riya', user?.premium_user || false);
      trackSessionStarted('chat', messages.length + 1);
    }
  }, [session?.id, user?.premium_user, messages.length]);

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
    
    // Clear streaming message if we have a matching AI message in the list
    if (streamingMessage && messages.length > 0) {
      const streamingText = streamingMessage.trim().toLowerCase();
      const hasMatchingMessage = messages.some(msg => {
        if (msg.role !== 'ai') return false;
        const msgText = (msg.content || msg.text || '').trim().toLowerCase();
        // Check if messages match (allowing for small differences)
        return msgText.length > 0 && (
          msgText === streamingText ||
          msgText.includes(streamingText.substring(0, Math.min(30, streamingText.length))) ||
          streamingText.includes(msgText.substring(0, Math.min(30, msgText.length)))
        );
      });
      
      if (hasMatchingMessage) {
        console.log('[Chat] Found matching message in list, clearing streaming message');
        setStreamingMessage("");
      }
    }
  }, [messages, streamingMessage]);

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
  const isLimitReached = false; // Disabled for testing - no message limits

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
      if (!session) {
        throw new Error("No active session");
      }

      setIsTyping(true);
      setStreamingMessage("");

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, sessionId: session.id }),
          signal: abortControllerRef.current.signal,
        });

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
          throw new Error("No response body");
        }

        let accumulatedMessage = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            setIsTyping(false);
            // Keep streaming message visible until actual message appears
            // It will be cleared when messages are refetched
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
                  
                  // If we have a full response in the done signal, keep it visible
                  if (data.fullResponse && accumulatedMessage) {
                    // Keep the streaming message visible - it will be replaced when fetched
                    console.log('[Chat] Stream complete, keeping message visible');
                  }
                  
                  // Wait longer before invalidating to ensure message is saved to database
                  if (session?.id) {
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["messages", session.id] });
                      // Clear streaming message after a longer delay to ensure it's replaced
                      setTimeout(() => {
                        // Only clear if we still have the streaming message (message should be in list by now)
                        setStreamingMessage(prev => {
                          if (prev) {
                            console.log('[Chat] Clearing streaming message after refetch');
                          }
                          return "";
                        });
                      }, 1000);
                    }, 1000);
                  } else {
                    // No session - clear immediately
                    setStreamingMessage("");
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
          // Wait longer for the message to be saved to database
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["messages", session.id] });
            // Don't clear streaming message here - let the useEffect handle it
            // when it detects the matching message in the list
          }, 1500);
        } else {
          // No session - keep streaming message visible for a bit
          setTimeout(() => setStreamingMessage(""), 2000);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
        return { success: true };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("Stream aborted by user");
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
      setIsTyping(false);
      setStreamingMessage("");
      removeOptimisticMessage(variables.optimisticId);
      setFailedMessage(variables.content);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
      console.error("Chat error:", error);
    },
  });

  const handleSendMessage = (content: string) => {
    const optimisticMsg = addOptimisticMessage(content);
    if (!optimisticMsg) return;

    // Track message sent
    trackMessageSent(content.length, messages.length + 1);
    
    analytics.track("message_sent", {
      length: content.length,
      voiceMode: voiceModeEnabled
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 overflow-hidden flex flex-col gap-4 p-4 bg-gradient-to-b from-purple-50/50 to-white">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="h-12 w-2/3 rounded-2xl ml-auto" />
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-white overflow-hidden relative">
      {/* Floating Amplitude Analytics Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔒 Lock button clicked! Opening password prompt...');
          setAmplitudePasswordOpen(true);
        }}
        className="flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '56px',
          height: '56px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          border: '3px solid white',
          cursor: 'pointer',
          fontSize: '24px',
          zIndex: 9999,
          pointerEvents: 'auto',
          animation: 'pulse 2s ease-in-out infinite',
        }}
        title="Open Amplitude Dashboard (Password Protected)"
        data-testid="amplitude-lock-button"
      >
        🔒
      </button>

      {/* Amplitude Password Modal */}
      <AmplitudePasswordModal
        isOpen={amplitudePasswordOpen}
        onClose={() => setAmplitudePasswordOpen(false)}
        onSuccess={() => {
          console.log('✅ Password correct! Opening Amplitude...');
          window.open('https://app.amplitude.com/analytics/silent-math-691128', '_blank');
        }}
      />

      {/* Exit Intent Modal */}
      <ExitIntentModal
        isOpen={showExitModal}
        onClose={closeExitModal}
      />

      {/* Scrollable Messages Area - Takes full height minus input */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <ChatMessages 
          messages={displayMessages as Message[]} 
          isLoading={isMessagesLoading}
          isMobile={isMobile}
          isTyping={isTyping}
        />
      </div>

      {/* Fixed Input at Bottom - Responsive */}
      <div className="flex-shrink-0 w-full">
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

      {/* Add CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(102, 126, 234, 0);
          }
        }
      `}</style>
    </div>
  );
}

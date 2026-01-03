import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Message, type Session } from "@shared/schema";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { AmplitudePasswordModal } from "@/components/AmplitudePasswordModal";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { useExitIntent } from "@/hooks/useExitIntent";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { analytics } from "@/lib/analytics";
import { useLocation } from "wouter";
import { FeedbackModal } from "@/components/FeedbackModal";
import { PersonaSelector } from "@/components/PersonaSelector";
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [paywallTriggered, setPaywallTriggered] = useState(false);
  const { toast } = useToast();
  const { user, refetchUser } = useAuth();
  const isMobile = useIsMobile();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>(user?.persona);
  const lastCacheUpdateRef = useRef<number>(0); // Track when we last updated cache manually

  const { data: session, isLoading: isSessionLoading, refetch: refetchSession } = useQuery<Session>({
    queryKey: ["session", user?.id],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/session", { userId: user?.id });
      const sessionData = await res.json();
      console.log(`[ChatPage] Session fetched: ${sessionData.id}`);
      return sessionData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents unnecessary refetches
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on focus - prevents race conditions
    // CRITICAL: Keep previous data during refetch to prevent query key changes
    placeholderData: (previousData) => previousData
  });

  const { data: messages = [], isLoading: isMessagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["messages", session?.id, user?.id],
    enabled: !!(session?.id && user?.id),
    queryFn: async () => {
      if (!session?.id || !user?.id) {
        console.log('[ChatPage] ⚠️ Cannot fetch messages: missing session or user ID');
        return [];
      }
      
      // Get current cache to prevent overwriting with stale data
      const currentCache = queryClient.getQueryData<Message[]>(['messages', session.id, user.id]);
      const cacheMessageCount = currentCache?.length || 0;
      
      const res = await apiRequest("GET", `/api/messages?sessionId=${session.id}&userId=${user.id}`);
      
      // CRITICAL: Check response headers BEFORE parsing JSON (headers are only readable once)
      // Check if backend returned messages from a different session (fallback scenario)
      let actualSessionId = session.id;
      const fallbackSessionId = res.headers.get('X-Session-Id');
      const isFallback = res.headers.get('X-Fallback-Session') === 'true';
      
      if (isFallback && fallbackSessionId && fallbackSessionId !== session.id) {
        console.log(`[ChatPage] 🔄 Backend used fallback session: ${fallbackSessionId} (requested: ${session.id})`);
        actualSessionId = fallbackSessionId;
      }
      
      const rawMessages = await res.json();
      console.log(`[ChatPage] ✅ Fetched ${rawMessages.length} messages for session: ${session.id} (cache had ${cacheMessageCount})`);
      
      // Also check message session IDs as backup (if headers weren't set)
      if (actualSessionId === session.id && rawMessages.length > 0) {
        const firstMsgSessionId = rawMessages[0].sessionId || rawMessages[0].session_id;
        if (firstMsgSessionId && firstMsgSessionId !== session.id) {
          console.log(`[ChatPage] ⚠️ Messages found in different session: ${firstMsgSessionId} (current: ${session.id})`);
          actualSessionId = firstMsgSessionId;
        }
      }
      
      // If session changed, update the session cache to keep UI in sync
      if (actualSessionId !== session.id && session) {
        console.log(`[ChatPage] 🔄 Updating session cache from ${session.id} to ${actualSessionId}`);
        // Update session query cache with the correct session ID
        queryClient.setQueryData(['session', user.id], { 
          ...session, 
          id: actualSessionId 
        });
        // Note: Don't invalidate messages query here - we already have the messages
        // Invalidating would cause a refetch and potential flicker
      }
      
      // Map backend format to frontend Message interface
      const mappedMessages = rawMessages.map((msg: any) => ({
        id: msg.id,
        sessionId: msg.session_id || msg.sessionId,
        content: msg.text || msg.content, // Fallback for various backend formats
        role: msg.role === 'ai' ? 'assistant' : msg.role, // normalize 'ai' -> 'assistant'
        createdAt: new Date(msg.created_at || msg.createdAt),
        tag: msg.tag,
        imageUrl: msg.imageUrl || msg.image_url || undefined, // Include image URL
        personaId: msg.personaId || msg.persona_id || undefined // Include persona ID
      }));
      
      // SAFEGUARD: If we recently updated cache manually (< 10 seconds ago) and server has fewer messages,
      // prefer the cache to prevent disappearing messages
      const timeSinceCacheUpdate = Date.now() - lastCacheUpdateRef.current;
      if (timeSinceCacheUpdate < 10000 && cacheMessageCount > mappedMessages.length && currentCache) {
        console.log(`[ChatPage] ⚠️ Server returned fewer messages (${mappedMessages.length}) than cache (${cacheMessageCount}). Using cache to prevent message loss.`);
        // Merge: keep cache messages, add any new ones from server
        const cacheIds = new Set(currentCache.map(m => m.id));
        const newFromServer = mappedMessages.filter(m => !cacheIds.has(m.id));
        return [...currentCache, ...newFromServer].sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
      }
      
      return mappedMessages;
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - prevents aggressive refetching
    refetchOnMount: true, // CRITICAL: Always fetch on mount/refresh to ensure messages load after page refresh
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent unwanted refetches
    refetchOnReconnect: true, // Refetch on reconnect to sync after network issues
    // CRITICAL: Keep previous data while refetching to prevent messages from disappearing
    placeholderData: (previousData) => previousData || []
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
        messages.map(m => ((m as any).content || m.text || '').trim().toLowerCase())
      );
      const serverMessageIds = new Set(
        messages.map(m => m.id)
      );

      setOptimisticMessages(prev => {
        const filtered = prev.filter(optMsg => {
          // If the message is very recent (< 15 seconds), keep it to avoid flickering
          // Increased from 5 to 15 seconds to handle network latency
          const isRecent = new Date().getTime() - optMsg.createdAt.getTime() < 15000;
          if (isRecent) return true;

          // Check if message exists by ID first (more reliable)
          if (serverMessageIds.has(optMsg.id)) {
            return false; // Remove if ID matches
          }

          // Otherwise, remove it if it exists in the server list by content
          return !serverMessageContents.has(optMsg.content.trim().toLowerCase());
        });
        
        // Only update if something actually changed
        if (filtered.length === prev.length) {
          return prev; // Return same reference to prevent re-render
        }
        return filtered;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]); // Only depend on messages, not optimisticMessages

  interface UserUsage {
    messageCount: number;
    callDuration: number;
    premiumUser: boolean;
    messageLimitReached: boolean;
    callLimitReached: boolean;
  }

  // Check if we're coming from payment success
  const [location] = useLocation();
  const isFromPayment = new URLSearchParams(window.location.search).get('paymentSuccess') === 'true';

  const { data: userUsage, refetch: refetchUsage } = useQuery<UserUsage>({
    queryKey: ["/api/user/usage", user?.id],
    queryFn: async () => {
      try {
        // Use POST endpoint which returns premium status
        const res = await apiRequest("POST", "/api/user/usage", { userId: user?.id });
        const data = await res.json();
        console.log('🔄 User usage fetched:', data);
        return data;
      } catch (error) {
        console.error('Error fetching user usage:', error);
        return { messageCount: 0, callDuration: 0, premiumUser: false, messageLimitReached: false, callLimitReached: false };
      }
    },
    enabled: !!user?.id, // Only fetch when user is available
    staleTime: 30000, // Cache for 30 seconds
    refetchOnMount: true,
    // Only poll if user is NOT premium (to catch upgrade after payment)
    // Use function to check current data state
    refetchInterval: (query) => {
      const data = query.state.data;
      const isPremium = data?.premiumUser || user?.premium_user || false;
      // Stop polling if premium, otherwise poll every 10 seconds
      return isPremium ? false : 10000;
    },
  });

  // Force refetch user and usage when coming from payment
  useEffect(() => {
    if (isFromPayment) {
      console.log('🔄 Payment success detected - forcing refresh...');
      // Refetch user from auth context
      refetchUser();
      // Refetch usage immediately
      refetchUsage();
      // Clean up URL parameter
      setTimeout(() => {
        window.history.replaceState({}, '', '/chat');
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFromPayment]); // Only depend on isFromPayment to prevent infinite loops

  // Poll for premium status updates (in case payment was processed)
  // Note: This is now handled by refetchInterval in the useQuery above
  // Keeping this empty to avoid conflicts

  const quickReplies = [
    "Mera current relationship confusing hai",
    "Kaise pata chalega koi mujhe pasand karta hai?",
    "Main kya dhundh raha hoon samajhna chahta hoon",
    "Mujhe dating advice chahiye",
    "Mujhe trust issues ho rahe hain",
    "Kaise pata chalega main relationship ready hoon?"
  ];

  // Helper for Local Usage Tracking (Fallback for when DB is stuck)
  const getLocalUsage = () => {
    try {
      const today = new Date().toDateString();
      const stored = localStorage.getItem('daily_chat_usage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          return parsed.count;
        }
      }
      return 0;
    } catch { return 0; }
  };

  const incrementLocalUsage = () => {
    const today = new Date().toDateString();
    const current = getLocalUsage();
    localStorage.setItem('daily_chat_usage', JSON.stringify({
      date: today,
      count: current + 1
    }));
    return current + 1;
  };

  const isLoading = isSessionLoading;
  const isDev = import.meta.env.MODE === 'development';

  // CRITICAL: Daily message count for limit checking
  // NEVER use messages.length - that's total conversation length, not daily count
  const localCount = getLocalUsage();
  
  // Validate backendCount is a valid number
  const rawBackendCount = userUsage?.messageCount;
  const backendCount = (typeof rawBackendCount === 'number' && !isNaN(rawBackendCount) && rawBackendCount >= 0) 
    ? rawBackendCount 
    : 0;
  
  // Use backend count as primary source (from /api/user/usage API)
  // Fall back to local count only if backend is unavailable (0 or invalid)
  const currentCount = backendCount > 0 ? backendCount : localCount;

  // Check premium status - prioritize user object (from auth) as it's the source of truth
  // Only use userUsage if user object is not available
  const isPremium = user?.premium_user === true ? true : (userUsage?.premiumUser === true);
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Premium Status Check:', {
      userPremium: user?.premium_user,
      usagePremium: userUsage?.premiumUser,
      finalPremium: isPremium,
      userUsage: userUsage
    });
  }, [user?.premium_user, userUsage?.premiumUser, isPremium, userUsage]);

  // DEBUG: Log status on mount
  useEffect(() => {
    console.log("------------------------------------------");
    console.log("DEBUG: ChatPage Mount");
    console.log("DEBUG: Local Count (Storage):", localCount);
    console.log("DEBUG: Backend Count (Api):", backendCount);
    console.log("DEBUG: Current Count (Daily):", currentCount, "(NOT total conversation length)");
    console.log("DEBUG: Total Messages in Session:", messages.length, "(for reference only, NOT used for limits)");
    console.log("DEBUG: Is Premium:", isPremium);
    console.log("------------------------------------------");
  }, [localCount, backendCount, currentCount, isPremium, messages.length]);

  // STRICT LIMIT CHECK - Only block if NOT premium AND limit reached
  // For premium users, always allow (unlimited)
  // Free users get 1000 messages
  const FREE_MESSAGE_LIMIT = 1000;
  const isLimitReached = !isPremium && currentCount >= FREE_MESSAGE_LIMIT;
  
  // Debug limit check
  useEffect(() => {
    console.log('🔍 Limit Check:', {
      isPremium,
      currentCount,
      isLimitReached,
      message: isLimitReached ? '🚫 BLOCKED' : '✅ ALLOWED'
    });
  }, [isPremium, currentCount, isLimitReached]);

  // Smart trigger: Open feedback modal 10 seconds after paywall is hit
  useEffect(() => {
    if (isLimitReached && !paywallTriggered) {
      setPaywallTriggered(true);
      const timer = setTimeout(() => {
        setShowFeedbackModal(true);
      }, 10000); // 10 seconds delay
      return () => clearTimeout(timer);
    } else if (!isLimitReached) {
      setPaywallTriggered(false);
    }
  }, [isLimitReached, paywallTriggered]);

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

      try {
        // Chat endpoint uses streaming, so we need to use fetch directly with API_BASE
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            content, 
            sessionId: session.id, 
            userId: user?.id,
            persona_id: selectedPersonaId || user?.persona // Send selected persona or user's default
          }),
        });

        if (response.status === 402) {
          setIsTyping(false);
          removeOptimisticMessage(optimisticId);
          setPaywallOpen(true);
          queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
          return { success: false, reason: 'paywall' };
        }

        if (!response.ok) {
          // Try to parse error, but handle streaming responses
          let errorMessage = "Failed to send message";
          try {
            const errorText = await response.text();
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let aiResponseText = "";
        let imageUrl: string | undefined = undefined;
        let realUserMessageId: string | undefined = undefined;
        let realAiMessageId: string | undefined = undefined;
        let finalSessionId = session.id;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);

                if (data.error) throw new Error(data.error);

                if (data.content) {
                  aiResponseText += data.content;
                  setStreamingMessage(prev => prev + data.content);
                }

                if (data.done) {
                  // Capture imageUrl from done signal if present
                  if (data.imageUrl) {
                    imageUrl = data.imageUrl;
                  }
                  
                  // CRITICAL: Capture real message IDs from backend
                  if (data.userMessageId) {
                    realUserMessageId = data.userMessageId;
                    console.log(`[ChatPage] ✅ Received real user message ID from backend: ${realUserMessageId}`);
                  }
                  if (data.aiMessageId) {
                    realAiMessageId = data.aiMessageId;
                    console.log(`[ChatPage] ✅ Received real AI message ID from backend: ${realAiMessageId}`);
                  }
                  
                  // If backend returned a different sessionId, update our session
                  if (data.sessionId && data.sessionId !== session.id) {
                    console.log(`[ChatPage] 🔄 Backend returned different sessionId: ${data.sessionId} (was: ${session.id})`);
                    finalSessionId = data.sessionId;
                    // Update session in cache
                    queryClient.setQueryData(['session', user?.id], { ...session, id: data.sessionId });
                  }
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        // CRITICAL: Use REAL message IDs from backend instead of temporary IDs
        // This ensures messages persist correctly after page refresh
        const userMessage: Message = {
          id: realUserMessageId || optimisticId, // Use real ID from backend, fallback to optimistic
          content: content,
          role: 'user',
          sessionId: finalSessionId, // Use final session ID (may have changed)
          createdAt: new Date(),
          tag: 'general'
        };

        const aiMessage: Message = {
          id: realAiMessageId || generateTempId(), // Use real ID from backend, fallback to temp
          content: aiResponseText,
          role: 'assistant',
          sessionId: finalSessionId, // Use final session ID (may have changed)
          createdAt: new Date(),
          tag: 'general',
          imageUrl: imageUrl // Include image URL if present
        };

        // Remove optimistic message now that we have real IDs
        removeOptimisticMessage(optimisticId);
        
        // Update cache with REAL IDs from database
        // This ensures messages persist after refresh because IDs match database
        lastCacheUpdateRef.current = Date.now();
        
        queryClient.setQueryData(['messages', finalSessionId, user?.id], (old: Message[] | undefined) => {
          const current = old || [];
          
          // Create a map of existing messages by ID for fast lookup
          const existingById = new Map(current.map(m => [m.id, m]));
          
          let newMessages = [...current]; // Start with all existing messages
          
          // Replace temporary IDs with real IDs if we have them
          // First, remove any messages with temporary IDs that match our content
          newMessages = newMessages.filter(m => {
            // Keep messages that don't match our new messages
            if (m.id === optimisticId && m.role === 'user' && m.content === content) {
              return false; // Remove old optimistic message
            }
            // Remove any temporary AI messages with same content (will be replaced with real ID)
            if (m.role === 'assistant' && 
                m.content.trim().toLowerCase() === aiResponseText.trim().toLowerCase() &&
                m.id.startsWith('temp-')) {
              return false; // Remove temporary AI message
            }
            return true;
          });
          
          // Add user message with real ID
          if (!existingById.has(userMessage.id)) {
            newMessages.push(userMessage);
            console.log(`[ChatPage] ✅ Added user message to cache with real ID: ${userMessage.id}`);
          }
          
          // Add AI message with real ID
          if (!existingById.has(aiMessage.id)) {
            newMessages.push(aiMessage);
            console.log(`[ChatPage] ✅ Added AI message to cache with real ID: ${aiMessage.id}`);
          }
          
          // Sort by timestamp to ensure proper chronological order
          return newMessages.sort((a, b) => {
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return timeA - timeB;
          });
        });

        // Clear streaming
        setStreamingMessage("");

        // Invalidate usage query for count updates
        queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });

        // DO NOT refetch messages immediately - we already updated the cache with real IDs
        // Refetching would cause messages to disappear temporarily
        // The cache update above is sufficient - messages will be fetched on next page load

        return { success: true, reply: aiResponseText };

      } catch (error: any) {
        console.error("Chat error:", error);
        setStreamingMessage(""); // Clear on error
        throw error;
      } finally {
        setIsTyping(false);
      }
    },
    onError: (error: any, variables) => {
      setIsTyping(false);
      removeOptimisticMessage(variables.optimisticId);
      setFailedMessage(variables.content);

      // Check for Paywall / Quota Exhausted
      // The fetch throw might be wrapped, so check message or properties
      const isPaywall = error.message?.includes('PAYWALL') ||
        error.message?.includes('QUOTA') ||
        (error as any).status === 402;

      if (isPaywall) {
        console.log("💰 Paywall Triggered via Error Handler");
        setPaywallOpen(true);
        // Do NOT show the generic error toast
        return;
      }

      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const handleSendMessage = (content: string) => {
    // 1. Strict Check BEFORE updating
    // Use backend count if available, otherwise local count
    // NEVER use messages.length - that's total conversation length, not daily count
    const currentLocal = getLocalUsage();
    const rawBackendCount = userUsage?.messageCount;
    const validatedBackendCount = (typeof rawBackendCount === 'number' && !isNaN(rawBackendCount) && rawBackendCount >= 0) 
      ? rawBackendCount 
      : 0;
    const effectiveCount = validatedBackendCount > 0 ? validatedBackendCount : currentLocal;
    const isPremiumUser = userUsage?.premiumUser || user?.premium_user || false;

    if (!isPremiumUser && effectiveCount >= FREE_MESSAGE_LIMIT) {
      console.log("Paywall Hit (Pre-check):", effectiveCount);
      setPaywallOpen(true);
      return;
    }

    // 2. Add optimistic message
    const optimisticMsg = addOptimisticMessage(content);
    if (!optimisticMsg) return;

    // 3. Track & Increment
    trackMessageSent(content.length, messages.length + 1);
    const newCount = incrementLocalUsage();

    analytics.track("message_sent", {
      length: content.length,
      voiceMode: voiceModeEnabled
    });

    // 4. Double check AFTER increment (for the 1000th message edge case)
    if (!isPremiumUser && newCount >= FREE_MESSAGE_LIMIT) {
      console.log("Paywall Hit (Post-increment):", newCount);
      // We allow THIS message to send (as the 1000th), but open modal for next.
      // Or block immediately if you prefer strictness.
      // Let's let the 1000th go through, but trigger state for UI lock.
      setPaywallOpen(true);
    }

    sendMessageMutation.mutate({
      content,
      optimisticId: optimisticMsg.id
    });
  };

  // Better filtering: check by ID first, then by content
  // Create sets for fast lookup
  const serverMessageContents = new Set(messages.map(m => ((m as any).content || m.text || '').trim().toLowerCase()));
  const serverMessageIds = new Set(messages.map(m => m.id));
  
  // Filter out optimistic messages that are already in the server messages
  const filteredOptimistic = optimisticMessages.filter(optMsg => {
    // Remove if ID matches (most reliable check)
    if (serverMessageIds.has(optMsg.id)) {
      return false;
    }
    
    // Remove if content matches (fallback check) - but only if message is not very recent
    // This prevents removing optimistic messages that are still being processed
    const isRecent = new Date().getTime() - optMsg.createdAt.getTime() < 5000;
    if (isRecent) {
      // Keep recent optimistic messages even if content matches (might be duplicate from cache update)
      return true;
    }
    
    return !serverMessageContents.has(optMsg.content.trim().toLowerCase());
  });

  // Combine messages and remove duplicates by ID
  // This handles cases where we might have both temp IDs and real IDs for the same message
  const messageMap = new Map<string, Message | OptimisticMessage>();
  
  // First, add all server messages (these have priority - real IDs)
  messages.forEach(msg => {
    messageMap.set(msg.id, msg);
  });
  
  // Then add optimistic messages that aren't duplicates
  filteredOptimistic.forEach(optMsg => {
    // Only add if we don't already have a message with this ID
    if (!messageMap.has(optMsg.id)) {
      // Also check if we have a message with matching content (might have different ID)
      const hasMatchingContent = Array.from(messageMap.values()).some(m => 
        m.role === optMsg.role &&
        ((m as any).content || m.text || '').trim().toLowerCase() === optMsg.content.trim().toLowerCase()
      );
      if (!hasMatchingContent) {
        messageMap.set(optMsg.id, optMsg);
      }
    }
  });

  // Convert map to array and sort by timestamp
  const displayMessages: (Message | OptimisticMessage)[] = Array.from(messageMap.values()).sort((a, b) => {
    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

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

      {/* Feedback Modal - Smart trigger after paywall */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        triggerContext={paywallTriggered ? 'paywall' : 'manual'}
      />
    </div>
  );
}

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-white overflow-hidden relative">
      {/* Exit Intent Modal */}
      <ExitIntentModal
        isOpen={showExitModal}
        onClose={closeExitModal}
      />

      {/* Persona Selector - Floating button (optional, can be removed if using navbar version) */}
      <div className="absolute top-20 right-4 z-30 hidden md:block">
        <PersonaSelector
          currentPersona={selectedPersonaId || user?.persona}
          onPersonaChange={(personaId) => {
            setSelectedPersonaId(personaId);
            refetchUser();
          }}
        />
      </div>

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
      <div className="flex-shrink-0 w-full z-20 bg-white pb-[env(safe-area-inset-bottom)]">
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

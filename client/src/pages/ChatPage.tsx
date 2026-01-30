import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Message, type Session } from "@shared/schema";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { AmplitudePasswordModal } from "@/components/AmplitudePasswordModal";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { useExitIntent } from "@/hooks/useExitIntent";
import { queryClient, apiRequest, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { analytics } from "@/lib/analytics";
import { useLocation, Link } from "wouter";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Phone } from "lucide-react";
import { auth } from "@/lib/firebase";
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
  const [paywallManuallyClosed, setPaywallManuallyClosed] = useState(false);
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
  // Map old persona types to new IDs for frontend use
  const mapPersonaToNewId = (persona: string | undefined): string | undefined => {
    if (!persona) return undefined;
    const personaMap: Record<string, string> = {
      'sweet_supportive': 'sweet_supportive',
      'playful_flirty': 'flirtatious',
      'flirtatious': 'flirtatious',
      'playful': 'playful',
      'bold_confident': 'dominant',
      'dominant': 'dominant',
      'calm_mature': 'sweet_supportive',
    };
    return personaMap[persona] || persona;
  };

  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>(
    mapPersonaToNewId(user?.persona)
  );
  const lastCacheUpdateRef = useRef<number>(0); // Track when we last updated cache manually

  // LocalStorage backup key for messages
  const getMessagesStorageKey = () => `messages_${user?.id || 'anonymous'}`;
  
  // Load messages from localStorage on mount as initial data
  const getInitialMessages = useCallback((): Message[] => {
    if (!user?.id) return [];
    try {
      const key = `messages_${user.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log(`[ChatPage] 📦 Loaded ${parsed.length} messages from localStorage`);
        // Convert date strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
      }
    } catch (e) {
      console.error('[ChatPage] Error loading messages from localStorage:', e);
    }
    return [];
  }, [user?.id]);

  const { data: session, isLoading: isSessionLoading, refetch: refetchSession } = useQuery<Session>({
    queryKey: ["session", user?.id],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/session", {});
      const sessionData = await res.json();
      console.log(`[ChatPage] Session fetched: ${sessionData.id}`);
      return sessionData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents unnecessary refetches
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on focus - prevents race conditions
    // CRITICAL: Keep previous data during refetch to prevent session from becoming undefined
    placeholderData: (previousData) => previousData
  });

  const { data: messages = [], isLoading: isMessagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["messages", user?.id], // Stable key - only depends on user ID, not session ID
    enabled: !!user?.id && !!session?.id, // Wait for both user AND session to be available before fetching
    initialData: () => getInitialMessages(), // Load from localStorage on mount
    queryFn: async () => {
      if (!user?.id) {
        console.log('[ChatPage] ⚠️ Cannot fetch messages: missing user ID');
        return [];
      }
      
      // Session should be available since enabled check passed, but double-check
      const currentSession = session || queryClient.getQueryData<Session>(['session', user.id]);
      if (!currentSession?.id) {
        console.log('[ChatPage] ⚠️ Cannot fetch messages: session not available yet');
        return [];
      }
      
      console.log(`[ChatPage] 🔍 Fetching messages for session: ${currentSession.id}, user: ${user.id}`);
      
      // Get current cache to prevent overwriting with stale data (use stable key)
      const currentCache = queryClient.getQueryData<Message[]>(['messages', user.id]);
      const cacheMessageCount = currentCache?.length || 0;
      
      const res = await apiRequest("GET", `/api/messages?sessionId=${currentSession.id}&userId=${user.id}`);
      
      // CRITICAL: Check response headers BEFORE parsing JSON (headers are only readable once)
      // Check if backend returned messages from a different session (fallback scenario)
      let actualSessionId = currentSession.id;
      const fallbackSessionId = res.headers.get('X-Session-Id');
      const isFallback = res.headers.get('X-Fallback-Session') === 'true';
      
      if (isFallback && fallbackSessionId && fallbackSessionId !== currentSession.id) {
        console.log(`[ChatPage] 🔄 Backend used fallback session: ${fallbackSessionId} (requested: ${currentSession.id})`);
        actualSessionId = fallbackSessionId;
      }
      
      const rawMessages = await res.json();
      console.log(`[ChatPage] ✅ Fetched ${rawMessages.length} messages for session: ${currentSession.id} (cache had ${cacheMessageCount})`);
      
      // Also check message session IDs as backup (if headers weren't set)
      if (actualSessionId === currentSession.id && rawMessages.length > 0) {
        const firstMsgSessionId = rawMessages[0].sessionId || rawMessages[0].session_id;
        if (firstMsgSessionId && firstMsgSessionId !== currentSession.id) {
          console.log(`[ChatPage] ⚠️ Messages found in different session: ${firstMsgSessionId} (current: ${currentSession.id})`);
          actualSessionId = firstMsgSessionId;
        }
      }
      
      // If session changed, update the session cache to keep UI in sync
      // CRITICAL: Don't invalidate messages query - it would cause refetch and message loss
      // Session change is handled internally, query key remains stable
      if (actualSessionId !== currentSession.id && currentSession) {
        console.log(`[ChatPage] 🔄 Updating session cache from ${currentSession.id} to ${actualSessionId}`);
        queryClient.setQueryData(['session', user.id], { 
          ...currentSession, 
          id: actualSessionId 
        });
      }
      
      // Map backend format to frontend Message interface
      // CRITICAL: Normalize role from 'ai' to 'assistant' for consistency
      const mappedMessages = rawMessages.map((msg: any) => {
        // Normalize role: backend may send 'ai', but frontend expects 'assistant'
        const normalizedRole = msg.role === 'ai' ? 'assistant' : (msg.role === 'assistant' ? 'assistant' : msg.role);
        
        return {
          id: msg.id,
          sessionId: msg.session_id || msg.sessionId,
          content: msg.text || msg.content, // Fallback for various backend formats
          role: normalizedRole, // Always normalize 'ai' -> 'assistant'
          createdAt: new Date(msg.created_at || msg.createdAt),
          tag: msg.tag,
          imageUrl: msg.imageUrl || msg.image_url || undefined, // Include image URL
          personaId: msg.personaId || msg.persona_id || undefined // Include persona ID
        };
      });
      
      // DEBUG: Log mapped messages to verify role normalization
      console.log('🔍 DEBUG MAPPED MESSAGES:', {
        total: mappedMessages.length,
        byRole: {
          user: mappedMessages.filter(m => m.role === 'user').length,
          assistant: mappedMessages.filter(m => m.role === 'assistant').length,
          ai: mappedMessages.filter(m => m.role === 'ai').length,
          other: mappedMessages.filter(m => m.role !== 'user' && m.role !== 'assistant' && m.role !== 'ai').length
        },
        rawRoles: rawMessages.map((m: any) => m.role),
        mappedRoles: mappedMessages.map(m => m.role)
      });
      
      // SAFEGUARD: Always merge with existing cache to prevent message loss
      // This handles replication lag, temporary network issues, and session changes
      if (currentCache && currentCache.length > 0) {
        const timeSinceCacheUpdate = Date.now() - lastCacheUpdateRef.current;
        
        // If cache has more messages and update was recent, prefer cache (prevent overwrite)
        if (timeSinceCacheUpdate < 30000 && cacheMessageCount > mappedMessages.length) {
          console.log(`[ChatPage] ⚠️ Server returned fewer messages (${mappedMessages.length}) than cache (${cacheMessageCount}). Merging to prevent message loss.`);
        }
        
        // Always merge: combine cache and server messages, deduplicate by ID
        const cacheIds = new Set(currentCache.map(m => m.id));
        const newFromServer = mappedMessages.filter(m => !cacheIds.has(m.id));
        const merged = [...currentCache, ...newFromServer].sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
        
        // Save to localStorage as backup
        try {
          localStorage.setItem(getMessagesStorageKey(), JSON.stringify(merged));
        } catch (e) {
          console.error('[ChatPage] Error saving messages to localStorage:', e);
        }
        
        return merged;
      }
      
      // Save to localStorage as backup
      try {
        localStorage.setItem(getMessagesStorageKey(), JSON.stringify(mappedMessages));
      } catch (e) {
        console.error('[ChatPage] Error saving messages to localStorage:', e);
      }
      
      return mappedMessages;
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - prevents aggressive refetching
    refetchOnMount: true, // CRITICAL: Always fetch on mount/refresh to ensure messages load after page refresh
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent unwanted refetches
    refetchOnReconnect: true, // Refetch on reconnect to sync after network issues
    // CRITICAL: Keep previous data while refetching to prevent messages from disappearing
    // This ensures messages stay visible even if query refetches
    placeholderData: (previousData) => {
      // If we have previous data, use it
      if (previousData && previousData.length > 0) {
        return previousData;
      }
      // Otherwise, try to load from localStorage as fallback
      if (user?.id) {
        try {
          const key = `messages_${user.id}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log(`[ChatPage] 📦 Using ${parsed.length} messages from localStorage as placeholder`);
            return parsed.map((msg: any) => ({
              ...msg,
              createdAt: new Date(msg.createdAt)
            }));
          }
        } catch (e) {
          console.error('[ChatPage] Error loading messages from localStorage in placeholderData:', e);
        }
      }
      return [];
    }
  });

  // Listen for immediate persona changes from navbar (before user refetch)
  useEffect(() => {
    const handlePersonaChange = (event: CustomEvent) => {
      const { personaId } = event.detail;
      console.log('[ChatPage] Received personaChanged event with personaId:', personaId);
      if (personaId && personaId !== selectedPersonaId) {
        console.log('[ChatPage] Immediately updating selectedPersonaId from', selectedPersonaId, 'to', personaId);
        setSelectedPersonaId(personaId);
        
        // Save to localStorage as backup
        if (user?.id) {
          try {
            localStorage.setItem(`persona_${user.id}`, JSON.stringify(personaId));
            console.log('[ChatPage] Saved persona to localStorage:', personaId);
          } catch (e) {
            console.error('[ChatPage] Error saving persona to localStorage:', e);
          }
        }
      }
    };

    window.addEventListener('personaChanged', handlePersonaChange as EventListener);
    return () => {
      window.removeEventListener('personaChanged', handlePersonaChange as EventListener);
    };
  }, [selectedPersonaId, user?.id]);

  // Sync selectedPersonaId with user persona (when persona changes from navbar or on load)
  useEffect(() => {
    if (user?.persona) {
      // Map old persona type to new ID
      const mappedPersona = mapPersonaToNewId(user.persona);
      console.log('[ChatPage] User persona from DB:', user.persona, 'mapped to:', mappedPersona);
      
      // Always update if we have a persona from the database (even if it's the same)
      // This ensures the persona is set correctly on page load/refresh
      if (mappedPersona) {
        if (mappedPersona !== selectedPersonaId) {
          console.log('[ChatPage] Updating selectedPersonaId from', selectedPersonaId, 'to', mappedPersona);
          setSelectedPersonaId(mappedPersona);
          // Also save to localStorage to keep it in sync
          try {
            localStorage.setItem(`persona_${user.id}`, JSON.stringify(mappedPersona));
          } catch (e) {
            console.error('[ChatPage] Error saving persona to localStorage:', e);
          }
        } else {
          console.log('[ChatPage] selectedPersonaId already matches:', mappedPersona);
        }
      }
    } else if (user?.id && !selectedPersonaId) {
      // If user is loaded but persona is missing, try loading from localStorage as fallback
      try {
        const key = `persona_${user.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const mappedPersona = mapPersonaToNewId(parsed);
          if (mappedPersona) {
            console.log('[ChatPage] Loaded persona from localStorage:', mappedPersona);
            setSelectedPersonaId(mappedPersona);
          }
        }
      } catch (e) {
        console.error('[ChatPage] Error loading persona from localStorage:', e);
      }
    }
  }, [user?.persona, user?.id, selectedPersonaId]); // Include selectedPersonaId to avoid unnecessary updates

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
          // Grace period: Keep optimistic messages for 15 seconds to handle network latency
          // This prevents removing messages before real IDs arrive from backend
          const isRecent = new Date().getTime() - optMsg.createdAt.getTime() < 15000;
          if (isRecent) {
            // Even if recent, check if we have a confirmed match by ID
            if (serverMessageIds.has(optMsg.id)) {
              console.log(`[ChatPage] 🗑️ Removing optimistic message (ID matched): ${optMsg.id}`);
              return false; // Remove if ID matches (most reliable check)
            }
            // Keep recent optimistic messages even if content matches (might be temporary ID)
            return true;
          }

          // After grace period, check if message exists by ID (most reliable)
          if (serverMessageIds.has(optMsg.id)) {
            console.log(`[ChatPage] 🗑️ Removing optimistic message (ID matched after grace period): ${optMsg.id}`);
            return false; // Remove if ID matches
          }

          // Check by content as fallback (only after grace period)
          const contentMatches = serverMessageContents.has(optMsg.content.trim().toLowerCase());
          if (contentMatches) {
            console.log(`[ChatPage] 🗑️ Removing optimistic message (content matched after grace period): ${optMsg.content.substring(0, 50)}...`);
            return false; // Remove if content matches after grace period
          }

          // Keep optimistic message (not found in server messages)
          return true;
        });
        
        // Only update if something actually changed
        if (filtered.length === prev.length) {
          return prev; // Return same reference to prevent re-render
        }
        
        console.log(`[ChatPage] 🧹 Optimistic messages cleanup: ${prev.length} → ${filtered.length}`);
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
        const res = await apiRequest("POST", "/api/user/usage", {});
        const data = await res.json();
        // Only log if premium status changed or on first load
        if (data?.premiumUser) {
          console.log('🔄 User usage fetched:', { premiumUser: data.premiumUser, subscriptionPlan: data.subscriptionPlan });
        }
        return data;
      } catch (error) {
        console.error('Error fetching user usage:', error);
        return { messageCount: 0, callDuration: 0, premiumUser: false, messageLimitReached: false, callLimitReached: false };
      }
    },
    enabled: !!user?.id, // Only fetch when user is available
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 30000, // Cache for 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    // Only poll if user is NOT premium (to catch upgrade after payment)
    refetchInterval: (query) => {
      const data = query.state.data;
      const isPremium = data?.premiumUser === true;
      // Stop polling if premium, otherwise poll every 15 seconds
      return isPremium ? false : 15000;
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

  // Force refresh premium status on mount only (polling handled by useQuery)
  useEffect(() => {
    // Immediately invalidate and refetch usage to get fresh premium status on mount
    queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
    refetchUsage();
  }, [user?.id]); // Only run when user changes, not continuously

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
  
  // Use backend count whenever API has returned a valid number (including 0).
  // Only fall back to local count when usage hasn't loaded yet (avoids stale localStorage triggering paywall on first message).
  const currentCount =
    userUsage != null && typeof rawBackendCount === "number" && !isNaN(rawBackendCount) && rawBackendCount >= 0
      ? rawBackendCount
      : localCount;

  // Check premium status - ONLY use API response from /api/user/usage (which checks Dodo subscriptions)
  // DO NOT use user?.premium_user from AuthContext as it may be stale/old data
  // Premium status must come from active Dodo subscriptions (or users.premium_user set by Dodo webhook)
  // STRICT CHECK: Only premium if BOTH premiumUser is true AND subscriptionPlan is defined
  const isPremium = (userUsage?.premiumUser === true) && (userUsage?.subscriptionPlan !== undefined);
  
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

  // Disable body scroll on chat page (only messages should scroll)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // STRICT LIMIT CHECK - Only block if NOT premium AND limit reached
  // For premium users, always allow (unlimited)
  // Free users get 20 messages
  const FREE_MESSAGE_LIMIT = 20;
  const isLimitReached = !isPremium && currentCount >= FREE_MESSAGE_LIMIT;
  
  // Debug limit check
  useEffect(() => {
    console.log('🔍 Limit Check:', {
      isPremium,
      currentCount,
      isLimitReached,
      message: isLimitReached ? '🚫 BLOCKED' : '✅ ALLOWED',
      userUsage: userUsage
    });
  }, [isPremium, currentCount, isLimitReached, userUsage]);

  // Automatically show paywall when limit is reached (only once per limit state)
  useEffect(() => {
    if (isLimitReached && !paywallOpen && !paywallManuallyClosed) {
      console.log('💰 Auto-showing paywall - limit reached:', currentCount, '/', FREE_MESSAGE_LIMIT);
      setPaywallOpen(true);
      setPaywallManuallyClosed(false); // Reset when limit state changes
    }
  }, [isLimitReached, paywallOpen, currentCount, paywallManuallyClosed]);

  // Reset manually closed flag when limit state changes (user might have upgraded)
  useEffect(() => {
    if (!isLimitReached) {
      setPaywallManuallyClosed(false);
    }
  }, [isLimitReached]);

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
        
        // Ensure we use the new persona ID format (map old types to new)
        const personaToSend = selectedPersonaId || mapPersonaToNewId(user?.persona) || 'sweet_supportive';
        
        console.log('[ChatPage] Sending message with persona_id:', personaToSend, '(mapped from:', selectedPersonaId || user?.persona, ')');
        
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        if (token) headers["Authorization"] = `Bearer ${token}`;
        
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content,
            sessionId: session.id,
            userId: user?.id,
            persona_id: personaToSend,
          }),
        });

        if (response.status === 402) {
          setIsTyping(false);
          removeOptimisticMessage(optimisticId);
          setPaywallOpen(true);
          queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
          return { success: false, reason: 'paywall' };
        }

        if (response.status === 401) {
          setIsTyping(false);
          removeOptimisticMessage(optimisticId);
          queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
          refetchUser();
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || "Please sign in again to send messages.");
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
                  
                  // If backend returned a different sessionId, update our session cache
                  // CRITICAL: Don't invalidate messages query - it would cause refetch and message loss
                  // Session change is handled internally, messages query key remains stable
                  if (data.sessionId && data.sessionId !== session.id) {
                    console.log(`[ChatPage] 🔄 Backend returned different sessionId: ${data.sessionId} (was: ${session.id})`);
                    finalSessionId = data.sessionId;
                    // Update session in cache (messages query will continue using stable key)
                    queryClient.setQueryData(['session', user?.id], { ...session, id: data.sessionId });
                    // NOTE: Messages query key is stable (user ID only), so cache updates remain visible
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
        // CRITICAL: Use stable cache key (user ID only) so cache updates are always visible
        // This ensures messages persist after refresh because IDs match database
        lastCacheUpdateRef.current = Date.now();
        
        queryClient.setQueryData(['messages', user?.id], (old: Message[] | undefined) => {
          // DEFENSIVE: Always preserve existing messages, never replace
          const current = old || [];
          
          // Create a map of existing messages by ID for fast lookup and deduplication
          const existingById = new Map<string, Message>();
          current.forEach(m => {
            existingById.set(m.id, m);
          });
          
          // Remove old optimistic message with temporary ID (will be replaced with real ID)
          const messagesWithoutOldOptimistic = current.filter(m => {
            // Remove old optimistic user message
            if (m.id === optimisticId && m.role === 'user' && m.content === content) {
              return false;
            }
            // Remove temporary AI messages with same content (will be replaced with real ID)
            if (m.role === 'assistant' && 
                m.content.trim().toLowerCase() === aiResponseText.trim().toLowerCase() &&
                m.id.startsWith('temp-')) {
              return false;
            }
            return true;
          });
          
          // Build new messages array: preserve all existing + add new ones
          const newMessages = [...messagesWithoutOldOptimistic];
          
          // Add user message with real ID (if not already present)
          if (!existingById.has(userMessage.id)) {
            newMessages.push(userMessage);
            console.log(`[ChatPage] ✅ Added user message to cache with real ID: ${userMessage.id}`);
          } else {
            console.log(`[ChatPage] ⚠️ User message already in cache: ${userMessage.id}`);
          }
          
          // Add AI message with real ID (if not already present)
          if (!existingById.has(aiMessage.id)) {
            newMessages.push(aiMessage);
            console.log(`[ChatPage] ✅ Added AI message to cache with real ID: ${aiMessage.id}`);
          } else {
            console.log(`[ChatPage] ⚠️ AI message already in cache: ${aiMessage.id}`);
          }
          
          // Sort by timestamp to ensure proper chronological order
          const sorted = newMessages.sort((a, b) => {
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return timeA - timeB;
          });
          
          console.log(`[ChatPage] 📊 Cache updated: ${current.length} → ${sorted.length} messages`);
          
          // Save to localStorage as backup
          try {
            localStorage.setItem(getMessagesStorageKey(), JSON.stringify(sorted));
          } catch (e) {
            console.error('[ChatPage] Error saving messages to localStorage:', e);
          }
          
          return sorted;
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
        // Helpful message when backend is not running (ERR_CONNECTION_REFUSED → "Failed to fetch")
        if (error?.name === "TypeError" && error?.message === "Failed to fetch") {
          throw new Error("Cannot reach the chat server. Make sure the backend is running (e.g. run npm run dev:all).");
        }
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
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
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
    // ONLY use API response for premium status (checks Dodo subscriptions)
    // DO NOT use user?.premium_user as it may be stale
    const isPremiumUser = userUsage?.premiumUser === true;

    if (!isPremiumUser && effectiveCount >= FREE_MESSAGE_LIMIT) {
      console.log("💰 Paywall Hit (Pre-check):", effectiveCount, "Limit:", FREE_MESSAGE_LIMIT);
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

    // 4. Double check AFTER increment (for the 20th message edge case)
    if (!isPremiumUser && newCount >= FREE_MESSAGE_LIMIT) {
      console.log("💰 Paywall Hit (Post-increment):", newCount, "Limit:", FREE_MESSAGE_LIMIT);
      // Block immediately - don't allow the message to send
      setPaywallOpen(true);
      removeOptimisticMessage(optimisticMsg.id);
      return;
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

  // DEBUG: Log message counts by role to diagnose AI message disappearance
  console.log('🔍 DEBUG FILTER:', {
    total: messages.length,
    userMsg: messages.filter(m => m.role === 'user').length,
    aiMsg: messages.filter(m => m.role === 'assistant' || m.role === 'ai').length,
    displayTotal: displayMessages.length,
    displayUser: displayMessages.filter(m => m.role === 'user').length,
    displayAi: displayMessages.filter(m => m.role === 'assistant' || m.role === 'ai').length,
    currentSessionId: session?.id,
    selectedPersonaId: selectedPersonaId,
    messagesWithRoles: messages.map(m => ({ id: m.id.substring(0, 8), role: m.role, sessionId: m.sessionId?.substring(0, 8), personaId: (m as any).personaId }))
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
    <div 
      className="flex flex-col w-full bg-white overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Exit Intent Modal */}
      <ExitIntentModal
        isOpen={showExitModal}
        onClose={closeExitModal}
      />

      {/* Chat Header - Fixed at top */}
      <div className="flex-shrink-0 z-40">
        <ChatHeader
          sessionId={session?.id}
          voiceModeEnabled={voiceModeEnabled}
          onVoiceModeToggle={() => setVoiceModeEnabled(!voiceModeEnabled)}
          onPaymentClick={() => setPaywallOpen(true)}
          onOpenPaywall={() => setPaywallOpen(true)}
          userUsage={userUsage}
        />
      </div>

      {/* Scrollable Messages Area - ONLY scrollable element */}
      <div 
        className="flex-1 min-h-0 w-full overflow-y-auto"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ChatMessages
          messages={displayMessages as Message[]}
          isLoading={isMessagesLoading}
          isMobile={isMobile}
          isTyping={isTyping}
        />
      </div>

      {/* Fixed Input at Bottom - Always visible */}
      <div 
        className="flex-shrink-0 w-full bg-white border-t border-gray-100 shadow-sm"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending || isTyping}
          disabled={isLimitReached}
          isMobile={isMobile}
          quickReplies={[]}
          failedMessage={failedMessage}
        />
      </div>

      {/* Floating Call Button - Positioned above input bar */}
      <Link href="/call">
        <button
          className="fixed right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 z-30"
          style={{ 
            backgroundColor: '#FF69B4',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          }}
          title="Call Riya"
          data-testid="button-floating-call"
        >
          <Phone className="w-6 h-6 text-white" />
        </button>
      </Link>

      <PaywallSheet 
        open={paywallOpen} 
        onOpenChange={(open) => {
          console.log('💰 PaywallSheet open state changed:', open);
          setPaywallOpen(open);
          // If user manually closes the paywall, mark it as manually closed
          // This prevents the auto-open effect from immediately reopening it
          if (!open && isLimitReached) {
            setPaywallManuallyClosed(true);
          }
        }} 
        messageCount={userUsage?.messageCount}
      />
    </div>
  );
}

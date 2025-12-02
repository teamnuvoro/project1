import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  withRetry,
  isNetworkError,
  createAppError,
  ErrorCode,
  logError,
  safeParseNumber,
  safeParseArray,
  safeParseString,
} from "@/lib/errorTypes";
import {
  getUserSummary as edgeGetUserSummary,
  getUnderstandingProgression as edgeGetProgression,
  getUserStats as edgeGetStats,
  useEdgeFunctions,
  isEdgeFunctionsConfigured,
} from "@/lib/edgeFunctions";

function isValidUUID(userId: unknown): userId is string {
  if (typeof userId !== "string" || userId.length === 0) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}

const CACHE_KEY_PREFIX = "riya_summary_cache_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PROGRESSION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour - refresh if older

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface SummaryResponse {
  success: boolean;
  summary?: any;
  error?: string;
  isFirstTimeUser?: boolean;
}

interface ProgressionResponse {
  success: boolean;
  progression?: Array<{ session: number; level: number; increment: number }>;
  currentLevel?: number;
  nextIncrement?: number;
  maxLevel?: number;
  sessionsToMax?: number;
  error?: string;
}

interface StatsResponse {
  success: boolean;
  stats?: {
    understandingLevel: number;
    totalSessions: number;
    totalMessages: number;
    engagementLevel: string;
    lastAnalyzed: string | null;
    nextSessionBonus: number;
    maxLevel: number;
    levelProgress: number;
  };
  error?: string;
}

export const DEFAULT_FIRST_TIME_SUMMARY = {
  id: null,
  user_id: null,
  cumulative_summary: null,
  ideal_partner_type: null,
  user_personality_traits: [],
  communication_style: null,
  emotional_needs: [],
  values: [],
  interests: [],
  relationship_expectations: null,
  what_to_explore: [],
  suggested_conversation_starters: [],
  growth_areas: [],
  understanding_level: 25,
  total_sessions_count: 0,
  total_messages_count: 0,
  engagement_level: "new",
  primary_conversation_theme: null,
  mood_pattern: null,
  created_at: null,
  updated_at: null,
  last_analysis_at: null,
};

function getCacheKey(userId: string, type: string): string {
  return `${CACHE_KEY_PREFIX}${type}_${userId}`;
}

interface CacheResult<T> {
  data: T;
  timestamp: number;
  isExpired: boolean;
}

function getFromCache<T>(key: string): CacheResult<T> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const isExpired = Date.now() > entry.expiresAt;
    
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return {
      data: entry.data,
      timestamp: entry.timestamp,
      isExpired: false,
    };
  } catch (error) {
    console.warn("[useCachedSummary] Cache read error:", error);
    return null;
  }
}

function setInCache<T>(key: string, data: T, ttlMs: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn("[useCachedSummary] Cache write error:", error);
  }
}

function invalidateCache(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`${CACHE_KEY_PREFIX}`) && k.includes(userId)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.warn("[useCachedSummary] Cache invalidation error:", error);
  }
}

export function useCachedSummary(userId: string | null) {
  const queryClient = useQueryClient();
  const cacheKey = userId ? getCacheKey(userId, "summary") : "";
  const [retryCount, setRetryCount] = useState(0);

  const {
    data: summaryData,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery<SummaryResponse>({
    queryKey: ["/api/user-summary", userId],
    queryFn: async () => {
      if (!isValidUUID(userId)) {
        return {
          success: true,
          summary: DEFAULT_FIRST_TIME_SUMMARY,
          isFirstTimeUser: true,
        };
      }

      const cacheResult = getFromCache<SummaryResponse>(cacheKey);
      if (cacheResult && cacheResult.data.success) {
        const cacheAge = Date.now() - cacheResult.timestamp;
        if (cacheAge < STALE_THRESHOLD_MS) {
          console.log("[useCachedSummary] Using cached summary");
          return cacheResult.data;
        }
        console.log("[useCachedSummary] Cache stale, refreshing...");
      }

      try {
        // Check if Edge Functions are available BEFORE entering retry logic
        const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();
        console.log("[useCachedSummary] Using Edge Functions:", shouldUseEdge);

        const data = await withRetry(
          async () => {
            // =========================================================================
            // NEW: Use Supabase Edge Function when configured
            // Only call Edge Function if properly configured
            // =========================================================================
            if (shouldUseEdge) {
              try {
                const result = await edgeGetUserSummary(userId as string);
                if (result.isFirstTimeUser) {
                  return {
                    success: true,
                    summary: DEFAULT_FIRST_TIME_SUMMARY,
                    isFirstTimeUser: true,
                  };
                }
                return result;
              } catch (err: any) {
                console.warn("[useCachedSummary] Edge Function error, falling back to Express:", err.message);
                // Fall through to Express fallback
              }
            }

            // =========================================================================
            // Express API fallback (used when Edge Functions not configured or failed)
            // =========================================================================
            const response = await fetch(`/api/user-summary/${userId}`);

            if (!response.ok) {
              if (response.status === 404 || response.status === 400) {
                return {
                  success: true,
                  summary: DEFAULT_FIRST_TIME_SUMMARY,
                  isFirstTimeUser: true,
                };
              }
              if (response.status === 401 || response.status === 403) {
                const appError = createAppError(
                  ErrorCode.SESSION_EXPIRED,
                  "Session expired",
                  null,
                  false
                );
                logError(appError, "useCachedSummary");
                return {
                  success: true,
                  summary: DEFAULT_FIRST_TIME_SUMMARY,
                  isFirstTimeUser: true,
                };
              }
              throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
          },
          {
            maxRetries: 3,
            baseDelayMs: 1000,
            onRetry: (attempt, err) => {
              console.log(`[useCachedSummary] Retry attempt ${attempt}`, err);
              setRetryCount(attempt);
            },
          }
        );

        if (data.success) {
          setInCache(cacheKey, data, CACHE_TTL_MS);
        }
        setRetryCount(0);

        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const appError = createAppError(
            ErrorCode.NETWORK_ERROR,
            "Unable to connect. Please check your internet connection.",
            err,
            true
          );
          logError(appError, "useCachedSummary");
        }

        const cacheResult = getFromCache<SummaryResponse>(cacheKey);
        if (cacheResult) {
          console.log("[useCachedSummary] Using stale cache due to error");
          return { ...cacheResult.data, isStale: true };
        }

        throw err;
      }
    },
    enabled: !!userId,
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS * 2,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const forceRefresh = useCallback(async () => {
    if (userId) {
      invalidateCache(userId);
      await queryClient.invalidateQueries({
        queryKey: ["/api/user-summary", userId],
      });
      return refetch();
    }
  }, [userId, queryClient, refetch]);

  const isFirstTimeUser =
    summaryData?.isFirstTimeUser ||
    (!summaryData?.summary && !isLoading && !isError);

  return {
    summaryData,
    isLoading,
    error,
    isError,
    isFirstTimeUser,
    retryCount,
    refetch: forceRefresh,
    invalidateCache: () => userId && invalidateCache(userId),
  };
}

export function useCachedProgression(userId: string | null, enabled: boolean = true) {
  const cacheKey = userId ? getCacheKey(userId, "progression") : "";

  const { data: progressionData, isLoading } = useQuery<ProgressionResponse>({
    queryKey: ["/api/user-summary", userId, "progression"],
    queryFn: async () => {
      if (!isValidUUID(userId)) return { success: false };

      const cacheResult = getFromCache<ProgressionResponse>(cacheKey);
      if (cacheResult && cacheResult.data.success) {
        console.log("[useCachedProgression] Using cached progression");
        return cacheResult.data;
      }

      const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();

      try {
        // =========================================================================
        // NEW: Use Supabase Edge Function when configured
        // =========================================================================
        if (shouldUseEdge) {
          try {
            console.log("[useCachedProgression] Using Edge Function");
            const data = await edgeGetProgression(userId as string);
            if (data.success) {
              setInCache(cacheKey, data, PROGRESSION_CACHE_TTL_MS);
            }
            return data;
          } catch (edgeErr) {
            console.warn("[useCachedProgression] Edge Function error, falling back to Express:", edgeErr);
            // Fall through to Express fallback
          }
        }

        // =========================================================================
        // Express API fallback
        // =========================================================================
        const response = await fetch(`/api/user-summary/${userId}/progression`);
        if (!response.ok) return { success: false };

        const data = await response.json();
        
        if (data.success) {
          setInCache(cacheKey, data, PROGRESSION_CACHE_TTL_MS);
        }

        return data;
      } catch (err) {
        console.warn("[useCachedProgression] Error:", err);
        return { success: false };
      }
    },
    enabled: !!userId && enabled,
    staleTime: PROGRESSION_CACHE_TTL_MS,
    gcTime: PROGRESSION_CACHE_TTL_MS * 2,
    refetchInterval: false,
  });

  return { progressionData, isLoading };
}

export function useCachedStats(userId: string | null) {
  const cacheKey = userId ? getCacheKey(userId, "stats") : "";

  const { data: statsData, isLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/user-summary", userId, "stats"],
    queryFn: async () => {
      if (!isValidUUID(userId)) return { success: false };

      const cacheResult = getFromCache<StatsResponse>(cacheKey);
      if (cacheResult && cacheResult.data.success) {
        console.log("[useCachedStats] Using cached stats");
        return cacheResult.data;
      }

      const shouldUseEdge = useEdgeFunctions() && isEdgeFunctionsConfigured();

      try {
        // =========================================================================
        // NEW: Use Supabase Edge Function when configured
        // =========================================================================
        if (shouldUseEdge) {
          try {
            console.log("[useCachedStats] Using Edge Function");
            const data = await edgeGetStats(userId as string);
            if (data.success) {
              setInCache(cacheKey, data, CACHE_TTL_MS);
            }
            return data;
          } catch (edgeErr) {
            console.warn("[useCachedStats] Edge Function error, falling back to Express:", edgeErr);
            // Fall through to Express fallback
          }
        }

        // =========================================================================
        // Express API fallback
        // =========================================================================
        const response = await fetch(`/api/user-summary/${userId}/stats`);
        if (!response.ok) return { success: false };

        const data = await response.json();
        
        if (data.success) {
          setInCache(cacheKey, data, CACHE_TTL_MS);
        }

        return data;
      } catch (err) {
        console.warn("[useCachedStats] Error:", err);
        return { success: false };
      }
    },
    enabled: !!userId,
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS * 2,
    refetchInterval: false,
  });

  return { statsData, isLoading };
}

export function useInvalidateSummaryCache() {
  const queryClient = useQueryClient();

  return useCallback(
    (userId: string) => {
      invalidateCache(userId);
      queryClient.invalidateQueries({
        queryKey: ["/api/user-summary", userId],
      });
    },
    [queryClient]
  );
}

export { invalidateCache, CACHE_TTL_MS, PROGRESSION_CACHE_TTL_MS };

import { apiRequest } from "./queryClient";

export const analytics = {
    initialize: () => {
        // No initialization needed for custom backend analytics
        console.log("[Analytics] Initialized (Supabase)");
    },

    track: (eventName: string, properties?: Record<string, any>) => {
        try {
            // Fire and forget
            apiRequest("POST", "/api/analytics/event", {
                eventName,
                eventType: "track",
                properties,
                path: window.location.pathname,
                timestamp: new Date().toISOString()
            }).catch(err => {
                // Silently fail to avoid disrupting user experience
                if (import.meta.env.DEV) {
                    console.warn("[Analytics] Failed to track event:", err);
                }
            });
        } catch (e) {
            // Ignore errors
        }
    },

    identifyUser: (userId: string, traits?: Record<string, any>) => {
        try {
            apiRequest("POST", "/api/analytics/event", {
                eventName: "identify",
                eventType: "identify",
                userId,
                properties: traits,
                timestamp: new Date().toISOString()
            }).catch(err => {
                if (import.meta.env.DEV) {
                    console.warn("[Analytics] Failed to identify user:", err);
                }
            });
        } catch (e) {
            // Ignore errors
        }
    },

    reset: () => {
        // No local state to reset
    }
};

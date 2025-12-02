import * as amplitude from '@amplitude/analytics-browser';

const AMPLITUDE_API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY || null;
const IS_DEV_ENV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Suppress Amplitude console errors globally during development
if (IS_DEV_ENV && typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() || '';
    if (message.includes('Amplitude') || message.includes('Failed to fetch')) {
      return; // Suppress Amplitude errors in dev
    }
    originalError(...args);
  };
  
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString?.() || '';
    if (message.includes('Amplitude') || message.includes('exceeded retry')) {
      return; // Suppress Amplitude warnings in dev
    }
    originalWarn(...args);
  };
}

export const analytics = {
    initialize: () => {
        // Only initialize if API key is explicitly provided
        if (!AMPLITUDE_API_KEY) {
            return;
        }

        // Skip on development/localhost to prevent network errors
        if (IS_DEV_ENV) {
            return;
        }

        try {
            amplitude.init(AMPLITUDE_API_KEY, {
                defaultTracking: false, // Disable automatic tracking to reduce events
                minIdLength: 1,
                logLevel: 'error', // Only log errors, not warnings
                logWarningOnError: false, // Don't spam console
            });
        } catch (e) {
            // Silently fail if initialization has issues
        }
    },

    track: (eventName: string, properties?: Record<string, any>) => {
        if (!AMPLITUDE_API_KEY || IS_DEV_ENV) return;

        try {
            amplitude.track(eventName, properties);
        } catch (e) {
            // Silently fail
        }
    },

    identifyUser: (userId: string, traits?: Record<string, any>) => {
        if (!AMPLITUDE_API_KEY || IS_DEV_ENV) return;

        try {
            amplitude.setUserId(userId);
            if (traits) {
                const identify = new amplitude.Identify();
                Object.entries(traits).forEach(([key, value]) => {
                    identify.set(key, value);
                });
                amplitude.identify(identify);
            }
        } catch (e) {
            // Silently fail
        }
    },

    reset: () => {
        if (!AMPLITUDE_API_KEY) return;
        try {
            amplitude.reset();
        } catch (e) {
            // Silently fail
        }
    }
};

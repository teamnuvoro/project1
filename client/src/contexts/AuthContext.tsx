import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { analytics } from "@/lib/analytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const authDisabled =
  import.meta.env.VITE_DISABLE_AUTH?.toString().toLowerCase() === "true";

interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  gender?: string;
  persona?: string;
  premium_user?: boolean;
  is_admin?: boolean;
  onboarding_complete?: boolean;
  age?: number;
  city?: string;
  occupation?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
  refetchUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize analytics on mount
  useEffect(() => {
    analytics.initialize();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          setIsLoading(false);
          queryClient.clear();
          return;
        }

        const token = await fbUser.getIdToken();
        const pendingPhone = typeof localStorage !== "undefined" ? localStorage.getItem("pendingPhoneNumber") : null;
        const body = pendingPhone ? { phoneNumber: pendingPhone } : undefined;
        const resp = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (pendingPhone) {
          try {
            localStorage.removeItem("pendingPhoneNumber");
          } catch (_) {}
        }
        const sessionInfo = await resp.json().catch(() => ({}));

        const nextUser: User = {
          id: sessionInfo.userId || fbUser.uid, // internal uuid if available, else fallback
          firebase_uid: fbUser.uid,
          name: fbUser.displayName || sessionInfo.name || "User",
          email: fbUser.email || sessionInfo.email || "",
        };

        setUser(nextUser);
        analytics.identifyUser(fbUser.uid, {
          email: nextUser.email,
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const refetchUser = async () => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) return;
      const token = await fbUser.getIdToken(true);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error refetching user:', error);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      analytics.track("logout");
      analytics.reset();

      await signOut(auth);

      queryClient.clear();
      sessionStorage.clear();

      console.log('✅ Logged out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        refetchUser,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import { createContext, useContext, ReactNode, useEffect } from "react";
import { analytics } from "@/lib/analytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Auth is disabled in development mode for easier testing
const isDev = import.meta.env.MODE === 'development';
const authDisabled = isDev || import.meta.env.VITE_DISABLE_AUTH?.toString().toLowerCase() === "true";

// Dev user ID - matches the DEV_USER_ID in server/routes/chat.ts
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  gender?: string;
  persona?: string;
  premium_user?: boolean;
  onboarding_complete?: boolean;
  age?: number;
  city?: string;
  occupation?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Initialize analytics on mount
  useEffect(() => {
    analytics.initialize();
  }, []);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      if (authDisabled) {
        // In dev mode, return a mock user with the proper UUID that matches the backend
        console.log("[Auth] Development mode - using dev user");
        localStorage.setItem('userId', DEV_USER_ID); // Set in localStorage for chat
        return {
          id: DEV_USER_ID,
          name: "Dev User",
          email: "dev@example.com",
          premium_user: true,
          gender: "male",
          age: 25,
          persona: "sweet_supportive",
          onboarding_complete: true
        } as User;
      }
      
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        if (res.status === 401) return null;
        return null;
      }
      const data = await res.json();
      return data.user || null;
    },
    staleTime: Infinity,
  });

  // Track user when authenticated
  useEffect(() => {
    if (user) {
      analytics.identifyUser(user.id, {
        name: user.name,
        email: user.email,
        gender: user.gender,
        premium: user.premium_user,
        age: user.age,
      });
    }
  }, [user]);

  const login = (userData: User) => {
    queryClient.setQueryData(["/api/auth/session"], { user: userData });
    analytics.track("login_completed", { method: "manual" });
    analytics.identifyUser(userData.id, {
      name: userData.name,
      email: userData.email,
      gender: userData.gender,
      premium: userData.premium_user,
    });
  };

  const logout = () => {
    analytics.track("logout");
    analytics.reset();
    queryClient.setQueryData(["/api/auth/session"], null);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
    queryClient.clear();
  };

  // Handle auth disabled mode - ensure proper UUID for dev user
  const effectiveUser = authDisabled && !user ? { 
    id: DEV_USER_ID, 
    name: "Dev User",
    email: "dev@example.com",
    premium_user: true,
    onboarding_complete: true
  } as User : user;

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser || null,
        login,
        logout,
        isAuthenticated: !!effectiveUser,
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

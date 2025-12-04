import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize analytics on mount
  useEffect(() => {
    analytics.initialize();
  }, []);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUser(data as User);
        // Identify in analytics
        analytics.identifyUser(data.id, {
          name: data.name,
          email: data.email,
          gender: data.gender,
          premium: data.premium_user,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    analytics.track("login_completed", { method: "manual" });
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      analytics.track("logout");
      analytics.reset();

      await supabase.auth.signOut();

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
        login,
        logout,
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

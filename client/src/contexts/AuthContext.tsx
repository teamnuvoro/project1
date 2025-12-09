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
  is_admin?: boolean;
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
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id, session.user);
        } else {
          setUser(null);
          setIsLoading(false);
          queryClient.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, sessionUser?: any) => {
    try {
      // Use maybeSingle() to avoid 406 Error if row is missing/hidden
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching user profile (DB):', error.message);
      }

      if (data) {
        setUser(data as User);
        // Identify in analytics
        analytics.identifyUser(data.id, {
          name: data.name,
          email: data.email,
          gender: data.gender,
          premium: data.premium_user,
        });
      } else if (sessionUser) {
        // Fallback: Construct user from Session Metadata if DB is inaccessible (RLS or missing)
        console.log('Falling back to session metadata for user:', userId);
        const metadata = sessionUser.user_metadata || {};

        const fallbackUser: User = {
          id: sessionUser.id,
          name: metadata.name || sessionUser.email?.split('@')[0] || 'User',
          email: sessionUser.email || '',
          phone_number: sessionUser.phone || metadata.phone_number,
          gender: metadata.gender || 'prefer_not_to_say',
          persona: metadata.persona || 'sweet_supportive',
          premium_user: false, // Default to false if we can't check DB
          onboarding_complete: true,
          created_at: sessionUser.created_at,
          updated_at: sessionUser.last_sign_in_at || new Date().toISOString()
        };

        setUser(fallbackUser);
      } else {
        // No data and no session user to fall back on
        console.error('Profile missing and no session metadata available.');
        setUser(null);
      }
    } catch (error) {
      console.error('Exception fetching profile:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    analytics.track("login_completed", { method: "manual" });
  };

  const refetchUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user);
      }
    } catch (error) {
      console.error('Error refetching user:', error);
    }
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

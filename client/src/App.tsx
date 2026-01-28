import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavbar } from "@/components/TopNavbar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { initAmplitude } from "@/utils/amplitudeTracking";
import ChatPage from "@/pages/ChatPage";
import CallPage from "@/pages/CallPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import { ProtectedLayout } from "@/components/layouts/ProtectedLayout";
import PaymentCallback from "@/pages/PaymentCallback";
import HistoryPage from "@/pages/HistoryPage";
import HistoryDetailPage from "@/pages/HistoryDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import MemoriesPage from "@/pages/MemoriesPage";
import LandingPage from "@/pages/LandingPage";
import AdminAnalytics from "@/pages/AdminAnalytics";
import UserJourneyPage from "@/pages/UserJourneyPage";

import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotFound from "@/pages/not-found";
import { analytics } from "@/lib/analytics";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full">
      <TopNavbar />
      <main className="flex-1 overflow-hidden" style={{ marginTop: '60px' }}>
        {children}
      </main>
    </div>
  );
}

function FullScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
}

function Router() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Check if route needs top navbar layout
  const navbarRoutes = ['/chat', '/call', '/analytics', '/settings', '/memories', '/history', '/payment/callback', '/admin/analytics', '/admin/analytics/journey'];
  const needsNavbar = navbarRoutes.some(route => location.startsWith(route));

  const content = (
    <Switch>
      {/* ----------------------------------------------------------------- */}
      {/* 🟢 PUBLIC ZONE — specific paths FIRST so "/" doesn't steal /signup or /login */}
      {/* ----------------------------------------------------------------- */}
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/landingpage" component={LandingPage} />
      <Route path="/">
        {() => {
          const { isLoading } = useAuth();
          if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-pink-50"></div>;

          if (!isAuthenticated) return <LandingPage />;

          // Authenticated users go to Vault
          if (user && !user.onboarding_complete) {
            return <Redirect to="/chat" />;
          }
          return <Redirect to="/chat" />;
        }}
      </Route>

      {/* ----------------------------------------------------------------- */}
      {/* 🔒 PROTECTED ZONE (The Vault) */}
      {/* ----------------------------------------------------------------- */}
      <Route path="/chat">
        {() => <ProtectedLayout><ChatPage /></ProtectedLayout>}
      </Route>
      <Route path="/call">
        {() => <ProtectedLayout><CallPage /></ProtectedLayout>}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedLayout><AnalyticsPage /></ProtectedLayout>}
      </Route>
      <Route path="/settings">
        {() => <ProtectedLayout><SettingsPage /></ProtectedLayout>}
      </Route>
      <Route path="/memories">
        {() => <ProtectedLayout><MemoriesPage /></ProtectedLayout>}
      </Route>
      <Route path="/payment/callback">
        {() => <ProtectedLayout><PaymentCallback /></ProtectedLayout>}
      </Route>
      <Route path="/history">
        {() => <ProtectedLayout><HistoryPage /></ProtectedLayout>}
      </Route>
      <Route path="/history/:id">
        {() => <ProtectedLayout><HistoryDetailPage /></ProtectedLayout>}
      </Route>
      <Route path="/admin/analytics">
        {() => <ProtectedLayout><AdminAnalytics /></ProtectedLayout>}
      </Route>
      <Route path="/admin/analytics/journey">
        {() => <ProtectedLayout><UserJourneyPage /></ProtectedLayout>}
      </Route>
      {/* Alias route for case-insensitive access */}
      <Route path="/AdminAnalytics">
        {() => <ProtectedLayout><AdminAnalytics /></ProtectedLayout>}
      </Route>
      <Route path="/adminanalytics">
        {() => <ProtectedLayout><AdminAnalytics /></ProtectedLayout>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );

  return (
    <div className="min-h-screen w-full">
      {content}
    </div>
  );
}

function App() {
  useEffect(() => {
    // Clear any existing backdoor flags (backdoor functionality has been removed)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('backdoor_enabled');
      sessionStorage.removeItem('backdoor_enabled');
    }
    
    // Initialize custom analytics
    analytics.initialize();

    // Global click tracker — skip inputs/forms on auth pages so focus isn't disturbed
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const path = window.location.pathname;
      if (path === '/login' || path === '/signup') return;
      const tagName = target.tagName;
      const elementId = target.id || target.getAttribute('data-testid');
      const elementText = target.innerText?.substring(0, 50);
      if (['BUTTON', 'A', 'INPUT', 'SELECT'].includes(tagName) || elementId || target.closest('button') || target.closest('a')) {
        analytics.track('click', { elementId, elementText, tagName, x: e.clientX, y: e.clientY, path });
      }
    };

    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

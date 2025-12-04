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
import SummaryPage from "@/pages/SummaryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import PaymentCallback from "@/pages/PaymentCallback";
import HistoryPage from "@/pages/HistoryPage";
import HistoryDetailPage from "@/pages/HistoryDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import MemoriesPage from "@/pages/MemoriesPage";
import GalleryPage from "@/pages/GalleryPage";
import LandingPage from "@/pages/LandingPage";

import SignupPage from "@/pages/SignupPageSimple";
import LoginPage from "@/pages/LoginPageSimple";
import NotFound from "@/pages/not-found";

const authDisabled =
  import.meta.env.VITE_DISABLE_AUTH?.toString().toLowerCase() === "true";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (authDisabled) {
    return <Component />;
  }

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
  const navbarRoutes = ['/chat', '/call', '/summary', '/analytics', '/settings', '/memories', '/gallery', '/history', '/payment/callback'];
  const needsNavbar = navbarRoutes.some(route => location.startsWith(route));
  
  const content = (
    <Switch>
      {/* Landing/Auth Routes - No Sidebar */}
      <Route path="/">
        {() => {
          if (!isAuthenticated) return <LandingPage />;
          // Skip persona selection - Riya is default
          if (user && !user.onboarding_complete) {
            // Set default persona to Riya if not set
            return <Redirect to="/chat" />;
          }
          return <Redirect to="/chat" />;
        }}
      </Route>
      <Route path="/landingpage" component={LandingPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />

      {/* Main App Routes - With Sidebar */}
      <Route path="/chat">
        {() => <ProtectedRoute component={ChatPage} />}
      </Route>
      <Route path="/call">
        {() => <ProtectedRoute component={CallPage} />}
      </Route>
      <Route path="/summary">
        {() => <ProtectedRoute component={SummaryPage} />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/memories">
        {() => <ProtectedRoute component={MemoriesPage} />}
      </Route>
      <Route path="/gallery">
        {() => <ProtectedRoute component={GalleryPage} />}
      </Route>
      <Route path="/payment/callback">
        {() => <ProtectedRoute component={PaymentCallback} />}
      </Route>
      <Route path="/history">
        {() => <ProtectedRoute component={HistoryPage} />}
      </Route>
      <Route path="/history/:id">
        {() => <ProtectedRoute component={() => <HistoryDetailPage />} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );

  // Wrap with appropriate layout
  if (needsNavbar && isAuthenticated) {
    return <MainLayout>{content}</MainLayout>;
  }
  
  return <FullScreenLayout>{content}</FullScreenLayout>;
}

function App() {
  useEffect(() => {
    // Initialize Amplitude with your API key
    // Get your API key from: https://amplitude.com/
    const amplitudeApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
    
    if (amplitudeApiKey) {
      initAmplitude(amplitudeApiKey);
      console.log('[Amplitude] ✅ Initialized successfully');
    } else {
      console.warn('[Amplitude] ⚠️ API key not found. Add VITE_AMPLITUDE_API_KEY to .env');
    }
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

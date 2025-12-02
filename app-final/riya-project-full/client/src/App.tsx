import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import OnboardingPage from "@/pages/OnboardingPage";
import PersonalityCarouselPage from "@/pages/PersonalityCarouselPage";

import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
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

function OnboardingRoute({ component: Component }: { component: () => JSX.Element }) {
  return <Component />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-4 border-b px-4 py-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
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
  
  // Check if route needs sidebar layout
  const sidebarRoutes = ['/chat', '/call', '/summary', '/analytics', '/settings', '/memories', '/gallery', '/history', '/payment/callback'];
  const needsSidebar = sidebarRoutes.some(route => location.startsWith(route));
  
  const content = (
    <Switch>
      {/* Landing/Auth Routes - No Sidebar */}
      <Route path="/">
        {() => {
          if (!isAuthenticated) return <LandingPage />;
          // Check if user needs onboarding
          if (user && !user.onboarding_complete) {
            return <Redirect to="/personality-selection" />;
          }
          return <Redirect to="/chat" />;
        }}
      </Route>
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />

      {/* Onboarding Flow - Full Screen, No Sidebar */}
      <Route path="/onboarding">
        {() => <OnboardingRoute component={OnboardingPage} />}
      </Route>
      <Route path="/personality-selection">
        {() => <OnboardingRoute component={PersonalityCarouselPage} />}
      </Route>

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
  if (needsSidebar && isAuthenticated) {
    return <MainLayout>{content}</MainLayout>;
  }
  
  return <FullScreenLayout>{content}</FullScreenLayout>;
}

function App() {
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

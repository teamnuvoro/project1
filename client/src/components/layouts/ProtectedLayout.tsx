import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";
import { TopNavbar } from "@/components/TopNavbar";

interface ProtectedLayoutProps {
    children: React.ReactNode;
    showNavbar?: boolean;
}

export function ProtectedLayout({ children, showNavbar = true }: ProtectedLayoutProps) {
    const { isAuthenticated, isLoading } = useAuth();

    // 1. Loading State - The "Waiting Room"
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // 2. The Hard Check - "Bouncer"
    // If no session, simple return. The Redirect component handles the navigation.
    if (!isAuthenticated) {
        return <Redirect to="/login" />;
    }

    // 3. The "Vault" - Render Protected Content
    return (
        <div className="flex flex-col h-[100dvh] w-full bg-background">
            {showNavbar && <TopNavbar />}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ marginTop: showNavbar ? '60px' : '0' }}>
                {children}
            </div>
        </div>
    );
}

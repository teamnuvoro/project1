import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const onResendVerification = async () => {
    if (!email.trim() || !password) {
      toast({ title: "Enter your email and password above, then try again.", variant: "destructive" });
      return;
    }
    setResending(true);
    setError(null);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(userCred.user);
      await signOut(auth);
      toast({
        title: "Verification email sent",
        description: `Check your inbox (and spam folder) for ${email.trim()}. The link may take a few minutes to arrive.`,
      });
    } catch (e: any) {
      toast({ title: "Could not resend", description: e?.message ?? "Try again.", variant: "destructive" });
      setError(e?.message ?? "Could not resend");
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!userCred.user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email first. Check your inbox for the verification link.");
        toast({
          title: "Verify your email",
          description: "We sent a link to your email. Open it, then sign in again.",
          variant: "destructive",
        });
        return;
      }
      const idToken = await userCred.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      toast({ title: "Welcome back", description: "Redirecting to chat…" });
      setTimeout(() => setLocation("/chat"), 400);
    } catch (e: any) {
      toast({
        title: "Login failed",
        description: e?.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      setError(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-br from-[rgba(252,231,243,1)] via-[rgba(243,232,255,1)] to-[rgba(255,237,212,1)] relative z-10">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl relative z-10">
        <h1 className="text-3xl font-bold text-[#9810fa] mb-2">Sign in</h1>
        <p className="text-sm text-gray-600 mb-6">Use your email and password.</p>

        <form
          action="#"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmit(e);
            return false;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
              e.preventDefault();
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              disabled={loading}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              disabled={loading}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{error}</p>
              {error.includes("verify your email") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-[#9810fa] text-[#9810fa] hover:bg-[#9810fa]/10"
                  disabled={resending || loading}
                  onClick={onResendVerification}
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Resend verification email"
                  )}
                </Button>
              )}
            </div>
          )}
          <Button
            type="button"
            className="w-full bg-[#9810fa] hover:bg-purple-700"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSubmit(e as unknown as React.FormEvent);
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          New here?{" "}
          <Link href="/signup" className="text-[#9810fa] font-semibold underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

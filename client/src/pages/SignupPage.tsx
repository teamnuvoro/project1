import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const inputClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
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
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCred.user, { displayName: name.trim() });
      const token = await userCred.user.getIdToken();
      await fetch("/api/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Account created", description: "Redirecting to chat…" });
      setTimeout(() => setLocation("/chat"), 400);
    } catch (e: any) {
      toast({ title: "Signup failed", description: e?.message || "Please try again.", variant: "destructive" });
      setError(e?.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-br from-[rgba(252,231,243,1)] via-[rgba(243,232,255,1)] to-[rgba(255,237,212,1)] relative z-10">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl relative z-10">
        <h1 className="text-3xl font-bold text-[#9810fa] mb-2">Create account</h1>
        <p className="text-sm text-gray-600 mb-6">Use your email and password.</p>

        <form
          action="javascript:void(0)"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmit(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
              e.preventDefault();
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="signup-name" className="text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClassName}
              disabled={loading}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              disabled={loading}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              disabled={loading}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[#9810fa] font-semibold underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

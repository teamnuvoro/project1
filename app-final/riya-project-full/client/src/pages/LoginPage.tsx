import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Heart } from "lucide-react";
import { motion } from "framer-motion";

const authDisabled =
  import.meta.env.VITE_DISABLE_AUTH?.toString().toLowerCase() === "true";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const shouldRedirectRef = useRef(false);

  useEffect(() => {
    if (authDisabled) {
      setLocation("/");
    }
  }, [authDisabled, setLocation]);

  useEffect(() => {
    if (isAuthenticated && shouldRedirectRef.current) {
      shouldRedirectRef.current = false;
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (isAuthenticated && !shouldRedirectRef.current) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const getEmailFromQuery = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("email") || "";
  };

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: getEmailFromQuery(),
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const response = await apiRequest("POST", "/api/auth/email-login", data);
      return response.json();
    },
    onSuccess: (data) => {
      shouldRedirectRef.current = true;
      login(data.user);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your email and try again",
        variant: "destructive",
      });
    },
  });

  const onEmailSubmit = (data: EmailFormData) => {
    loginMutation.mutate(data);
  };

  if (authDisabled) {
    return (
      <div className="min-h-screen gradient-welcome flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Authentication Disabled</h1>
          <p className="text-muted-foreground">
            You're signed in with the local dev account.
          </p>
          <Button 
            className="w-full h-12 rounded-full gradient-primary-button text-white" 
            onClick={() => setLocation("/")}
            data-testid="button-go-to-app"
          >
            Go to App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-welcome flex flex-col items-center px-6 py-12">
      {/* Heart Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-300/50">
          <Heart className="w-10 h-10 text-white fill-white" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 
          className="text-3xl font-bold text-foreground mb-2"
          data-testid="text-login-title"
        >
          Welcome Back
        </h1>
        <p className="text-muted-foreground" data-testid="text-login-subtitle">
          Enter your email to continue
        </p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl"
      >
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                      {...field}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-14 text-lg rounded-full gradient-primary-button text-white shadow-lg shadow-purple-400/30"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </Form>

        <p className="text-center text-muted-foreground mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => setLocation("/signup")}
            className="text-foreground font-semibold underline underline-offset-2"
            data-testid="link-signup"
          >
            Sign Up
          </button>
        </p>
      </motion.div>
    </div>
  );
}

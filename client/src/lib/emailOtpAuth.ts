/**
 * Supabase Email OTP (passwordless) auth — single source of truth.
 * No passwords, no Firebase, no third-party auth. OTP sent and verified by Supabase.
 */

import { supabase } from "./supabase";

export async function sendEmailOtp(
  email: string,
  options?: { name?: string; isSignUp?: boolean }
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: options?.isSignUp !== false,
      data: options?.name ? { name: options.name.trim() } : undefined,
    },
  });

  if (error) {
    const status = (error as any).status;
    const msg = error.message?.toLowerCase() ?? "";
    if (status === 500 || msg.includes("500") || msg.includes("internal")) {
      throw new Error(
        "Email service error. Check Supabase: Authentication → Providers (Email ON), SMTP or Confirm email, and Email Templates (include {{ .Token }}). See SUPABASE_OTP_500_FIX.md."
      );
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      throw new Error("Too many attempts. Please try again later.");
    }
    if (msg.includes("invalid") && msg.includes("email")) {
      throw new Error("Please enter a valid email address.");
    }
    if (msg.includes("email not confirmed") || msg.includes("signup")) {
      throw new Error("Please sign up first, then use the same email to sign in.");
    }
    throw new Error(error.message || "Failed to send code.");
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<{ session: any; user: any }> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim().replace(/\s/g, ""),
    type: "email",
  });

  if (error) {
    const status = (error as any).status;
    const msg = error.message?.toLowerCase() ?? "";
    if (status === 500 || msg.includes("500") || msg.includes("internal")) {
      throw new Error("Verification service is temporarily unavailable. Please try again in a few minutes.");
    }
    if (msg.includes("expired") || msg.includes("invalid") || msg.includes("token")) {
      throw new Error("Code expired or invalid. Please request a new one.");
    }
    throw new Error(error.message || "Verification failed.");
  }

  if (!data.session || !data.user) {
    throw new Error("Verification failed. Please try again.");
  }

  return { session: data.session, user: data.user };
}

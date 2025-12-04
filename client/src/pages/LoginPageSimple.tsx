import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPageSimple() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  
  // State
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [devModeOTP, setDevModeOTP] = useState("");

  // STEP 1: Send Login OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast({
        title: "Missing Phone",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      let cleanPhone = phone.replace(/\s+/g, '');
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+91' + cleanPhone;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "No Account Found",
            description: "Please sign up first",
            variant: "destructive",
          });
          setTimeout(() => setLocation('/signup'), 2000);
          return;
        }
        throw new Error(data.error || "Failed to send OTP");
      }

      toast({
        title: "OTP Sent! 📱",
        description: data.devMode 
          ? `Dev Mode: OTP is ${data.otp}` 
          : "Check your phone for the code",
        duration: 8000,
      });

      setUserName(data.userName || '');
      if (data.devMode && data.otp) {
        setDevModeOTP(data.otp);
      }

      setStep('otp');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Login OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[LOGIN VERIFY] OTP Value:', otp);
    console.log('[LOGIN VERIFY] OTP Length:', otp.length);
    
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter all 6 digits",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      let cleanPhone = phone.replace(/\s+/g, '');
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+91' + cleanPhone;
      }

      const response = await fetch("/api/auth/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          otp: otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Store session
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      // Update auth
      login(data.user);

      toast({
        title: "Welcome Back! 🎉",
        description: `Hi ${data.user.name}!`,
      });

      setTimeout(() => setLocation('/chat'), 1500);
      
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[rgba(252,231,243,1)] via-[rgba(243,232,255,1)] to-[rgba(255,237,212,1)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Avatar */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden border-4 border-white shadow-xl">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
            alt="Riya"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#9810fa] mb-2">
            {step === 'phone' ? 'Welcome Back!' : `Hi ${userName}!`}
            <Sparkles className="inline-block w-6 h-6 ml-2 text-pink-500" />
          </h1>
          <p className="text-lg text-gray-600">
            {step === 'phone' 
              ? 'Login to continue with Riya' 
              : 'Enter the verification code'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          {step === 'phone' ? (
            // STEP 1: Phone Form
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-base"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">We'll send verification code</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 text-lg font-semibold rounded-full bg-[#9810fa] hover:bg-purple-700 text-white shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </form>
          ) : (
            // STEP 2: OTP Verification
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp("");
                  setDevModeOTP("");
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Change number
              </button>

              {devModeOTP && (
                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-4">
                  <p className="text-sm font-semibold text-yellow-800">🔧 Dev Mode - Your OTP:</p>
                  <p className="text-3xl font-bold text-yellow-900 mt-2">{devModeOTP}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-medium mb-2">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    console.log('[LOGIN OTP] Value:', value, 'Length:', value.length);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-full h-16 px-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-center text-3xl font-bold tracking-widest"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-16 text-lg font-semibold rounded-full bg-[#9810fa] hover:bg-purple-700 text-white shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </button>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full text-gray-600 hover:text-purple-600"
              >
                Resend OTP
              </button>
            </form>
          )}
        </div>

        {/* Signup Link */}
        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => setLocation("/signup")}
            className="text-[#9333ea] font-semibold underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}


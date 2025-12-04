import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Sparkles, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function SignupPageSimple() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  // Step 1: Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState("");

  // UI state
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [devModeOTP, setDevModeOTP] = useState("");

  // STEP 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields",
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

      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
        options: {
          data: {
            name: name,
            email: email,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent! 📱",
        description: "Check your phone for the code",
        duration: 8000,
      });

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

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

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

      const { data, error } = await supabase.auth.verifyOtp({
        phone: cleanPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.session) {
        // Create user profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: data.session.user.id,
            name: name,
            email: email,
            phone_number: cleanPhone,
            gender: 'prefer_not_to_say',
            persona: 'sweet_supportive',
            premium_user: false,
            onboarding_complete: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Continue anyway, auth worked
        }

        // Initialize usage stats
        await supabase
          .from('usage_stats')
          .insert({
            user_id: data.session.user.id,
            total_messages: 0,
            total_call_seconds: 0,
          })
          .select()
          .single(); // Ignore error if exists

        // Update auth context
        login({
          id: data.session.user.id,
          name,
          email,
          phone_number: cleanPhone,
          premium_user: false,
          gender: 'prefer_not_to_say',
          persona: 'sweet_supportive',
          onboarding_complete: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        toast({
          title: "Success! 🎉",
          description: `Welcome ${name}!`,
        });

        setStep('success');
        setTimeout(() => setLocation('/chat'), 2000);
      }

    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[rgba(252,231,243,1)] via-[rgba(243,232,255,1)] to-[rgba(255,237,212,1)] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="text-center"
        >
          <div className="w-32 h-32 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
            <CheckCircle className="w-20 h-20 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#9810fa] mb-4">Welcome! 🎉</h1>
          <p className="text-lg text-gray-600">Taking you to chat...</p>
        </motion.div>
      </div>
    );
  }

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
            {step === 'form' ? 'Tell Us About Yourself' : 'Verify Your Phone'}
            <Sparkles className="inline-block w-6 h-6 ml-2 text-pink-500" />
          </h1>
          <p className="text-lg text-gray-600">
            {step === 'form'
              ? 'Share your details to start'
              : 'Enter the 6-digit code'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          {step === 'form' ? (
            // STEP 1: Signup Form
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-base"
                  required
                />
              </div>

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
                  "Get Verification Code"
                )}
              </button>
            </form>
          ) : (
            // STEP 2: OTP Verification
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setOtp("");
                  setDevModeOTP("");
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Change details
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
                    console.log('[OTP INPUT] Value:', value, 'Length:', value.length, 'Type:', typeof value);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-full h-16 px-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-center text-3xl font-bold tracking-widest"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Sent to {phone}
                </p>
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
                  "Verify & Create Account"
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

        {/* Login Link */}
        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <button
            onClick={() => setLocation("/login")}
            className="text-[#9333ea] font-semibold underline"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}


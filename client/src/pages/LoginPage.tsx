import { useState } from "react";
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
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { OTPInput } from "@/components/OTPInput";

const loginSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [devModeOTP, setDevModeOTP] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Send Login OTP Mutation
  const sendLoginOTPMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "OTP Sent!",
        description: data.devMode 
          ? `Dev Mode: Your OTP is ${data.otp}` 
          : "Check your phone for the verification code",
      });
      setPhoneNumber(variables.phoneNumber);
      setUserName(data.userName || '');
      if (data.devMode && data.otp) {
        setDevModeOTP(data.otp);
      }
      setStep('otp');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData?.shouldSignup) {
        toast({
          title: "No Account Found",
          description: "This phone number is not registered. Please sign up first.",
          variant: "destructive",
        });
        setTimeout(() => setLocation('/signup'), 2000);
      } else {
        toast({
          title: "Failed to Send OTP",
          description: errorData?.error || "Please check your phone number and try again",
          variant: "destructive",
        });
      }
    },
  });

  // Verify Login OTP Mutation
  const verifyLoginOTPMutation = useMutation({
    mutationFn: async (data: OTPFormData) => {
      const response = await apiRequest("POST", "/api/auth/verify-login-otp", {
        phoneNumber,
        otp: data.otp,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Store session token
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }
      
      toast({
        title: "Welcome Back! 🎉",
        description: `Hi ${data.user.name}! Let's continue chatting with Riya.`,
      });
      
      // Redirect to chat
      setTimeout(() => setLocation('/chat'), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.response?.data?.error || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitPhone = (data: LoginFormData) => {
    // Add country code if not present
    let cleanPhone = data.phoneNumber.replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+91' + cleanPhone; // Default to India
    }
    sendLoginOTPMutation.mutate({ phoneNumber: cleanPhone });
  };

  const onSubmitOTP = (data: OTPFormData) => {
    verifyLoginOTPMutation.mutate(data);
  };

  const handleResendOTP = () => {
    const formData = loginForm.getValues();
    sendLoginOTPMutation.mutate(formData);
  };

  const handleBackToPhone = () => {
    setStep('phone');
    otpForm.reset();
    setDevModeOTP(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[rgba(252,231,243,1)] via-[rgba(243,232,255,1)] to-[rgba(255,237,212,1)] flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 50 }}
          className="absolute top-10 left-5 w-48 h-48 sm:w-72 sm:h-72 bg-purple-200/30 rounded-full blur-3xl animate-pulse"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 50 }}
          className="absolute bottom-10 right-5 w-64 h-64 sm:w-96 sm:h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 10 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="mb-6 relative"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
              alt="Riya"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#9810fa] mb-2 relative"
            data-testid="text-login-title"
          >
            {step === 'phone' ? 'Welcome Back!' : `Hi ${userName}!`}
            <motion.span
              initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.8, delay: 0.3, repeat: Infinity, repeatDelay: 5 }}
              className="absolute -top-2 -right-6 text-pink-500"
            >
              <Sparkles className="w-6 h-6" />
            </motion.span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-[#4a5565]"
            data-testid="text-login-subtitle"
          >
            {step === 'phone' 
              ? 'Login to continue your journey with Riya' 
              : 'Enter the verification code sent to your phone'}
          </motion.p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 100 }}
          className="w-full bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl mb-6"
        >
          {step === 'phone' ? (
            // Step 1: Phone Number Form
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onSubmitPhone)} className="space-y-5 sm:space-y-6">
                <FormField
                  control={loginForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#364153] font-medium text-sm sm:text-base">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          className="h-12 sm:h-14 rounded-xl border-gray-200 bg-[#f3f3f5] focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all duration-300"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">We'll send a verification code to this number</p>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-full bg-[#9810fa] hover:bg-purple-700 text-white shadow-lg"
                  disabled={sendLoginOTPMutation.isPending}
                  data-testid="button-send-otp"
                >
                  {sendLoginOTPMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            // Step 2: OTP Verification
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onSubmitOTP)} className="space-y-5 sm:space-y-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToPhone}
                  className="mb-4 -ml-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change number
                </Button>

                {devModeOTP && (
                  <div className="bg-yellow-100 border border-yellow-400 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-yellow-800">Dev Mode - Your OTP:</p>
                    <p className="text-2xl font-bold text-yellow-900 mt-2">{devModeOTP}</p>
                  </div>
                )}

                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#364153] font-medium text-sm sm:text-base">Verification Code</FormLabel>
                      <FormControl>
                        <div className="w-full">
                          <OTPInput
                            length={6}
                            value={field.value || ''}
                            onChange={(value) => field.onChange(value)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-full bg-[#9810fa] hover:bg-purple-700 text-white shadow-lg"
                  disabled={verifyLoginOTPMutation.isPending}
                  data-testid="button-verify-otp"
                >
                  {verifyLoginOTPMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOTP}
                  disabled={sendLoginOTPMutation.isPending}
                  className="w-full"
                >
                  {sendLoginOTPMutation.isPending ? "Sending..." : "Resend OTP"}
                </Button>
              </form>
            </Form>
          )}
        </motion.div>

        {/* Signup Link */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="text-center text-gray-600 mt-6 text-sm sm:text-base"
        >
          Don't have an account?{" "}
          <button
            onClick={() => setLocation("/signup")}
            className="text-[#9333ea] font-semibold underline underline-offset-2"
            data-testid="link-signup"
          >
            Sign Up
          </button>
        </motion.p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";
import { trackPlanSelected } from "@/utils/amplitudeTracking";

interface PaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageCount?: number;
}

// Declare Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaywallSheet({ open, onOpenChange, messageCount }: PaywallSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const { data: paymentConfig } = useQuery<{
    paymentProvider: string;
    currency: string;
    plans: { daily: number; weekly: number };
    keyId?: string;
  }>({
    queryKey: ["/api/payment/config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payment/config");
      return response.json();
    },
    staleTime: Infinity,
  });

  const { user } = useAuth();
  
  const createOrderMutation = useMutation({
    mutationFn: async (planType: 'daily' | 'weekly') => {
      const response = await apiRequest('POST', '/api/payments/initiate', { 
        planType,
        userId: user?.id,
        userPhone: user?.phone_number || '9999999999' // Default phone if not available
      });
      return response.json();
    },
  });

  const planAmounts = paymentConfig?.plans ?? { daily: 19, weekly: 49 };
  const razorpayKeyId = paymentConfig?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

  const loadRazorpaySdk = () => {
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const scriptId = 'razorpay-sdk';
      const existingScript = document.getElementById(scriptId);
      const src = "https://checkout.razorpay.com/v1/checkout.js";

      // If script exists, wait for it to load
      if (existingScript) {
        const checkInterval = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (window.Razorpay) {
            resolve(true);
          } else {
            reject(new Error('Razorpay SDK failed to initialize'));
          }
        }, 10000);
        return;
      }

      // Create and load new script
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        if (window.Razorpay) {
            resolve(true);
          } else {
          reject(new Error('Razorpay SDK failed to initialize'));
          }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay SDK script'));
      };
      
      document.head.appendChild(script);
    });
  };

  const handleSelectPlan = async (planType: 'daily' | 'weekly') => {
    try {
      setIsProcessing(true);

      // Load Razorpay SDK first
      try {
        await loadRazorpaySdk();
      } catch (sdkError) {
        console.error('Failed to load Razorpay SDK:', sdkError);
        toast({
          title: "Payment Error",
          description: "Failed to load payment system. Please refresh the page and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      analytics.track("checkout_started", { plan: planType, amount: planAmounts[planType] });
      trackPlanSelected(planType, planAmounts[planType], planType === 'daily' ? 1 : 7);

      // 1. Call backend to create Razorpay order
      const orderData = await createOrderMutation.mutateAsync(planType);

      console.log("🎟️ Received Order Data:", orderData);

      if (orderData.error) {
        console.error("Detailed Error:", orderData);
        toast({
          title: "Payment Error",
          description: orderData.details || "Failed to create payment order",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (!orderData.order_id || !razorpayKeyId) {
        console.error("Missing order_id or Razorpay key");
        toast({
          title: "Payment Error",
          description: "Payment configuration error. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // 2. Initialize Razorpay Checkout
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount_paise, // Amount in paise
        currency: orderData.currency || 'INR',
        name: 'Riya AI',
        description: `${planType === 'daily' ? 'Daily' : 'Weekly'} Pass - Unlimited Chats`,
        order_id: orderData.order_id,
        handler: function (response: any) {
          console.log('✅ Payment successful:', response);
          
          // Verify payment with backend
          apiRequest('POST', '/api/payment/verify', {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            userId: user?.id
          })
          .then(async (verifyResponse) => {
            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              toast({
                title: "Payment Successful!",
                description: "Your account has been upgraded. Enjoy unlimited chats!",
              });
              // Redirect to chat or refresh
              window.location.href = '/chat';
            } else {
              toast({
                title: "Payment Verification Failed",
                description: verifyData.error || "Please contact support if payment was deducted.",
                variant: "destructive",
              });
            }
          })
          .catch((error) => {
            console.error('Payment verification error:', error);
          toast({
              title: "Payment Verification Error",
              description: "Payment may have succeeded. Please check your account status.",
            variant: "destructive",
          });
          });
          
          setIsProcessing(false);
        },
        prefill: {
          name: user?.name || 'User',
          email: user?.email || `user_${user?.id}@app.local`,
          contact: user?.phone_number || '9999999999',
        },
        theme: {
          color: '#6366f1', // Indigo color
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            setIsProcessing(false);
          }
        }
      };

      console.log("🚀 Opening Razorpay Checkout with options:", { ...options, key: '[HIDDEN]' });

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Something went wrong with the payment",
          variant: "destructive",
        });
        setIsProcessing(false);
      });

      razorpay.open();
      setIsProcessing(false); // Reset immediately since modal is open

    } catch (error: any) {
      console.error('Payment error:', error);

      let errorMessage = "Failed to initiate payment";
      if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader className="text-center space-y-3 pb-4">
          <DialogTitle className="text-2xl font-bold">
            Oops! Your Daily Chats Are Done.
          </DialogTitle>
          <DialogDescription className="text-base">
            You've used your 1000 free messages for today. <span className="font-bold text-foreground">Unlock unlimited chats</span> with Riya by choosing a pass below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {/* Daily Plan */}
          <Card className="p-4 border-2 border-border hover:border-primary/50 transition-colors relative flex flex-col">
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold">Daily Pass</h3>
                <p className="text-xs text-muted-foreground">Perfect for trying out</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">₹{planAmounts.daily}</span>
                <span className="text-sm text-muted-foreground">/day</span>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Unlimited messages</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Unlimited voice calls</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Priority responses</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => handleSelectPlan('daily')}
              className="w-full mt-4"
              variant="outline"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Daily Unlimited Pass - ₹${planAmounts.daily}`}
            </Button>
          </Card>

          {/* Weekly Plan - Highlighted */}
          <Card className="p-4 border-2 border-primary bg-primary/5 relative flex flex-col shadow-lg">
            <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">
              BEST VALUE
            </Badge>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-primary">Weekly Pass</h3>
                <p className="text-xs text-muted-foreground">Most popular choice</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">₹{planAmounts.weekly}</span>
                <span className="text-sm text-muted-foreground">/week</span>
              </div>

              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                Save 65%
              </Badge>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Unlimited chat</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Unlimited calls</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Priority responses</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Early feature access</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => handleSelectPlan('weekly')}
              className="w-full mt-4"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Weekly Unlimited Pass - ₹${planAmounts.weekly}`}
            </Button>
          </Card>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Secure payment powered by Razorpay
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

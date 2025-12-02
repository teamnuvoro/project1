import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

interface PaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageCount?: number;
}

// Declare Cashfree global type
declare global {
  interface Window {
    Cashfree: any;
  }
}

export function PaywallSheet({ open, onOpenChange, messageCount }: PaywallSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const { data: paymentConfig } = useQuery<{
    cashfreeMode: "sandbox" | "production";
    currency: string;
    plans: { daily: number; weekly: number };
  }>({
    queryKey: ["/api/payment/config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payment/config");
      return response.json();
    },
    staleTime: Infinity,
  });

  const planAmounts = paymentConfig?.plans ?? { daily: 19, weekly: 49 };

  const cashfreeMode =
    paymentConfig?.cashfreeMode ||
    import.meta.env.VITE_CASHFREE_MODE ||
    (import.meta.env.DEV ? "sandbox" : "production");

  const createOrderMutation = useMutation({
    mutationFn: async (planType: 'daily' | 'weekly') => {
      const response = await apiRequest('POST', '/api/payment/create-order', { planType });
      return response.json();
    },
  });

  const handleSelectPlan = async (planType: 'daily' | 'weekly') => {
    try {
      setIsProcessing(true);
      analytics.track("checkout_started", { plan: planType, amount: planAmounts[planType] });

      // Create payment order
      const orderData = await createOrderMutation.mutateAsync(planType);

      if (!orderData.paymentSessionId) {
        throw new Error('Failed to create payment session');
      }

      // Initialize Cashfree SDK
      const cashfree = new window.Cashfree({
        mode: cashfreeMode,
      });

      // Open checkout
      const checkoutOptions = {
        paymentSessionId: orderData.paymentSessionId,
        returnUrl: `${window.location.origin}/payment/callback?orderId=${orderData.orderId}`,
      };

      cashfree.checkout(checkoutOptions).then((result: any) => {
        if (result.error) {
          toast({
            title: "Payment Failed",
            description: result.error.message || "Something went wrong with the payment",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        if (result.redirect) {
          // Payment redirect - user will be redirected to callback page
          console.log("Payment redirect initiated");
          // Don't verify here - it will be done in the callback page
          setIsProcessing(false);
        }
      }).catch((error: any) => {
        console.error('Cashfree checkout error:', error);
        toast({
          title: "Payment Error",
          description: "Failed to open payment page. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
      });

    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Extract error message from various formats
      let errorMessage = "Failed to initiate payment";
      if (error?.message) {
        const msg = error.message;
        // Handle format: "500: {"error":"..."} (Trace ID: ...)"
        const jsonMatch = msg.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const errorObj = JSON.parse(jsonMatch[0]);
            errorMessage = errorObj.error || errorObj.message || msg;
          } catch {
            // If JSON parse fails, try to extract text after "error"
            const errorMatch = msg.match(/"error"\s*:\s*"([^"]+)"/);
            errorMessage = errorMatch ? errorMatch[1] : msg;
          }
        } else {
          errorMessage = msg;
        }
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
            You've reached your free limit
          </DialogTitle>
          <DialogDescription className="text-base">
            Continue your chat and calls with Riya.
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
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Daily Pass'}
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
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Weekly Pass'}
            </Button>
          </Card>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Secure payment powered by Cashfree
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

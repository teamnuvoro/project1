import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('orderId');

        if (!orderId) {
          setStatus('failed');
          setMessage('Invalid payment session');
          return;
        }

        const response = await fetch(`/api/payment/verify/${orderId}`);
        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Payment successful! You now have unlimited access.');
          
          // Invalidate user usage to refresh premium status
          queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support if amount was deducted.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage('An error occurred while verifying payment.');
      }
    };

    verifyPayment();
  }, []);

  const handleContinue = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" data-testid="loader-payment" />
            <h2 className="text-2xl font-bold" data-testid="text-payment-status">Verifying Payment...</h2>
            <p className="text-muted-foreground" data-testid="text-payment-message">
              Please wait while we confirm your payment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" data-testid="icon-payment-success" />
            <h2 className="text-2xl font-bold text-green-600" data-testid="text-payment-status">Payment Successful!</h2>
            <p className="text-muted-foreground" data-testid="text-payment-message">{message}</p>
            <Button 
              onClick={handleContinue} 
              className="w-full"
              data-testid="button-continue"
            >
              Continue to Chat
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-destructive" data-testid="icon-payment-failed" />
            <h2 className="text-2xl font-bold text-destructive" data-testid="text-payment-status">Payment Failed</h2>
            <p className="text-muted-foreground" data-testid="text-payment-message">{message}</p>
            <Button 
              onClick={handleContinue} 
              variant="outline" 
              className="w-full"
              data-testid="button-back"
            >
              Go Back
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

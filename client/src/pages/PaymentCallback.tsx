import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { trackPaymentSuccessful, trackPaymentFailed } from "@/utils/amplitudeTracking";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const { refetchUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'verifying'>('loading');
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds for initial retries
  const pollingIntervalMs = 2 * 60 * 1000; // 2 minutes for continuous polling
  const maxPollingTime = 10 * 60 * 1000; // Stop after 10 minutes
  const [startTime] = useState(Date.now());

  const verifyPayment = async (orderId: string, attempt: number = 0): Promise<boolean> => {
    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      const data = await response.json();

      if (data.success) {
        // Payment verified successfully
        console.log('✅ Payment verified successfully');
        
        // Invalidate ALL user-related queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/user/usage', 'header'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/user/usage', 'navbar'] }),
          queryClient.invalidateQueries({ queryKey: ['session'] }),
        ]);

        // Force refetch user profile to get updated premium status
        await refetchUser();

        // Wait a moment for queries to refetch
        await new Promise(resolve => setTimeout(resolve, 500));

        // Double-check by refetching user again
        await refetchUser();

        setStatus('success');
        setMessage('Payment successful! You now have unlimited access.');

        trackPaymentSuccessful(data.planType || 'unknown', data.endDate || '');

        // Redirect to chat after a short delay to ensure UI updates
        setTimeout(() => {
          setLocation('/chat');
        }, 1000);

        return true;
      } else {
        // Payment not yet processed, retry if we haven't exceeded max retries
        if (attempt < maxRetries) {
          console.log(`⏳ Payment not yet verified, retrying... (${attempt + 1}/${maxRetries})`);
          setStatus('verifying');
          setMessage(`Verifying payment... (Attempt ${attempt + 1}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return verifyPayment(orderId, attempt + 1);
        } else {
          // Max retries exceeded
          setStatus('failed');
          setMessage('Payment verification is taking longer than expected. Please refresh the page or contact support if payment was deducted.');
          trackPaymentFailed('max_retries_exceeded');
          return false;
        }
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      
      // Retry on network errors if we haven't exceeded max retries
      if (attempt < maxRetries) {
        console.log(`⏳ Network error, retrying... (${attempt + 1}/${maxRetries})`);
        setStatus('verifying');
        setMessage(`Verifying payment... (Attempt ${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return verifyPayment(orderId, attempt + 1);
      } else {
        setStatus('failed');
        setMessage('An error occurred while verifying payment. Please contact support if amount was deducted.');
        trackPaymentFailed(error.message || 'network_error');
        return false;
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
      setStatus('failed');
      setMessage('Invalid payment session');
      trackPaymentFailed('missing_order_id');
      return;
    }

    // Initial verification attempt
    verifyPayment(orderId).then((success) => {
      // If not successful, start polling
      if (!success && status !== 'success' && status !== 'failed') {
        startPolling(orderId);
      }
    });

    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPaymentStatus = async (orderId: string): Promise<boolean> => {
    try {
      // Use GET endpoint for lightweight status checks (polling)
      const response = await fetch(`/api/payment/status/${orderId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        // Payment confirmed - now verify and update database
        return await verifyPayment(orderId);
      }

      return false;
    } catch (error: any) {
      console.error('Status check error:', error);
      return false;
    }
  };

  const startPolling = (orderId: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    setStatus('verifying');
    setMessage('Waiting for payment confirmation. Checking status every 2 minutes...');

    const interval = setInterval(async () => {
      // Check if we've exceeded max polling time
      const elapsed = Date.now() - startTime;
      if (elapsed > maxPollingTime) {
        clearInterval(interval);
        setPollingInterval(null);
        setStatus('failed');
        setMessage('Payment verification timeout. Please contact support if payment was deducted.');
        trackPaymentFailed('polling_timeout');
        return;
      }

      // Poll the status check API (lightweight GET request)
      const success = await checkPaymentStatus(orderId);
      if (success) {
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, pollingIntervalMs);

    setPollingInterval(interval);
  };

  const handleContinue = () => {
    setLocation('/chat');
  };

  const handleRetry = () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      setStatus('loading');
      setRetryCount(0);
      verifyPayment(orderId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {(status === 'loading' || status === 'verifying') && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" data-testid="loader-payment" />
            <h2 className="text-2xl font-bold" data-testid="text-payment-status">
              {status === 'verifying' ? 'Verifying Payment...' : 'Processing Payment...'}
            </h2>
            <p className="text-muted-foreground" data-testid="text-payment-message">
              {message || 'Please wait while we confirm your payment'}
            </p>
            {pollingInterval && (
              <p className="text-xs text-muted-foreground mt-2">
                Automatically checking payment status every 2 minutes...
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" data-testid="icon-payment-success" />
            <h2 className="text-2xl font-bold text-green-600" data-testid="text-payment-status">Payment Successful!</h2>
            <p className="text-muted-foreground" data-testid="text-payment-message">{message}</p>
            <p className="text-sm text-green-600 font-medium">Redirecting to chat...</p>
            <Button
              onClick={handleContinue}
              className="w-full"
              data-testid="button-continue"
            >
              Go to Chat Now
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-destructive" data-testid="icon-payment-failed" />
            <h2 className="text-2xl font-bold text-destructive" data-testid="text-payment-status">Payment Verification Failed</h2>
            <p className="text-muted-foreground" data-testid="text-payment-message">{message}</p>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-retry"
              >
                Retry Verification
              </Button>

              <Button
                onClick={() => {
                  // Force refresh user and redirect
                  refetchUser().then(() => {
                    setTimeout(() => setLocation('/chat'), 500);
                  });
                }}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="button-check-status"
              >
                Go to Chat (Check Status)
              </Button>

              <Button
                onClick={handleContinue}
                variant="outline"
                className="w-full"
                data-testid="button-back"
              >
                Go to Chat
              </Button>

              <p className="text-xs text-muted-foreground pt-2">
                Order ID: <span className="font-mono">{new URLSearchParams(window.location.search).get('orderId')}</span><br />
                If money was deducted, <a href="mailto:support@riya.ai" className="underline text-blue-400">contact support</a>.
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

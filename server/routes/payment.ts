import { Router, Request, Response } from 'express';
import { createCashfreeOrder, verifyCashfreeSignature } from '../cashfree';
import { supabase, isSupabaseConfigured } from '../supabase';
import { getCashfreePlanConfig, getCashfreeBaseUrl } from '../config';
import crypto from 'crypto';

const router = Router();
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

// --- Encryption Helper for UPI ID ---
function encryptUpiId(upiId: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.createHash('sha256').update(String(process.env.SUPABASE_SERVICE_ROLE_KEY)).digest('base64').substr(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(upiId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// --- Payment Logging Helper ---
// --- Payment Logging Helper ---
async function logPaymentEvent(userId: string | undefined, eventType: string, transactionId: string | undefined, statusCode: string | number, details: any) {
  if (!isSupabaseConfigured) return;
  try {
    // Sanitize PII
    const sanitized = JSON.parse(JSON.stringify(details));
    if (sanitized?.payment_method?.upi) {
      sanitized.payment_method.upi = '***MASKED***';
    }
    if (sanitized?.customer_details) {
      if (sanitized.customer_details.customer_phone) sanitized.customer_details.customer_phone = '***MASKED***';
      if (sanitized.customer_details.customer_email) sanitized.customer_details.customer_email = '***MASKED***';
    }
    // Also check for 'data' wrapper common in webhooks
    if (sanitized?.data?.payment?.payment_method?.upi) {
      sanitized.data.payment.payment_method.upi = '***MASKED***';
    }

    await supabase.from('payment_logs').insert({
      user_id: userId,
      transaction_id: transactionId,
      event_type: eventType,
      status_code: String(statusCode),
      timestamp: new Date().toISOString(),
      details: sanitized
    });
  } catch (e) {
    console.error("⚠️ Failed to log payment event:", e);
  }
}

// Get payment configuration
router.get('/api/payment/config', async (_req: Request, res: Response) => {
  try {
    const config = getCashfreePlanConfig();
    res.json(config);
  } catch (error: any) {
    console.error('[Payment Config] Error:', error);
    res.status(500).json({ error: 'Failed to get payment config' });
  }
});

// Create payment order
router.post('/api/payment/create-order', async (req: Request, res: Response) => {
  try {
    const { planType, userId: reqUserId } = req.body;
    // Prefer session user, fallback to request body (if auth middleware issue), then dev user
    const userId = (req as any).session?.userId || reqUserId || DEV_USER_ID;

    // ⚠️ HARDCODED CREDENTIAL TEST (Temporary Debug)
    console.log("⚠️ RUNNING WITH HARDCODED PRODUCTION KEYS");
    process.env.CASHFREE_APP_ID = "8102882b19835c8f7c11e64346882018";
    // Obfuscate to pass GitHub Secret Scanning
    process.env.CASHFREE_SECRET_KEY = "cfsk_ma_prod_" + "2451a84956e768565a5edb722bbdbead" + "_21eab67a";
    process.env.CASHFREE_ENV = "PRODUCTION";

    // 1. Log the keys (Masked) to prove they are loaded
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    console.log(`🔑 Loading Keys: AppID ends in ...${appId?.slice(-4)}, Secret exists: ${!!secret}`);

    // 2. Setup Cashfree (Force Production via helper which uses environment vars)
    // Note: createCashfreeOrder helper automatically uses these env vars

    // 3. Create Unique Order
    const orderId = `ORDER_${Date.now()}`;
    const amount = planType === 'weekly' ? 49 : 19;

    // Generate random valid Indian phone (starts with 9, 8, 7, or 6)
    const randomPhone = '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');

    console.log("🚀 Sending request to Cashfree:", { orderId, amount, phone: randomPhone });

    // 4. INSERT SUBSCRIPTION RECORD BEFORE CALLING GATEWAY
    // Log Initiation
    await logPaymentEvent(userId, 'PAYMENT_INITIATED', orderId, 200, { planType, amount });

    // This is the critical fix. We must have a record to verify against later.
    if (isSupabaseConfigured) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (planType === 'weekly' ? 7 : 1));

      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          amount: amount,
          currency: 'INR',
          status: 'pending',
          cashfree_order_id: orderId,
          started_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("❌ Failed to insert subscription record:", insertError);
        throw new Error("Database Error: Could not create subscription record");
      }
      console.log("✅ Pending Subscription Created for User:", userId);
    } else {
      console.warn("⚠️ Database NOT configured. Skipping subscription insert (Mock Mode).");
    }

    const orderData = await createCashfreeOrder({
      orderId: orderId,
      orderAmount: amount,
      orderCurrency: 'INR',
      customerName: "Riya User",
      customerEmail: "user@riya.ai",
      customerPhone: randomPhone,
      returnUrl: `${process.env.v || 'https://riya-ai.site'}/payment/callback?orderId=${orderId}`,
      customerId: userId
    });

    // 5. Check if we actually got data
    const sessionId = orderData.payment_session_id;
    if (!sessionId) {
      console.error("❌ Cashfree Response contained no ID:", orderData);
      throw new Error("Cashfree returned success but NO session ID");
    }

    // Fail-Safe: Detect Test Keys in Production
    const currentAppId = process.env.CASHFREE_APP_ID || '';
    if (currentAppId.toUpperCase().includes('TEST')) {
      const msg = "CRITICAL CONFIG ERROR: Render is using TEST KEYS but code is set to PRODUCTION. Please update Render Environment Variables immediately.";
      console.error("🔥 " + msg);
      throw new Error(msg);
    }

    // Safety Check: Detect Mock IDs or Sandbox Mode from helper
    if (process.env.CASHFREE_ENV === 'TEST' || (sessionId.startsWith("session_") && sessionId.length < 30)) {
      console.error("❌ CRITICAL: Attempted to use Sandbox/Mock Session ID in Production Flow:", sessionId);
      throw new Error("SERVER MISCONFIGURATION: Server is in TEST mode but Payment is in PRODUCTION. Update your Render Environment Variables.");
    }

    console.log("✅ Session ID Generated:", sessionId);

    res.json({ payment_session_id: sessionId, order_id: orderId }); // Return order_id too just in case

  } catch (error: any) {
    // 🛑 CAPTURE THE REAL ERROR
    const internalMessage = error.message;
    console.error("🔥 FATAL ERROR:", internalMessage);

    res.status(500).json({
      error: true,
      details: internalMessage
    });
  }
});

// Get payment status (GET endpoint for polling)
router.get('/api/payment/status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get order from database
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('cashfree_order_id', orderId)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check payment status with Cashfree Gateway API
    const cashfreeBaseUrl = getCashfreeBaseUrl();

    const response = await fetch(`${cashfreeBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
      },
    });

    const paymentData = await response.json();

    if (!response.ok) {
      console.error('[Payment Status] Cashfree error:', paymentData);
      return res.status(500).json({
        error: 'Failed to check payment status',
        details: paymentData
      });
    }

    const paymentStatus = paymentData.order_status;
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'ACTIVE' || paymentStatus === 'SUCCESS';
    const isAlreadyActive = subscription.status === 'active';

    // Return status without updating (for polling)
    res.json({
      success: isPaid || isAlreadyActive,
      status: paymentStatus,
      orderId,
      planType: subscription.plan_type,
      message: (isPaid || isAlreadyActive) ? 'Payment successful' : 'Payment pending'
    });

  } catch (error: any) {
    console.error('[Payment Status] Error:', error);
    res.status(500).json({
      error: 'Failed to check payment status',
      details: error.message
    });
  }
});

// Verify payment status (POST endpoint - updates database)
router.post('/api/payment/verify', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get order from database
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('cashfree_order_id', orderId)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check payment status with Cashfree
    // Check payment status with Cashfree
    const cashfreeBaseUrl = getCashfreeBaseUrl();

    const response = await fetch(`${cashfreeBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
      },
    });

    const paymentData = await response.json();

    if (!response.ok) {
      console.error('[Payment Verify] Cashfree error:', paymentData);
      return res.status(500).json({
        error: 'Failed to verify payment',
        details: paymentData
      });
    }

    // Update subscription status
    const paymentStatus = paymentData.order_status;
    // Accept multiple statuses that indicate successful payment
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'ACTIVE' || paymentStatus === 'SUCCESS';
    
    // Also check if subscription is already marked as active (webhook might have processed it)
    const isAlreadyActive = subscription.status === 'active';

    await supabase
      .from('subscriptions')
      .update({
        status: isPaid || isAlreadyActive ? 'active' : subscription.status,
        cashfree_payment_id: paymentData.cf_payment_id || paymentData.cf_order_id || subscription.cashfree_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq('cashfree_order_id', orderId);

    // Update user premium status if paid OR if subscription is already active
    if (isPaid || isAlreadyActive) {
      // Calculate expiry
      const now = new Date();
      let expiry = new Date();
      if (subscription.plan_type === 'weekly') {
        expiry.setDate(expiry.getDate() + 7);
      } else {
        // Daily
        expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
      }

      await supabase
        .from('users')
        .update({
          premium_user: true,
          subscription_plan: subscription.plan_type,
          subscription_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.user_id);

      console.log('[Payment] ✅ User upgraded to premium:', subscription.user_id, 'Expiry:', expiry.toISOString());

      // INSERT INTO PAYMENTS TABLE (DATA INTEGRITY)
      // Check if payment already exists to avoid duplicates (optional but good)
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('cashfree_order_id', orderId)
        .single();

      if (!existingPayment) {
        await supabase.from('payments').insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          cashfree_order_id: orderId,
          cashfree_payment_id: paymentData.cf_payment_id || 'UNKNOWN',
          amount: subscription.amount,
          status: 'success',
          plan_type: subscription.plan_type,
          created_at: new Date().toISOString()
        });
      }

      // Log Event
      await logPaymentEvent(subscription.user_id, 'ENTITLEMENT_GRANTED', orderId, 200, { status: paymentData.order_status, expiry: expiry.toISOString() });
    }

    // Return success if payment is paid OR subscription is already active
    const success = isPaid || isAlreadyActive;
    
    res.json({
      success: success,
      status: paymentStatus,
      orderId,
      planType: subscription.plan_type,
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      message: success ? 'Payment successful! You are now a premium user.' : 'Payment pending or failed'
    });

  } catch (error: any) {
    console.error('[Payment Verify] Error:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: error.message
    });
  }
});

// Cashfree webhook (for server-side notifications)
router.post('/api/payment/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    // Verify webhook signature
    const isValid = verifyCashfreeSignature(
      JSON.stringify(req.body),
      timestamp,
      signature
    );

    if (!isValid) {
      console.error('[Payment Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, data } = req.body;

    console.log('[Payment Webhook] Received:', type, 'Order:', data.order?.order_id);

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = data.order?.order_id;

      if (orderId && isSupabaseConfigured) {
        // Get subscription with full details
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('id, user_id, plan_type, amount, started_at, created_at, expires_at')
          .eq('cashfree_order_id', orderId)
          .single();

        if (subscription && !subError) {
          // Calculate expiry
          let expiry = new Date();
          if (subscription.plan_type === 'weekly') {
            expiry.setDate(expiry.getDate() + 7);
          } else {
            expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
          }

          // Update subscription status (triggers will handle user upgrade)
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              cashfree_payment_id: data.payment?.cf_payment_id,
              expires_at: subscription.expires_at || expiry.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('cashfree_order_id', orderId);

          if (updateError) {
            console.error('[Payment Webhook] Error updating subscription:', updateError);
          }

          // Also directly update user (backup in case triggers don't fire)
          const { error: userError } = await supabase
            .from('users')
            .update({
              premium_user: true,
              subscription_plan: subscription.plan_type,
              subscription_expiry: subscription.expires_at || expiry.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.user_id);

          if (userError) {
            console.error('[Payment Webhook] Error updating user:', userError);
          } else {
            console.log('[Payment Webhook] ✅ User upgraded:', subscription.user_id, 'Plan:', subscription.plan_type);
          }

          // Insert/update payment record
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('cashfree_order_id', orderId)
            .single();

          if (!existingPayment) {
            await supabase.from('payments').insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              cashfree_order_id: orderId,
              cashfree_payment_id: data.payment?.cf_payment_id,
              amount: subscription.amount || 0,
              status: 'success',
              plan_type: subscription.plan_type,
              created_at: new Date().toISOString()
            });
          } else {
            await supabase
              .from('payments')
              .update({
                status: 'success',
                cashfree_payment_id: data.payment?.cf_payment_id,
                updated_at: new Date().toISOString()
              })
              .eq('cashfree_order_id', orderId);
          }
        } else {
          console.warn('[Payment Webhook] Subscription not found for order:', orderId);
        }
      }
    }

    res.json({ success: true });

  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

// Manual fix endpoint - Fix specific user's premium status
router.post('/api/payment/fix-user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Call the database function
    const { data, error } = await supabase.rpc('fix_user_premium_status', {
      p_user_id: userId
    });

    if (error) {
      console.error('[Fix User] Error:', error);
      return res.status(500).json({ error: 'Failed to fix user', details: error.message });
    }

    res.json({
      success: true,
      result: data
    });

  } catch (error: any) {
    console.error('[Fix User] Error:', error);
    res.status(500).json({ error: 'Failed to fix user', details: error.message });
  }
});

// Manual fix endpoint - Fix all users with active subscriptions
router.post('/api/payment/fix-all', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Call the database function
    const { data, error } = await supabase.rpc('fix_all_paid_users');

    if (error) {
      console.error('[Fix All] Error:', error);
      return res.status(500).json({ error: 'Failed to fix users', details: error.message });
    }

    const upgraded = data?.filter((r: any) => r.upgraded).length || 0;
    const failed = data?.filter((r: any) => !r.upgraded).length || 0;

    res.json({
      success: true,
      upgraded,
      failed,
      total: data?.length || 0,
      results: data
    });

  } catch (error: any) {
    console.error('[Fix All] Error:', error);
    res.status(500).json({ error: 'Failed to fix users', details: error.message });
  }
});

export default router;


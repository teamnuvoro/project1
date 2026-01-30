import { Router, Request, Response } from 'express';
import { createDodoCheckoutSession, verifyDodoWebhook, DODO_ENABLED } from '../services/dodo';
import { supabase, isSupabaseConfigured } from '../supabase';
import { getDodoPlanConfig, getCashfreeBaseUrl } from '../config';
import crypto from 'crypto';
import { IS_PRODUCTION, validateUserIdForProduction, isBackdoorUserAllowed } from '../utils/productionChecks';

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
    const config = getDodoPlanConfig();
    const enablePaymentsInDev = process.env.ENABLE_PAYMENTS_IN_DEV === 'true';
    const paymentsEnabled = DODO_ENABLED && (IS_PRODUCTION || enablePaymentsInDev);
    
    res.json({
      ...config,
      paymentsEnabled,
      paymentProvider: 'dodo',
      paymentsDisabledReason: paymentsEnabled
        ? undefined
        : (DODO_ENABLED
          ? 'Payments are disabled in development mode. Set ENABLE_PAYMENTS_IN_DEV=true to enable.'
          : 'Payments are temporarily disabled. Set DODO_PAYMENTS_API_KEY and DODO_WEBHOOK_SECRET to enable.'),
    });
  } catch (error: any) {
    console.error('[Payment Config] Error:', error);
    res.status(500).json({ error: 'Failed to get payment config' });
  }
});

// Create payment order
router.post('/api/payment/create-order', async (req: Request, res: Response) => {
  try {
    if (!DODO_ENABLED) {
      console.warn('[Payment] Payments disabled — create-order ignored');
      return res.status(503).json({
        error: 'Payments are temporarily disabled',
        message: 'Set DODO_PAYMENTS_API_KEY and DODO_WEBHOOK_SECRET to enable.',
      });
    }
    // 🚫 CLEAN DEV MODE: Disable payments in development (unless explicitly enabled)
    const enablePaymentsInDev = process.env.ENABLE_PAYMENTS_IN_DEV === 'true';
    if (!IS_PRODUCTION && !enablePaymentsInDev) {
      console.log('🚫 [Payment] Payments disabled in dev mode');
      return res.status(400).json({
        error: 'Payments are disabled in development mode',
        message: 'To test payments, use production mode with real user authentication',
        devNote: 'Set NODE_ENV=production and use real UUID users to test payments, or set ENABLE_PAYMENTS_IN_DEV=true to enable in dev mode'
      });
    }

    const { planType = 'monthly', userId: reqUserId } = req.body;
    
    // Validate plan type
    if (planType !== 'monthly') {
      return res.status(400).json({ 
        error: 'Invalid plan type. Only monthly plan is available.' 
      });
    }
    // Prefer session user, fallback to request body (if auth middleware issue), then dev user
    const userId = (req as any).session?.userId || reqUserId || DEV_USER_ID;
    
    // Validate userId is present
    if (!userId) {
      console.error('❌ [Payment] No userId provided in request');
      return res.status(400).json({ 
        error: 'User authentication required. Please login to continue.' 
      });
    }
    
    console.log('[Payment] Creating Dodo checkout session for userId:', userId, 'planType:', planType);

    // ✅ DODO PAYMENTS - Using official SDK
    const dodoEnv = (process.env.DODO_ENV || '').trim() === 'live_mode' ? 'live_mode' : 'test_mode';
    if (!IS_PRODUCTION || enablePaymentsInDev) {
      console.log("🧪 [Payment] Using Dodo test_mode");
    } else {
      console.log("🔑 [Payment] Using Dodo live_mode");
    }

    // Validate credentials
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      const errorMsg = enablePaymentsInDev 
        ? "Dodo Payments API key not found. Set DODO_PAYMENTS_API_KEY in .env"
        : "Dodo Payments API key not found in environment variables";
      console.error(`❌ ${errorMsg}`);
      return res.status(400).json({
        error: 'Payment configuration error',
        message: errorMsg,
        devNote: enablePaymentsInDev ? 'Get API key from Dodo Payments dashboard' : undefined
      });
    }

    // Get plan config
    const planConfig = getDodoPlanConfig();
    const amount = planConfig.plans.monthly;
    const orderId = `ORDER_${Date.now()}`;

    console.log("🚀 Creating Dodo checkout session:", { orderId, amount, planType });

    // 4. INSERT SUBSCRIPTION RECORD BEFORE CALLING GATEWAY
    // Log Initiation
    await logPaymentEvent(userId, 'PAYMENT_INITIATED', orderId, 200, { planType, amount });

    // Validate user ID for production (fail fast if invalid)
    validateUserIdForProduction(userId, 'payment order creation');
    
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    // In production, reject invalid UUIDs (already handled by validateUserIdForProduction, but double-check)
    if (IS_PRODUCTION && !isValidUUID) {
      console.error(`❌ Production: Invalid user ID format: ${userId}`);
      return res.status(400).json({ 
        error: 'Invalid user ID. Payments require authenticated users with valid accounts.' 
      });
    }

    // This is the critical fix. We must have a record to verify against later.
    // In dev, skip subscription insert for the known dev user ID (not in auth.users) to avoid FK violation.
    const isDevBackdoorUser = !IS_PRODUCTION && userId === DEV_USER_ID;
    let subscriptionSkippedFk = false; // set when 23503: subscriptions ref auth.users, we use public.users
    if (isSupabaseConfigured && isValidUUID && !isDevBackdoorUser) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1); // Add 1 month

      const { data: insertedSubscription, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          amount: amount,
          currency: 'INR',
          status: 'pending',
          dodo_order_id: orderId, // Dodo Payments order ID
          cashfree_order_id: null, // Explicitly set to null (migrated to Dodo)
          started_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Failed to insert subscription record:", {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          userId,
          orderId,
          planType
        });
        
        // Check for common errors
        if (insertError.code === '23505') {
          // Unique constraint violation - subscription might already exist
          console.warn("⚠️ Subscription might already exist for this order, checking...");
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('dodo_order_id', orderId)
            .maybeSingle();
          
          if (existing) {
            console.log("✅ Found existing subscription, continuing with order creation");
            // Continue - subscription already exists
          } else {
            throw new Error(`Database Error: Could not create subscription record. ${insertError.message}`);
          }
        } else if (insertError.code === '23503') {
          // Foreign key violation: subscriptions.user_id references auth.users(id), but we use Firebase → public.users.
          subscriptionSkippedFk = true;
          console.warn("⚠️ Subscription insert FK violation (user in public.users, subscriptions ref auth.users). Skipping subscription insert; continuing with checkout.");
        } else {
          throw new Error(`Database Error: Could not create subscription record. ${insertError.message || insertError.code || 'Unknown error'}`);
        }
      } else {
        console.log("✅ Pending Subscription Created for User:", userId, "Subscription ID:", insertedSubscription?.id);
      }
    } else if (isDevBackdoorUser) {
      console.warn(`⚠️ Dev mode: Skipping subscription insert for dev user ${userId} (not in auth.users)`);
      console.warn("⚠️ Payment order will still be created; checkout URL will work for testing.");
    } else if (!isValidUUID && !IS_PRODUCTION) {
      console.warn(`⚠️ Dev mode: Skipping subscription insert for non-UUID user: ${userId}`);
      console.warn("⚠️ Payment order will still be created, but subscription won't be tracked in database");
    } else if (!subscriptionSkippedFk) {
      console.warn("⚠️ Database NOT configured. Skipping subscription insert.");
    }

    // Determine return URL and webhook URL (must be HTTPS)
    // PRODUCTION: Require BASE_URL (no ngrok, must be https)
    // DEVELOPMENT: Require NGROK_URL or BASE_URL (must be https). No localhost fallback.
    let returnUrlBase: string;
    let webhookUrlFinal: string;
    const explicitReturnUrl = process.env.PAYMENT_RETURN_URL;
    
    const ensureHttps = (url: string) => url.startsWith('https://');
    
    if (IS_PRODUCTION) {
      // Prefer BASE_URL; on Render, fall back to RENDER_EXTERNAL_URL (set automatically)
      const baseUrlEnv = process.env.BASE_URL || '';
      const renderUrl = process.env.RENDER_EXTERNAL_URL || '';
      returnUrlBase = baseUrlEnv && ensureHttps(baseUrlEnv) ? baseUrlEnv : (renderUrl && ensureHttps(renderUrl) ? renderUrl : '');
      webhookUrlFinal = process.env.DODO_WEBHOOK_URL || `${returnUrlBase}/api/payment/webhook`;

      if (!returnUrlBase || !ensureHttps(returnUrlBase)) {
        console.error('❌ PRODUCTION: BASE_URL (or RENDER_EXTERNAL_URL on Render) must be set and HTTPS. Current BASE_URL:', baseUrlEnv ? '(set)' : '(not set)', 'RENDER_EXTERNAL_URL:', renderUrl ? '(set)' : '(not set)');
        return res.status(500).json({
          error: 'Server configuration error. Please contact support.',
          code: 'MISSING_BASE_URL',
          hint: 'Set BASE_URL to your app\'s HTTPS URL (e.g. https://your-app.onrender.com) in your deployment environment.',
        });
      }

      if (returnUrlBase.includes('ngrok')) {
        console.error('❌ PRODUCTION: BASE_URL cannot be ngrok URL');
        return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
      }

      console.log(`🌐 [Payment] Production mode - Using base URL: ${returnUrlBase}`);
      console.log(`🌐 [Payment] Webhook URL: ${webhookUrlFinal}`);
    } else {
      // DEVELOPMENT
      const baseUrl = process.env.BASE_URL;
      const ngrokUrl = process.env.NGROK_URL;
      const webhookUrl = process.env.DODO_WEBHOOK_URL;
      
      if (ngrokUrl) {
        returnUrlBase = ngrokUrl;
        console.log(`🌐 [Payment] Dev mode - Using NGROK_URL: ${returnUrlBase}`);
      } else if (baseUrl) {
        returnUrlBase = baseUrl;
        console.log(`🌐 [Payment] Dev mode - Using BASE_URL: ${returnUrlBase}`);
      } else {
        console.error('❌ DEV: NGROK_URL or BASE_URL must be set and HTTPS. Localhost is not allowed for Dodo Payments.');
        return res.status(500).json({ error: 'Payment is misconfigured. Set NGROK_URL (https) for dev.' });
      }
      
      if (!ensureHttps(returnUrlBase)) {
        console.error('❌ DEV: returnUrlBase must be HTTPS');
        return res.status(500).json({ error: 'Payment is misconfigured. NGROK_URL/BASE_URL must be https.' });
      }
      
      webhookUrlFinal = webhookUrl || `${returnUrlBase}/api/payment/webhook`;
      console.log(`🌐 [Payment] Webhook URL: ${webhookUrlFinal}`);
    }
    
    // Final return URL (HTTPS only)
    const computedReturnUrl = explicitReturnUrl && ensureHttps(explicitReturnUrl)
      ? explicitReturnUrl
      : `${returnUrlBase}/payment/return`;
    
    if (!ensureHttps(computedReturnUrl)) {
      console.error('❌ return_url must be HTTPS. Current:', computedReturnUrl);
      return res.status(500).json({ error: 'Payment return_url must be HTTPS. Please configure PAYMENT_RETURN_URL or NGROK_URL/BASE_URL with https.' });
    }
    
    // Create Dodo checkout session
    let checkoutSession;
    try {
      checkoutSession = await createDodoCheckoutSession({
        userId,
        planType,
        amount,
        returnUrl: `${computedReturnUrl}?orderId=${orderId}`,
        orderId: orderId, // Pass orderId so it's included in metadata
      });
    } catch (dodoError: any) {
      console.error("🔥 Dodo Checkout Session Creation Failed:", {
        error: dodoError.message,
        stack: dodoError.stack,
        orderId,
        amount
      });
      throw new Error(`Failed to create checkout session: ${dodoError.message}`);
    }

    console.log("[DODO][CHECKOUT]");
    console.log("  order_id=" + orderId);
    console.log("  env=" + dodoEnv);
    console.log("  checkout_session_id=" + checkoutSession.checkout_session_id);
    console.log("  checkout_url=" + checkoutSession.checkout_url);
    
    // Return checkout URL for frontend redirect
    res.json({ 
      checkout_url: checkoutSession.checkout_url,
      checkout_session_id: checkoutSession.checkout_session_id,
      order_id: orderId,
      session_id: checkoutSession.checkout_session_id, // For compatibility
    });

  } catch (error: any) {
    // 🛑 CAPTURE THE REAL ERROR
    const internalMessage = error.message;
    const errorStack = error.stack;
    console.error("🔥 FATAL ERROR in payment order creation:", {
      message: internalMessage,
      stack: errorStack,
      error: error,
      userId: (req as any).session?.userId || req.body.userId,
      planType: req.body.planType,
    });

    // Provide more helpful error messages
    let userFriendlyMessage = internalMessage;
    let statusCode = 500;
    
    if (internalMessage.includes('Dodo Payments') || internalMessage.includes('DODO_PAYMENTS')) {
      userFriendlyMessage = 'Payment gateway configuration error. Please contact support.';
    } else if (internalMessage.includes('authentication')) {
      userFriendlyMessage = 'Payment gateway authentication failed. Please contact support.';
    } else if (internalMessage.includes('Database Error')) {
      userFriendlyMessage = 'Unable to create payment order. Please try again.';
    } else if (internalMessage.includes('NGROK_URL') || internalMessage.includes('BASE_URL') || internalMessage.includes('HTTPS')) {
      userFriendlyMessage = 'Payment configuration error. Please contact support.';
      statusCode = 500;
    } else if (internalMessage.includes('User authentication required')) {
      userFriendlyMessage = 'Please login to continue with payment.';
      statusCode = 401;
    }

    res.status(statusCode).json({
      error: true,
      details: userFriendlyMessage,
      internalError: process.env.NODE_ENV === 'development' ? internalMessage : undefined
    });
  }
});

// Get payment status (GET endpoint for polling)
// Supports both Dodo (dodo_order_id) and legacy Cashfree (cashfree_order_id)
router.get('/api/payment/status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Look up by Dodo order ID first, then Cashfree (legacy)
    let subscription: any = null;
    const { data: byDodo } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('dodo_order_id', orderId)
      .maybeSingle();
    if (byDodo) subscription = byDodo;
    if (!subscription) {
      const { data: byCashfree } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('cashfree_order_id', orderId)
        .maybeSingle();
      subscription = byCashfree;
    }

    if (!subscription) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isAlreadyActive = subscription.status === 'active';

    // Dodo order: status comes from DB (webhook sets active); no Cashfree API call
    if (subscription.dodo_order_id) {
      return res.json({
        success: isAlreadyActive,
        status: isAlreadyActive ? 'PAID' : 'PENDING',
        orderId,
        planType: subscription.plan_type,
        message: isAlreadyActive ? 'Payment successful' : 'Payment pending'
      });
    }

    // Legacy Cashfree: check gateway API
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
    const { orderId, userId: bodyUserId } = req.body;
    const userId = (req as any).session?.userId || bodyUserId || DEV_USER_ID;
    console.log('🔍 [Payment Verify] OrderId:', orderId, 'UserId:', userId);

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    validateUserIdForProduction(userId, 'payment verification');
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (IS_PRODUCTION && !isValidUUID) {
      console.error(`❌ Production: Invalid user ID format: ${userId}`);
      return res.status(400).json({ error: 'Invalid user ID. Payments require authenticated users with valid accounts.' });
    }

    let subscription: any = null;
    let planType = 'daily';
    if (isValidUUID) {
      // Look up by Dodo order ID first, then Cashfree (legacy)
      const { data: byDodo } = await supabase.from('subscriptions').select('*').eq('dodo_order_id', orderId).maybeSingle();
      if (byDodo) subscription = byDodo;
      if (!subscription) {
        const { data: byCashfree } = await supabase.from('subscriptions').select('*').eq('cashfree_order_id', orderId).maybeSingle();
        subscription = byCashfree;
      }
      if (subscription) planType = subscription.plan_type || 'monthly';
    } else if (!IS_PRODUCTION && isBackdoorUserAllowed(userId)) {
      console.warn(`[Payment Verify] Dev mode: Backdoor user ${userId} - skipping subscription lookup`);
    }

    if (!subscription && isValidUUID) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Dodo order: no Cashfree API; success = webhook already set subscription + user active (or we run fallback below)
    let isPaid = false;
    let paymentStatus = 'PENDING';
    let paymentData: any = {};
    if (subscription?.dodo_order_id) {
      isPaid = subscription.status === 'active';
      paymentStatus = isPaid ? 'PAID' : 'PENDING';
      if (isPaid && isValidUUID) {
        const now = new Date();
        let expiry = new Date();
        if (subscription.plan_type === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
        else expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
        await supabase.from('users').update({
          premium_user: true,
          subscription_plan: subscription.plan_type,
          subscription_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', subscription.user_id);
        const { data: existingPayment } = await supabase.from('payments').select('id').eq('cashfree_order_id', orderId).maybeSingle();
        if (!existingPayment) {
          await supabase.from('payments').insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            cashfree_order_id: orderId,
            cashfree_payment_id: orderId,
            amount: subscription.amount,
            status: 'success',
            plan_type: subscription.plan_type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    } else {
    // Legacy Cashfree: check payment status with gateway API
    const cashfreeBaseUrl = getCashfreeBaseUrl();
    const response = await fetch(`${cashfreeBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
      },
    });
    paymentData = await response.json();
    if (!response.ok) {
      console.error('[Payment Verify] Cashfree error:', paymentData);
      return res.status(500).json({
        error: 'Failed to verify payment',
        details: paymentData
      });
    }
    paymentStatus = paymentData.order_status;
    isPaid = paymentStatus === 'PAID' || paymentStatus === 'ACTIVE' || paymentStatus === 'SUCCESS';
    const isAlreadyActive = subscription?.status === 'active';

    if (subscription && isValidUUID) {
      await supabase.from('subscriptions').update({
        status: isPaid || isAlreadyActive ? 'active' : subscription.status,
        cashfree_payment_id: paymentData.cf_payment_id || paymentData.cf_order_id || subscription.cashfree_payment_id,
        updated_at: new Date().toISOString()
      }).eq('cashfree_order_id', orderId);
    }

    if ((isPaid || isAlreadyActive) && isValidUUID && subscription) {
      // Calculate expiry
      const now = new Date();
      let expiry = new Date();
      if (subscription.plan_type === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else {
        // Fallback for old plan types
        expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
      }

      const { data: updatedUser, error: userUpdateError } = await supabase
        .from('users')
        .update({
          premium_user: true,
          subscription_plan: subscription.plan_type,
          subscription_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.user_id)
        .select()
        .single();

      if (userUpdateError) {
        console.error('[Payment] ❌ Failed to update user premium status:', userUpdateError);
        // Don't fail the whole request, but log the error
      } else {
        console.log('[Payment] ✅ User upgraded to premium:', subscription.user_id, 'Expiry:', expiry.toISOString());
        console.log('[Payment] ✅ Updated user data:', JSON.stringify(updatedUser, null, 2));
      }

      // UPDATE OR INSERT INTO PAYMENTS TABLE (CRITICAL FOR PAYMENT-BASED ACCESS)
      // This is the source of truth - payments.status='success' grants chat access
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, status')
        .eq('cashfree_order_id', orderId)
        .single();

      if (existingPayment) {
        // Update existing payment to 'success' status
        await supabase
          .from('payments')
          .update({
            status: 'success',
            cashfree_payment_id: paymentData.cf_payment_id || existingPayment.cashfree_payment_id || 'UNKNOWN',
            updated_at: new Date().toISOString()
          })
          .eq('cashfree_order_id', orderId);
        
        console.log('[Payment] ✅ Updated payment record to success status:', orderId);
      } else {
        // Insert new payment record with 'success' status
        const { error: insertError } = await supabase.from('payments').insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          cashfree_order_id: orderId,
          cashfree_payment_id: paymentData.cf_payment_id || 'UNKNOWN',
          amount: subscription.amount,
          status: 'success',
          plan_type: subscription.plan_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        if (insertError) {
          console.error('[Payment] ❌ Failed to insert payment record:', insertError);
        } else {
          console.log('[Payment] ✅ Created payment record with success status:', orderId);
        }
      }

      await logPaymentEvent(subscription.user_id, 'ENTITLEMENT_GRANTED', orderId, 200, { status: paymentData.order_status, expiry: expiry.toISOString() });
    }
    }

    // Return success if payment is paid OR subscription is already active
    const success = isPaid || (subscription?.status === 'active');
    
    // For backdoor users (dev only), return success if payment is paid (even without subscription record)
    // In production, all users must have valid UUIDs and subscriptions
    const finalSuccess = (IS_PRODUCTION || isValidUUID) ? success : (isBackdoorUserAllowed(userId) ? isPaid : false);
    
    res.json({
      success: finalSuccess,
      status: paymentStatus,
      orderId,
      planType: subscription?.plan_type || planType,
      startDate: subscription?.started_at,
      endDate: subscription?.expires_at,
      message: finalSuccess ? 'Payment successful! You are now a premium user.' : 'Payment pending or failed'
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
// Dodo Payments webhook handler
// When DODO_ENABLED is false: return 200 immediately (no body parsing, no signature verification)
// TODO: Re-enable Dodo Payments — install dodopayments SDK, use express.raw() for webhook,
//       enable signature verification, set DODO_* env vars
router.post('/api/payment/webhook', async (req: Request, res: Response) => {
  if (!DODO_ENABLED) {
    console.warn('[Dodo Webhook] Payments disabled — ignoring webhook');
    return res.status(200).send('ok');
  }

  try {
    // CRITICAL: Get raw body for signature verification
    // req.body is a Buffer when using express.raw()
    let rawBody: string;
    
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
      console.warn('[Dodo Webhook] ⚠️ Body was already parsed - signature verification may fail');
    }

    console.log('[Dodo Webhook] Received webhook:', {
      bodyType: Buffer.isBuffer(req.body) ? 'Buffer' : typeof req.body,
      bodyLength: Buffer.isBuffer(req.body) ? req.body.length : (typeof req.body === 'string' ? req.body.length : 'unknown')
    });

    // Verify webhook signature using Dodo SDK
    let event: any;
    try {
      event = verifyDodoWebhook(rawBody, req.headers);
      console.log('[Dodo Webhook] ✅ Signature verified successfully');
    } catch (verifyError: any) {
      console.error('[Dodo Webhook] ❌ Invalid signature - REJECTING webhook');
      console.error('[Dodo Webhook] Error:', verifyError.message);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { type, data } = event;

    console.log('[Dodo Webhook] Received event type:', type);
    console.log('[Dodo Webhook] Full event:', JSON.stringify(event, null, 2));

    // Handle payment.succeeded event (per Dodo error guide)
    if (type === 'payment.succeeded') {
      const paymentData = event.data || data;
      // Support multiple payload shapes: event.data.metadata, event.data.payment?.metadata
      const metadata = paymentData?.metadata || paymentData?.payment?.metadata || {};
      
      if (!metadata?.user_id) {
        console.error('[Dodo Webhook] ❌ Missing user_id in payment metadata');
        console.error('[Dodo Webhook] Metadata:', metadata);
        console.error('[Dodo Webhook] paymentData keys:', paymentData ? Object.keys(paymentData) : []);
        return res.status(200).json({ received: true, error: 'Missing user_id in metadata' });
      }

      const userId = String(metadata.user_id);
      const planType = metadata.plan_type || 'monthly';
      const amount = parseFloat(String(metadata.amount || 0)) || 0;
      const checkoutSessionId = paymentData?.session_id || paymentData?.checkout_session_id;

      console.log(`[Dodo Webhook] 🔓 Unlocking premium access for user ${userId}`);

      // Calculate expiry
      const now = new Date();
      let expiry = new Date();
      if (planType === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else {
        // Fallback for old plan types
        expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
      }

      // CRITICAL: Unlock premium FIRST (idempotent - safe to retry)
      // Per Dodo error guide: "Unlock first, record later"
      const { error: upgradeError } = await supabase
        .from('users')
        .update({
          premium_user: true,
          subscription_plan: planType,
          subscription_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (upgradeError) {
        console.error('[Dodo Webhook] ❌ Failed to upgrade user:', upgradeError.message);
      } else {
        console.log(`[Dodo Webhook] ✅ User ${userId} upgraded to premium (Plan: ${planType})`);
      }

      // Update subscription record if it exists (CRITICAL for tracking)
      if (isSupabaseConfigured) {
        try {
          // First, try to find by dodo_order_id from metadata
          const dodoOrderId = metadata?.dodo_order_id || metadata?.order_id;
          let subscription = null;
          
          if (dodoOrderId) {
            const { data: subByOrderId } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('dodo_order_id', dodoOrderId)
              .maybeSingle();
            subscription = subByOrderId;
          }
          
          // If not found by order ID, try to find pending subscription
          if (!subscription) {
            const { data: subPending } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('user_id', userId)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            subscription = subPending;
          }

          if (subscription) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                expires_at: expiry.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscription.id);
            console.log(`[Dodo Webhook] ✅ Updated subscription ${subscription.id} to active`);
          } else {
            console.warn(`[Dodo Webhook] ⚠️ No subscription record found for user ${userId} - premium still unlocked via users table`);
          }
        } catch (subError) {
          console.warn('[Dodo Webhook] ⚠️ Subscription update failed (non-blocking):', subError);
        }

        // Record payment in payments table (uses cashfree_* columns for gateway order id)
        try {
          const dodoOrderId = metadata?.dodo_order_id || metadata?.order_id;
          await supabase.from('payments').insert({
            user_id: userId,
            subscription_id: null,
            cashfree_order_id: dodoOrderId || checkoutSessionId || '',
            cashfree_payment_id: paymentData?.payment_id || paymentData?.id || checkoutSessionId || '',
            amount: amount,
            status: 'success',
            plan_type: planType,
            created_at: new Date().toISOString()
          });
        } catch (paymentError) {
          console.warn('[Dodo Webhook] ⚠️ Payment record insert failed (non-blocking):', paymentError);
        }
      }
    } else if (type === 'subscription.active' || type === 'subscription.updated') {
      // Fallback: upgrade from subscription event if metadata has user_id (same as checkout)
      const subData = event.data || data;
      const metadata = subData?.metadata || subData?.payment?.metadata || {};
      const userId = metadata?.user_id ? String(metadata.user_id) : null;
      if (userId && isSupabaseConfigured) {
        const planType = metadata.plan_type || 'monthly';
        let expiry = new Date();
        if (planType === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
        else expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
        const { error: upgradeError } = await supabase
          .from('users')
          .update({
            premium_user: true,
            subscription_plan: planType,
            subscription_expiry: expiry.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (!upgradeError) {
          console.log(`[Dodo Webhook] ✅ User ${userId} upgraded from ${type} (Plan: ${planType})`);
        }
        const dodoOrderId = metadata?.dodo_order_id || metadata?.order_id;
        if (dodoOrderId) {
          const { data: subRow } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('dodo_order_id', dodoOrderId)
            .maybeSingle();
          if (subRow) {
            await supabase.from('subscriptions').update({
              status: 'active',
              expires_at: expiry.toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', subRow.id);
          }
        }
      }
    } else {
      console.log('[Dodo Webhook] ⚠️ Unhandled event type:', type);
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


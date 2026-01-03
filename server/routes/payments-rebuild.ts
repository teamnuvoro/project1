import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';
import { 
  createRazorpayOrder, 
  verifyRazorpaySignature, 
  getRazorpayPaymentStatus,
  getRazorpayOrder 
} from '../services/razorpay';
import { getRazorpayPlanConfig } from '../config';

const router = Router();

// =====================================================
// FLOW 2: Initiate Payment
// POST /api/payments/initiate
// =====================================================
router.post('/api/payments/initiate', async (req: Request, res: Response) => {
  try {
    const { userId, planType, userPhone } = req.body;

    // Validate inputs
    if (!userId || !planType || !userPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['daily', 'weekly'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type. Must be "daily" or "weekly"' });
    }

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // ===== STEP 1: Check for existing pending transaction (prevent double payment) =====
    const { data: existingPending } = await supabase
      .from('payment_transactions')
      .select('id, razorpay_order_id, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPending) {
      console.log('[Payment Initiate] Reusing existing pending transaction:', existingPending.razorpay_order_id);
      // Return existing transaction
      const { data: existingTxn } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', existingPending.id)
        .single();

      return res.json({
        success: true,
        transaction_id: existingPending.id,
        order_id: existingPending.razorpay_order_id,
        message: 'Reusing existing pending transaction'
      });
    }

    // ===== STEP 2: Determine amount (in paise) =====
    const planConfig = getRazorpayPlanConfig();
    const amounts = {
      daily: planConfig.plans.daily * 100,   // ₹19 = 1900 paise
      weekly: planConfig.plans.weekly * 100  // ₹49 = 4900 paise
    };

    const amountPaise = amounts[planType as keyof typeof amounts];
    const amountINR = amountPaise / 100;

    // ===== STEP 3: Generate unique receipt ID =====
    const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ===== STEP 4: Create Razorpay order =====
    const razorpayOrder = await createRazorpayOrder({
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        user_id: userId,
        plan_type: planType,
        user_phone: userPhone
      }
    });

    const orderId = razorpayOrder.id;
    console.log('[Payment Initiate] Razorpay order created:', orderId);

    // ===== STEP 5: Create pending transaction record =====
    const { data: transaction, error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        razorpay_order_id: orderId,
        plan_type: planType,
        amount_paise: amountPaise,
        status: 'pending'
      })
      .select()
      .single();

    if (txnError || !transaction) {
      console.error('[Payment Initiate] Failed to create transaction:', txnError);
      return res.status(500).json({ error: 'Failed to create transaction record' });
    }

    console.log('[Payment Initiate] Created transaction:', transaction.id, 'Order:', orderId);

    // ===== STEP 6: Return order details to frontend =====
    return res.json({
      success: true,
      transaction_id: transaction.id,
      order_id: orderId,
      amount: amountINR,
      amount_paise: amountPaise,
      currency: 'INR',
      plan_type: planType,
      key: process.env.RAZORPAY_KEY_ID // Frontend needs this for Razorpay Checkout
    });

  } catch (error: any) {
    console.error('[Payment Initiate] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// =====================================================
// FLOW 3: Payment Webhook Handler (Razorpay)
// POST /api/payment-webhook
// =====================================================
router.post('/api/payment-webhook', async (req: Request, res: Response) => {
  try {
    // ===== STEP 1: Verify webhook signature =====
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;
    const razorpayOrderId = req.body.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = req.body.payload?.payment?.entity?.id;
    const paymentStatus = req.body.payload?.payment?.entity?.status;

    if (!razorpaySignature) {
      console.error('[Webhook] Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isValid) {
      console.error('[Webhook] ⚠️ SIGNATURE MISMATCH - REJECTING');
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    console.log('[Webhook] ✅ Signature verified');

    if (!razorpayOrderId) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // ===== STEP 2: Fetch pending transaction from DB =====
    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !transaction) {
      console.log('[Webhook] ⚠️ No pending transaction found for order:', razorpayOrderId);
      // Still return 200 so Razorpay doesn't retry
      return res.status(200).json({ 
        success: false, 
        message: 'Transaction not found or already processed' 
      });
    }

    const userId = transaction.user_id;
    const planType = transaction.plan_type;

    // ===== STEP 3: Verify payment status =====
    if (paymentStatus !== 'captured' && paymentStatus !== 'authorized') {
      // Payment failed or pending
      await supabase
        .from('payment_transactions')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      console.log('[Webhook] ❌ Payment failed for order:', razorpayOrderId, 'Status:', paymentStatus);
      return res.status(200).json({ success: false, message: 'Payment not completed' });
    }

    // ===== STEP 4: Double-check with Razorpay API (redundancy) =====
    try {
      const paymentData = await getRazorpayPaymentStatus(razorpayPaymentId);
      const verifiedStatus = paymentData.status;

      if (verifiedStatus !== 'captured' && verifiedStatus !== 'authorized') {
        console.log('[Webhook] ⚠️ Razorpay API verification failed. Status:', verifiedStatus);
      return res.status(200).json({ success: false, message: 'Payment verification failed' });
      }
    } catch (verifyError) {
      console.error('[Webhook] Error verifying payment with Razorpay:', verifyError);
      // Continue anyway - webhook signature was valid
    }

    // ===== STEP 5: Calculate subscription end time =====
    const now = new Date();
    let subscriptionEndTime: Date;

    if (planType === 'daily') {
      subscriptionEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
    } else if (planType === 'weekly') {
      subscriptionEndTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
    } else {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // ===== STEP 6: Update transaction as success (idempotent) =====
    const { error: updateTxnError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'success',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        payment_timestamp: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', transaction.id)
      .eq('status', 'pending'); // Only update if still pending (idempotent)

    if (updateTxnError) {
      console.error('[Webhook] Error updating transaction:', updateTxnError);
      return res.status(500).json({ error: 'Failed to update transaction' });
    }

    // ===== STEP 7: Get old tier for logging =====
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const oldTier = userData?.subscription_tier || 'free';

    // ===== STEP 8: Update user subscription =====
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        subscription_tier: planType,
        subscription_start_time: now.toISOString(),
        subscription_end_time: subscriptionEndTime.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', userId);

    if (updateUserError) {
      console.error('[Webhook] Error updating user:', updateUserError);
      return res.status(500).json({ error: 'Failed to update user subscription' });
    }

    // ===== STEP 9: Log to subscription history =====
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        old_tier: oldTier,
        new_tier: planType,
        reason: 'payment_success',
        transaction_id: transaction.id
      });

    if (historyError) {
      console.error('[Webhook] Error logging subscription history:', historyError);
      // Don't fail - we already updated the important stuff
    }

    console.log(`[Webhook] ✅ SUCCESS: User ${userId} upgraded to ${planType} until ${subscriptionEndTime.toISOString()}`);

    // ===== RETURN 200 TO RAZORPAY =====
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      user_id: userId,
      subscription_end_time: subscriptionEndTime.toISOString()
    });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    // Always return 200 on error so Razorpay doesn't retry infinitely
    return res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =====================================================
// POST /api/payment/verify
// Verify payment after callback (manual verification)
// =====================================================
router.post('/api/payment/verify', async (req: Request, res: Response) => {
  try {
    const { orderId, paymentId, signature, userId: bodyUserId } = req.body;
    const userId = (req as any).session?.userId || bodyUserId;

    console.log('🔍 [Payment Verify] OrderId:', orderId, 'PaymentId:', paymentId, 'UserId:', userId);

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing required fields: orderId, paymentId, signature' });
    }

    // ===== STEP 1: Verify signature =====
    const isValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature
    });

    if (!isValid) {
      console.error('[Payment Verify] ❌ Signature verification failed');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    console.log('[Payment Verify] ✅ Signature verified');

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // ===== STEP 2: Get transaction from database =====
    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // ===== STEP 3: Verify payment status with Razorpay =====
    const paymentData = await getRazorpayPaymentStatus(paymentId);
    const paymentStatus = paymentData.status;

    if (paymentStatus !== 'captured' && paymentStatus !== 'authorized') {
      return res.status(400).json({ 
        error: 'Payment not successful', 
        status: paymentStatus 
      });
    }

    // ===== STEP 4: Update transaction if still pending =====
    const now = new Date();
    let subscriptionEndTime: Date;

    if (transaction.plan_type === 'daily') {
      subscriptionEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else {
      subscriptionEndTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Update transaction
    await supabase
      .from('payment_transactions')
      .update({
        status: 'success',
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        payment_timestamp: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', transaction.id)
      .eq('status', 'pending');

    // ===== STEP 5: Update user subscription =====
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', transaction.user_id)
      .single();

    const oldTier = userData?.subscription_tier || 'free';

    await supabase
      .from('users')
      .update({
        subscription_tier: transaction.plan_type,
        subscription_start_time: now.toISOString(),
        subscription_end_time: subscriptionEndTime.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', transaction.user_id);

    // ===== STEP 6: Log to subscription history =====
    await supabase
      .from('subscription_history')
      .insert({
        user_id: transaction.user_id,
        old_tier: oldTier,
        new_tier: transaction.plan_type,
        reason: 'payment_success',
        transaction_id: transaction.id
      });

    console.log(`[Payment Verify] ✅ SUCCESS: User ${transaction.user_id} upgraded to ${transaction.plan_type}`);

    return res.json({
      success: true,
      orderId,
      paymentId,
      planType: transaction.plan_type,
      endDate: subscriptionEndTime.toISOString(),
      message: 'Payment verified successfully! You are now a premium user.'
    });

  } catch (error: any) {
    console.error('[Payment Verify] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify payment', 
      details: error.message 
    });
  }
});

// =====================================================
// GET /api/transaction/:id
// Get transaction status for payment callback page
// =====================================================
router.get('/api/transaction/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get user subscription status
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier, subscription_end_time')
      .eq('id', transaction.user_id)
      .single();

    return res.json({
      status: transaction.status,
      plan_type: transaction.plan_type,
      subscription_tier: user?.subscription_tier,
      subscription_end_time: user?.subscription_end_time,
      user_tier: user?.subscription_tier
    });

  } catch (error: any) {
    console.error('[Transaction Status] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =====================================================
// GET /api/user/subscription
// Get current subscription tier and expiry
// =====================================================
router.get('/api/user/subscription', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier, subscription_start_time, subscription_end_time')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if subscription expired
    let isExpired = false;
    if (user.subscription_tier !== 'free' && user.subscription_end_time) {
      isExpired = new Date(user.subscription_end_time) <= new Date();
    }

    return res.json({
      tier: user.subscription_tier,
      start_time: user.subscription_start_time,
      end_time: user.subscription_end_time,
      is_expired: isExpired,
      is_active: !isExpired && user.subscription_tier !== 'free'
    });

  } catch (error: any) {
    console.error('[Subscription Status] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =====================================================
// GET /api/payment/config
// Get payment configuration for frontend
// =====================================================
router.get('/api/payment/config', async (_req: Request, res: Response) => {
  try {
    const config = getRazorpayPlanConfig();
    res.json({
      paymentProvider: 'razorpay',
      currency: config.currency,
      plans: config.plans,
      keyId: process.env.RAZORPAY_KEY_ID // Frontend needs this
    });
  } catch (error: any) {
    console.error('[Payment Config] Error:', error);
    res.status(500).json({ error: 'Failed to get payment config' });
  }
});

export default router;

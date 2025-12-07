import { Router, Request, Response } from 'express';
import { createCashfreeOrder, verifyCashfreeSignature } from '../cashfree';
import { supabase, isSupabaseConfigured } from '../supabase';
import { getCashfreePlanConfig, getCashfreeBaseUrl } from '../config';

const router = Router();

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

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
    const { planType } = req.body;

    // 1. Log the keys (Masked) to prove they are loaded
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    console.log(`🔑 Loading Keys: AppID ends in ...${appId?.slice(-4)}, Secret exists: ${!!secret}`);

    if (!appId || !secret) {
      throw new Error("Missing API Keys in Environment Variables");
    }

    // 2. Setup Cashfree (Force Production via helper which uses environment vars)
    // Note: createCashfreeOrder helper automatically uses these env vars

    // 3. Create Unique Order
    const orderId = `ORDER_${Date.now()}`;
    const amount = planType === 'weekly' ? 99 : 29;

    console.log("🚀 Sending request to Cashfree:", { orderId, amount });

    const orderData = await createCashfreeOrder({
      orderId: orderId,
      orderAmount: amount,
      orderCurrency: 'INR',
      customerName: "Riya User",
      customerEmail: "user@riya.ai",
      customerPhone: "9999999999",
      returnUrl: `${process.env.BASE_URL || 'https://riya-ai.site'}/payment/callback?orderId=${orderId}`,
      customerId: "USER_" + Date.now()
    });

    // 5. Check if we actually got data
    const sessionId = orderData.payment_session_id;
    if (!sessionId) {
      console.error("❌ Cashfree Response contained no ID:", orderData);
      throw new Error("Cashfree returned success but NO session ID");
    }

    console.log("✅ Session ID Generated:", sessionId);

    res.json({ payment_session_id: sessionId });

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

// Verify payment status
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
    const isPaid = paymentStatus === 'PAID';

    await supabase
      .from('subscriptions')
      .update({
        status: isPaid ? 'active' : 'failed',
        cashfree_payment_id: paymentData.cf_order_id,
        updated_at: new Date().toISOString()
      })
      .eq('cashfree_order_id', orderId);

    // Update user premium status if paid
    if (isPaid) {
      await supabase
        .from('users')
        .update({
          premium_user: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.user_id);

      console.log('[Payment] ✅ User upgraded to premium:', subscription.user_id);
    }

    res.json({
      success: isPaid,
      status: paymentStatus,
      orderId,
      planType: subscription.plan_type,
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      message: isPaid ? 'Payment successful! You are now a premium user.' : 'Payment pending or failed'
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
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('cashfree_order_id', orderId)
          .single();

        if (subscription) {
          // Update subscription
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              cashfree_payment_id: data.payment?.cf_payment_id,
              updated_at: new Date().toISOString()
            })
            .eq('cashfree_order_id', orderId);

          // Upgrade user to premium
          await supabase
            .from('users')
            .update({
              premium_user: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.user_id);

          console.log('[Payment Webhook] ✅ User upgraded:', subscription.user_id);
        }
      }
    }

    res.json({ success: true });

  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import { createCashfreeOrder, verifyCashfreeSignature } from '../cashfree';
import { supabase, isSupabaseConfigured } from '../supabase';
import { getCashfreePlanConfig } from '../config';

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
    const { planType } = req.body as { planType: 'daily' | 'weekly' };
    const userId = (req as any).session?.userId || DEV_USER_ID;

    if (!planType || !['daily', 'weekly'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Initialize Cashfree
    try {
      if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
        // Assuming Cashfree is imported or globally available, e.g., from 'cashfree-pg'
        // This part of the code requires the Cashfree SDK to be imported and configured.
        // For example: import { Cashfree } from 'cashfree-pg';
        // If not imported, this will cause a runtime error.
        (global as any).Cashfree.X.ClientId = process.env.CASHFREE_APP_ID;
        (global as any).Cashfree.X.ClientSecret = process.env.CASHFREE_SECRET_KEY;
        (global as any).Cashfree.X.Environment = process.env.CASHFREE_ENV === 'PRODUCTION'
          ? (global as any).Cashfree.Environment.PRODUCTION
          : (global as any).Cashfree.Environment.SANDBOX;
      } else {
        console.warn("[Cashfree] Credentials missing. Payments will fail.");
      }
    } catch (e) {
      console.error("[Cashfree] Failed to initialize:", e);
      // Depending on desired behavior, you might want to return an error here
      // return res.status(500).json({ error: 'Payment service initialization failed' });
    }

    // Get user info
    let userName = 'User';
    let userEmail = 'user@example.com';
    let userPhone = '';

    if (isSupabaseConfigured) {
      const { data: user } = await supabase
        .from('users')
        .select('name, email, phone_number')
        .eq('id', userId)
        .single();

      if (user) {
        userName = user.name || userName;
        userEmail = user.email || userEmail;
        userPhone = user.phone_number || userPhone;
      }
    }

    // Get plan amount
    const { plans } = getCashfreePlanConfig();
    const amount = plans[planType];

    // Create order in Cashfree
    const orderId = `order_${Date.now()}_${userId.slice(0, 8)}`;
    const returnUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/payment/callback?orderId=${orderId}`;

    console.log('[Payment] Creating order:', {
      orderId,
      amount,
      userName,
      userEmail,
      returnUrl
    });

    const orderData = await createCashfreeOrder({
      orderId: orderId,
      orderAmount: amount,
      orderCurrency: 'INR',
      customerName: userName,
      customerEmail: userEmail,
      customerPhone: userPhone || '9999999999',
      returnUrl: returnUrl
    });

    // Store order in database
    if (isSupabaseConfigured) {
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          amount: amount,
          currency: 'INR',
          cashfree_order_id: orderData.orderId,
          status: 'pending',
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    console.log('[Payment] Order created:', orderData.orderId);

    console.log('[Payment] Order created successfully:', {
      orderId: orderData.order_id,
      paymentSessionId: orderData.payment_session_id
    });

    res.json({
      orderId: orderData.order_id,
      paymentSessionId: orderData.payment_session_id,
      amount,
      currency: 'INR',
      planType
    });

  } catch (error: any) {
    console.error('[Payment] Error creating order:', error);
    console.error('[Payment] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to create payment order',
      details: error.message,
      type: error.name
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
    const cashfreeBaseUrl = process.env.CASHFREE_MODE === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

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


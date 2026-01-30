import { createRequire } from 'module';
import { supabase } from '../supabase';

const require = createRequire(import.meta.url);

/** Re-export so routes can short-circuit without importing SDK. */
export const DODO_ENABLED =
  !!process.env.DODO_PAYMENTS_API_KEY && !!process.env.DODO_WEBHOOK_SECRET;

// Lazy import DodoPayments only when enabled (avoids "module not found" when SDK not installed)
let DodoPaymentsClass: any = null;
let dodo: any = null;

if (DODO_ENABLED) {
  try {
    const dodoModule = require('dodopayments');
    DodoPaymentsClass = dodoModule.default || dodoModule;
    if (DodoPaymentsClass) {
      dodo = new DodoPaymentsClass({
        bearerToken: process.env.DODO_PAYMENTS_API_KEY || '',
        environment: process.env.DODO_ENV === 'live_mode' ? 'live_mode' : 'test_mode',
      });
    }
  } catch (error: any) {
    console.warn('[Dodo] dodopayments package not available. Payment features will be disabled.');
    dodo = null;
  }
} else {
  // TODO: Re-enable Dodo Payments — install dodopayments SDK, use express.raw() for webhook,
  //       enable signature verification, set DODO_PAYMENTS_API_KEY and DODO_WEBHOOK_SECRET
  console.warn('[Dodo] Payments disabled — SDK not loaded (set DODO_PAYMENTS_API_KEY and DODO_WEBHOOK_SECRET to enable).');
}

export interface CreateCheckoutSessionParams {
  userId: string;
  planType: 'monthly';
  amount: number;
  userEmail?: string;
  userName?: string;
  returnUrl: string;
  orderId?: string; // Optional order ID to include in metadata
}

export interface CheckoutSessionResponse {
  checkout_session_id: string;
  checkout_url: string;
  session_id: string;
}

/**
 * Create a Dodo Payments checkout session
 * Following Dodo Payments error guide best practices
 */
export async function createDodoCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResponse> {
  if (!dodo) {
    throw new Error('Dodo Payments SDK not available. Please install dodopayments package');
  }
  
  const { userId, planType, amount, userEmail, userName, returnUrl, orderId } = params;

  // Validate API key
  if (!process.env.DODO_PAYMENTS_API_KEY) {
    throw new Error('DODO_PAYMENTS_API_KEY is not configured');
  }

  // Fetch user details (optional, with fallbacks)
  let email = userEmail || null;
  let name = userName || null;

  if (supabase && userId) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        email = profile.email || email;
        name = profile.name || name;
      }
    } catch (e) {
      // Ignore errors, use defaults
      console.warn('[Dodo] Failed to fetch user profile, using defaults');
    }
  }

  // CRITICAL: Customer object must have ONLY email and name (with defaults)
  // Per Dodo error guide: "customer: data did not match any variant"
  const customer = {
    email: email || 'user@riya.ai',
    name: name || 'Riya User',
  };

  // CRITICAL: All metadata values MUST be strings
  // Per Dodo error guide: "metadata.amount: expected string, found number"
  const metadata: Record<string, string> = {
    amount: String(amount),
    user_id: String(userId),
    plan_type: String(planType),
    payment_type: 'premium_subscription',
  };
  
  // Add order_id to metadata if provided (helps webhook find subscription)
  if (orderId) {
    metadata.dodo_order_id = String(orderId);
    metadata.order_id = String(orderId); // Also add as order_id for compatibility
  }

  // CRITICAL: Get product ID for monthly plan
  // Per Dodo error guide: Product must exist in dashboard
  const productId = process.env.DODO_PRODUCT_ID_MONTHLY?.trim();
  
  // Debug logging to help diagnose env var loading issues
  console.log('[Dodo] Environment variables check:', {
    DODO_PRODUCT_ID_MONTHLY: productId ? `${productId.substring(0, 10)}...` : 'NOT SET',
    planType,
  });

  if (!productId) {
    console.error(`[Dodo] ❌ DODO_PRODUCT_ID_MONTHLY is not set in environment variables`);
    console.error('[Dodo] Available env vars with DODO prefix:', 
      Object.keys(process.env).filter(k => k.startsWith('DODO_')).join(', ') || 'NONE'
    );
    throw new Error(`Product ID not configured. Please set DODO_PRODUCT_ID_MONTHLY in .env file and restart the server. Create product in Dodo Dashboard → Products section.`);
  }

  console.log('[Dodo] Creating checkout session:', {
    product_id: productId,
    plan_type: planType,
    customer,
    metadata,
    returnUrl,
  });

  try {
    // Create checkout session using official SDK
    const session = await dodo.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId, // Must be a valid product ID from Dodo dashboard
          quantity: 1,
        },
      ],
      customer,
      metadata,
      return_url: returnUrl,
    });

    console.log('[Dodo] ✅ Checkout session created:', session.checkout_session_id);

    return {
      checkout_session_id: session.checkout_session_id,
      checkout_url: session.checkout_url || session.url || '',
      session_id: session.checkout_session_id, // For compatibility
    };
  } catch (error: any) {
    console.error('[Dodo] ❌ Failed to create checkout session:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('customer')) {
      throw new Error('Invalid customer data. Please ensure email and name are provided.');
    } else if (error.message?.includes('metadata')) {
      throw new Error('Invalid metadata format. All values must be strings.');
    } else if (error.message?.includes('product') || error.message?.includes('does not exist')) {
      throw new Error(`Product does not exist in Dodo dashboard. Please create a monthly product and set DODO_PRODUCT_ID_MONTHLY in .env file.`);
    } else if (error.status === 401 || error.status === 403) {
      throw new Error('Dodo Payments authentication failed. Please check your API key.');
    }
    
    throw new Error(`Failed to create checkout session: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Verify webhook signature and unwrap event
 */
export function verifyDodoWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): any {
  if (!dodo) {
    throw new Error('Dodo Payments SDK not available. Please install dodopayments package');
  }
  
  if (!process.env.DODO_WEBHOOK_SECRET) {
    throw new Error('DODO_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = dodo.webhooks.unwrap(rawBody, {
      headers: headers as Record<string, string>,
      key: process.env.DODO_WEBHOOK_SECRET,
    });

    return event;
  } catch (error: any) {
    console.error('[Dodo] ❌ Webhook verification failed:', error);
    throw new Error(`Invalid webhook signature: ${error.message}`);
  }
}

export default dodo; // May be null if package not available

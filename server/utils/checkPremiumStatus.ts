import { SupabaseClient } from '@supabase/supabase-js';
import { checkUserHasPayment, checkUserHasActiveSubscription } from './checkUserHasPayment';

/** When false, payments are disabled and all users are treated as free. */
const DODO_ENABLED =
  !!process.env.DODO_PAYMENTS_API_KEY && !!process.env.DODO_WEBHOOK_SECRET;

export interface PremiumStatusResult {
  isPremium: boolean;
  source: 'user_flag' | 'subscription' | 'payment' | 'none';
  planType?: string;
  expiry?: Date;
}

/**
 * Unified premium status check - single source of truth
 * Checks users table, subscriptions table, and payments table
 * This ensures all endpoints get the same premium status
 */
export async function checkPremiumStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<PremiumStatusResult> {
  try {
    if (!DODO_ENABLED) {
      return { isPremium: false, source: 'none' };
    }
    // Validate UUID format before querying database
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn(`[Premium Check] Invalid UUID format: ${userId} - treating as non-premium`);
      return { isPremium: false, source: 'none' };
    }

    // Check subscriptions table (Dodo subscription records)
    const { data: activeSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.warn(`[Premium Check] Error querying subscriptions table for ${userId}:`, subError);
    }

    if (activeSubscription && activeSubscription.status === 'active') {
      console.log(`[Premium Check] User ${userId} has active subscription`);
      return {
        isPremium: true,
        source: 'subscription',
        planType: activeSubscription.plan_type || 'premium'
      };
    }

    // Check users.premium_user (set by Dodo webhook when payment succeeds)
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('premium_user, subscription_expiry, subscription_plan')
      .eq('id', userId)
      .single();

    if (!userError && userRow?.premium_user) {
      const now = new Date();
      const isExpired = userRow.subscription_expiry ? new Date(userRow.subscription_expiry) < now : false;
      if (!isExpired) {
        console.log(`[Premium Check] User ${userId} has premium_user=true (e.g. Dodo payment)`);
        return {
          isPremium: true,
          source: 'user_flag',
          planType: userRow.subscription_plan || 'monthly'
        };
      }
    }

    // Not premium
    console.log(`[Premium Check] User ${userId} is free`);
    return { isPremium: false, source: 'none' };

  } catch (error) {
    console.error(`[Premium Check] Error for user ${userId}:`, error);
    return { isPremium: false, source: 'none' };
  }
}


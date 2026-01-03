import { SupabaseClient } from '@supabase/supabase-js';
import { checkUserHasPayment, checkUserHasActiveSubscription } from './checkUserHasPayment';

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
    // Special case: Frontend backdoor user (not a valid UUID, bypasses database)
    if (userId === 'backdoor-user-id' || userId === '00000000-0000-0000-0000-000000000001') {
      console.log(`[Premium Check] Backdoor user detected: ${userId} - granting premium access`);
      return { 
        isPremium: true, 
        source: 'user_flag', 
        planType: 'daily'
      };
    }

    // Validate UUID format before querying database
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn(`[Premium Check] Invalid UUID format: ${userId} - treating as non-premium`);
      return { isPremium: false, source: 'none' };
    }

    // 1. Check Users Table (Flags & Tier)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('premium_user, subscription_tier, subscription_end_time')
      .eq('id', userId)
      .single();

    // If user not found, continue to check other sources
    if (userError && userError.code !== 'PGRST116') {
      console.warn(`[Premium Check] Error querying users table for ${userId}:`, userError);
    }

    // Check if flagged as premium via boolean or tier
    let isFlaggedPremium = userData?.premium_user === true || 
                           userData?.subscription_tier === 'daily' || 
                           userData?.subscription_tier === 'weekly';

    // Check expiry on user record
    if (isFlaggedPremium && userData?.subscription_end_time) {
      const expiry = new Date(userData.subscription_end_time);
      if (expiry <= new Date()) {
        isFlaggedPremium = false;
      }
    }

    if (isFlaggedPremium) {
      return { 
        isPremium: true, 
        source: 'user_flag', 
        planType: userData?.subscription_tier || 'premium',
        expiry: userData?.subscription_end_time ? new Date(userData.subscription_end_time) : undefined
      };
    }

    // 2. Check Subscriptions Table (Active Stripe/External Subs)
    const hasActiveSub = await checkUserHasActiveSubscription(supabase, userId);
    if (hasActiveSub) {
      return { isPremium: true, source: 'subscription' };
    }

    // 3. Check Payments Table (One-off payments)
    const paymentStatus = await checkUserHasPayment(supabase, userId);
    if (paymentStatus.hasPayment) {
      return { 
        isPremium: true, 
        source: 'payment',
        planType: paymentStatus.planType,
        expiry: undefined // One-off payments might not have expiry in this context
      };
    }

    // 4. Not Premium
    return { isPremium: false, source: 'none' };

  } catch (error) {
    console.error(`[Premium Check] Error for user ${userId}:`, error);
    return { isPremium: false, source: 'none' };
  }
}


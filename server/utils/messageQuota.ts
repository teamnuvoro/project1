import { SupabaseClient } from '@supabase/supabase-js';

const FREE_MESSAGE_LIMIT = 20;

export interface MessageQuotaCheck {
  allowed: boolean;
  reason?: string;
  messageCount?: number;
  limit?: number;
  subscriptionTier?: string;
  subscriptionEndTime?: string;
  isExpired?: boolean;
}

/**
 * Check if user can send a message (Flow 1)
 * Returns whether message is allowed and reason if not
 */
export async function checkMessageQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<MessageQuotaCheck> {
  try {
    // ===== STEP 1: Fetch current user subscription details =====
    // Check both new schema (subscription_tier) and old schema (premium_user)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_start_time, subscription_end_time, premium_user, subscription_plan, subscription_expiry')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Message Quota] Error fetching user:', userError);
      return {
        allowed: false,
        reason: 'User not found'
      };
    }

    // ===== CHECK PREMIUM STATUS (NEW OR OLD SCHEMA) =====
    // If user has premium_user = true OR subscription_tier = 'daily'/'weekly'/'monthly', allow unlimited
    // Also check if subscription hasn't expired
    const now = new Date();
    const isExpired = user.subscription_expiry ? new Date(user.subscription_expiry) < now : false;
    const isPremium = (user.premium_user === true && !isExpired) || 
                     user.subscription_tier === 'daily' || 
                     user.subscription_tier === 'weekly' ||
                     user.subscription_tier === 'monthly' ||
                     user.subscription_plan === 'monthly';

    console.log(`[Message Quota] User ${userId} premium check:`, {
      premium_user: user.premium_user,
      subscription_tier: user.subscription_tier,
      subscription_end_time: user.subscription_end_time,
      isPremium: isPremium
    });

    if (isPremium) {
      // Premium user - unlimited messages
      console.log(`[Message Quota] ✅ Premium user ${userId} - allowing unlimited messages`);
      return {
        allowed: true,
        subscriptionTier: user.subscription_tier || (user.premium_user ? 'daily' : 'free'),
        subscriptionEndTime: user.subscription_end_time,
        isExpired: false
      };
    }

    const { subscription_tier, subscription_end_time } = user;

    // ===== STEP 2: Check if user has paid subscription =====
    if (subscription_tier === 'daily' || subscription_tier === 'weekly') {
      // Check if subscription expired
      if (subscription_end_time) {
        const expiry = new Date(subscription_end_time);
        const now = new Date();

        if (expiry <= now) {
          // Subscription expired - downgrade to free
          console.log(`[Message Quota] Subscription expired for user ${userId}, downgrading...`);
          
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_start_time: null,
              subscription_end_time: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          // Log to subscription history
          await supabase
            .from('subscription_history')
            .insert({
              user_id: userId,
              old_tier: subscription_tier,
              new_tier: 'free',
              reason: 'expiration'
            });

          // Continue to free user check below
        } else {
          // Subscription is active - unlimited messages
          return {
            allowed: true,
            subscriptionTier: subscription_tier,
            subscriptionEndTime: subscription_end_time,
            isExpired: false
          };
        }
      } else {
        // No expiry set but has tier - treat as active
        return {
          allowed: true,
          subscriptionTier: subscription_tier
        };
      }
    }

    // ===== STEP 3: Free user - check total message count (first 20 free, then paywall) =====
    // Use usage_stats.total_messages so backend and /api/user/usage stay in sync
    const { data: usage, error: usageError } = await supabase
      .from('usage_stats')
      .select('total_messages')
      .eq('user_id', userId)
      .maybeSingle();

    if (usageError) {
      console.error('[Message Quota] Error fetching usage_stats:', usageError);
      // Fail open: allow message so new users are not blocked
      return {
        allowed: true,
        messageCount: 0,
        limit: FREE_MESSAGE_LIMIT,
        subscriptionTier: 'free',
        reason: 'Could not verify message count, allowing message'
      };
    }

    const msgCount = usage?.total_messages ?? 0;

    // Block when user has already sent 20 messages (allow 0..19, block from 20)
    if (msgCount >= FREE_MESSAGE_LIMIT) {
      console.log(`[Message Quota] Blocking userId=${userId} (usage_stats.total_messages=${msgCount}, limit=${FREE_MESSAGE_LIMIT}). To reset: UPDATE usage_stats SET total_messages = 0 WHERE user_id = '${userId}';`);
      return {
        allowed: false,
        reason: 'Message limit reached. Upgrade to continue chatting.',
        messageCount: msgCount,
        limit: FREE_MESSAGE_LIMIT,
        subscriptionTier: 'free'
      };
    }

    return {
      allowed: true,
      messageCount: msgCount,
      limit: FREE_MESSAGE_LIMIT,
      subscriptionTier: 'free'
    };

  } catch (error: any) {
    console.error('[Message Quota] Unexpected error:', error);
    // Fail open: allow message if there's an unexpected error (protects new users)
    // This ensures new users aren't blocked by system errors
    return {
      allowed: true,
      messageCount: 0,
      limit: FREE_MESSAGE_LIMIT,
      subscriptionTier: 'free',
      reason: 'Error checking quota, allowing message to protect new users'
    };
  }
}

/**
 * Log a user message to message_logs table
 */
export async function logUserMessage(
  supabase: SupabaseClient,
  userId: string,
  messageContent: string
): Promise<void> {
  try {
    await supabase
      .from('message_logs')
      .insert({
        user_id: userId,
        message_content: messageContent,
        is_user_message: true
      });
  } catch (error) {
    console.error('[Message Log] Error logging message:', error);
    // Don't throw - logging is not critical
  }
}


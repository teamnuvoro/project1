import { SupabaseClient } from '@supabase/supabase-js';

const FREE_MESSAGE_LIMIT = 1000;

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
    // If user has premium_user = true OR subscription_tier = 'daily'/'weekly', allow unlimited
    const isPremium = user.premium_user === true || 
                     user.subscription_tier === 'daily' || 
                     user.subscription_tier === 'weekly';

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

    // ===== STEP 3: Free user - check 24-hour message count =====
    const { data: messageCount, error: countError } = await supabase
      .rpc('get_user_message_count_24h', { p_user_id: userId });

    if (countError) {
      console.error('[Message Quota] Error counting messages:', countError);
      // Fallback: count manually
      const { count, error: fallbackError } = await supabase
        .from('message_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_user_message', true)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // If both methods fail, allow the message (fail open for new users)
      // This ensures new users can always send their first messages
      if (fallbackError) {
        console.error('[Message Quota] Fallback count also failed:', fallbackError);
        // Fail open: allow message if we can't determine count (protects new users)
        return {
          allowed: true,
          messageCount: 0,
          limit: FREE_MESSAGE_LIMIT,
          subscriptionTier: 'free',
          reason: 'Could not verify message count, allowing message'
        };
      }

      const msgCount = count || 0;

      // Allow if count is less than limit (0-999 can send, 1000+ blocked)
      if (msgCount >= FREE_MESSAGE_LIMIT) {
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
    }

    const msgCount = messageCount || 0;

    // Allow if count is less than limit (0-999 can send, 1000+ blocked)
    // This ensures new users (count = 0) can send their first 1000 messages
    if (msgCount >= FREE_MESSAGE_LIMIT) {
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


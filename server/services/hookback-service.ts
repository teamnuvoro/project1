/**
 * Hookback Service for Inactive Users
 * 
 * Sends WhatsApp reminders to inactive users using UDO WhatsApp Business API
 * Uses pre-approved templates with template variables only
 */

import { supabase, isSupabaseConfigured } from '../supabase';
import { udoWhatsAppService } from './udo-whatsapp';

interface HookbackConfig {
  inactiveDaysThreshold: number; // Number of days inactive before sending hookback (default: X days)
  cooldownDays: number; // Minimum days between hookbacks (default: 7 days)
  templateName: string; // Pre-approved template name in UDO dashboard
  languageCode?: string; // Template language code (default: "en")
}

/**
 * Send hookback message to an inactive user
 */
export async function sendHookbackToUser(
  userId: string,
  config: HookbackConfig
): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[Hookback Service] Database not configured');
      return false;
    }

    if (!udoWhatsAppService.isConfigured()) {
      console.warn('[Hookback Service] UDO WhatsApp service not configured');
      return false;
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, phone_number, whatsapp_opt_in, last_active_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Hookback Service] User not found:', userId);
      return false;
    }

    // Check opt-in
    if (user.whatsapp_opt_in === false) {
      console.log('[Hookback Service] User opted out of WhatsApp reminders:', userId);
      return false;
    }

    // Check if user has phone number
    if (!user.phone_number) {
      console.warn('[Hookback Service] User has no phone number:', userId);
      return false;
    }

    // Check if user is inactive for the threshold
    if (user.last_active_at) {
      const lastActive = new Date(user.last_active_at);
      const now = new Date();
      const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (daysInactive < config.inactiveDaysThreshold) {
        console.log(
          `[Hookback Service] User is not inactive enough: ${daysInactive} days (threshold: ${config.inactiveDaysThreshold})`
        );
        return false;
      }
    }

    // Check cooldown: ensure we haven't sent a hookback in the last 7 days
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - config.cooldownDays);

    const { data: recentHookbacks, error: hookbackError } = await supabase
      .from('whatsapp_reminders')
      .select('id, sent_at')
      .eq('user_id', userId)
      .eq('reminder_type', 'hookback_inactive_user')
      .eq('status', 'sent')
      .gte('sent_at', cooldownDate.toISOString())
      .limit(1);

    if (hookbackError) {
      console.error('[Hookback Service] Error checking cooldown:', hookbackError);
      return false;
    }

    if (recentHookbacks && recentHookbacks.length > 0) {
      console.log(
        `[Hookback Service] User received hookback within cooldown period (last ${config.cooldownDays} days). Skipping.`
      );
      return false;
    }

    // Extract first name from user name (fallback to "there" if no name)
    const firstName = user.name
      ? user.name.split(' ')[0].trim()
      : 'there';

    // Send WhatsApp message via UDO
    const phoneNumber = user.phone_number;
    const result = await udoWhatsAppService.sendTemplateMessage(
      phoneNumber,
      config.templateName,
      [firstName], // Template variable: user's first name
      config.languageCode || 'en'
    );

    if (!result.success) {
      console.error('[Hookback Service] Failed to send hookback:', result.error);
      
      // Record failed attempt in database
      await recordHookbackAttempt(userId, false, result.error);
      return false;
    }

    // Record successful hookback in database
    await recordHookbackAttempt(userId, true);

    console.log(`[Hookback Service] ✅ Hookback sent to user ${userId} (${user.phone_number})`);
    return true;
  } catch (error: any) {
    console.error('[Hookback Service] Error sending hookback:', error);
    await recordHookbackAttempt(userId, false, error.message);
    return false;
  }
}

/**
 * Find inactive users eligible for hookback
 */
export async function findInactiveUsersForHookback(
  inactiveDaysThreshold: number,
  cooldownDays: number = 7
): Promise<string[]> {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[Hookback Service] Database not configured');
      return [];
    }

    // Calculate threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - inactiveDaysThreshold);

    // Calculate cooldown date
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

    // Query for inactive users
    // Conditions:
    // 1. whatsapp_opt_in = true
    // 2. last_active_at is NULL OR last_active_at <= thresholdDate
    // 3. Has phone_number
    // 4. Has NOT received a hookback in the last cooldownDays
    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone_number, whatsapp_opt_in, last_active_at')
      .eq('whatsapp_opt_in', true)
      .not('phone_number', 'is', null)
      .or(`last_active_at.is.null,last_active_at.lte.${thresholdDate.toISOString()}`);

    if (error) {
      console.error('[Hookback Service] Error fetching inactive users:', error);
      return [];
    }

    if (!users || users.length === 0) {
      console.log('[Hookback Service] No inactive users found');
      return [];
    }

    // Filter out users who received hookback within cooldown period
    const eligibleUserIds: string[] = [];

    for (const user of users) {
      // Check if user received hookback in cooldown period
      const { data: recentHookbacks, error: hookbackError } = await supabase
        .from('whatsapp_reminders')
        .select('id')
        .eq('user_id', user.id)
        .eq('reminder_type', 'hookback_inactive_user')
        .eq('status', 'sent')
        .gte('sent_at', cooldownDate.toISOString())
        .limit(1);

      if (hookbackError) {
        console.error(`[Hookback Service] Error checking cooldown for user ${user.id}:`, hookbackError);
        continue;
      }

      // If no recent hookback, user is eligible
      if (!recentHookbacks || recentHookbacks.length === 0) {
        eligibleUserIds.push(user.id);
      }
    }

    console.log(
      `[Hookback Service] Found ${eligibleUserIds.length} eligible inactive users (out of ${users.length} total inactive users)`
    );
    return eligibleUserIds;
  } catch (error: any) {
    console.error('[Hookback Service] Error finding inactive users:', error);
    return [];
  }
}

/**
 * Record hookback attempt in database
 */
async function recordHookbackAttempt(
  userId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase.from('whatsapp_reminders').insert({
      user_id: userId,
      reminder_type: 'hookback_inactive_user',
      scheduled_at: new Date().toISOString(),
      sent_at: success ? new Date().toISOString() : null,
      status: success ? 'sent' : 'failed',
      message_content: success
        ? `Hookback sent via UDO template`
        : `Hookback failed: ${errorMessage || 'Unknown error'}`,
    });

    if (error) {
      console.error('[Hookback Service] Error recording hookback attempt:', error);
    }
  } catch (error: any) {
    console.error('[Hookback Service] Error recording hookback attempt:', error);
  }
}

/**
 * Send hookbacks to all eligible inactive users
 */
export async function sendHookbacksToInactiveUsers(
  config: HookbackConfig
): Promise<{ sent: number; failed: number }> {
  const stats = { sent: 0, failed: 0 };

  try {
    const eligibleUserIds = await findInactiveUsersForHookback(
      config.inactiveDaysThreshold,
      config.cooldownDays
    );

    if (eligibleUserIds.length === 0) {
      console.log('[Hookback Service] No eligible users for hookback');
      return stats;
    }

    console.log(`[Hookback Service] Sending hookbacks to ${eligibleUserIds.length} users...`);

    // Send hookbacks (process in batches to avoid rate limits)
    const batchSize = 10;
    for (let i = 0; i < eligibleUserIds.length; i += batchSize) {
      const batch = eligibleUserIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (userId) => {
          const success = await sendHookbackToUser(userId, config);
          if (success) {
            stats.sent++;
          } else {
            stats.failed++;
          }
        })
      );

      // Small delay between batches to avoid rate limits
      if (i + batchSize < eligibleUserIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `[Hookback Service] ✅ Completed: ${stats.sent} sent, ${stats.failed} failed`
    );
    return stats;
  } catch (error: any) {
    console.error('[Hookback Service] Error in batch hookback sending:', error);
    return stats;
  }
}




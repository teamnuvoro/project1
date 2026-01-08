/**
 * Hookback Scheduler for Inactive Users
 * 
 * Sends WhatsApp hookback messages to inactive users using UDO WhatsApp Business API
 * Runs daily at 8-10 PM IST (evening hours)
 */

import cron from 'node-cron';
import { isSupabaseConfigured } from '../supabase';
import { sendHookbacksToInactiveUsers } from '../services/hookback-service';

interface HookbackSchedulerConfig {
  inactiveDaysThreshold: number; // Number of days inactive before sending hookback
  cooldownDays: number; // Minimum days between hookbacks (default: 7)
  templateName: string; // Pre-approved template name in UDO dashboard
  languageCode?: string; // Template language code (default: "en")
  cronSchedule?: string; // Custom cron schedule (default: "0 20 * * *" = 8 PM IST daily)
  enabled?: boolean; // Enable/disable hookback scheduler (default: true if UDO configured)
}

/**
 * Initialize hookback scheduler
 * 
 * This function sets up a cron job to send hookback messages to inactive users
 * Runs daily at 8 PM IST (20:00) by default
 */
export function initializeHookbackScheduler(config?: Partial<HookbackSchedulerConfig>): void {
  // Default configuration
  const defaultConfig: HookbackSchedulerConfig = {
    inactiveDaysThreshold: parseInt(process.env.HOOKBACK_INACTIVE_DAYS || '3', 10),
    cooldownDays: 7,
    templateName: process.env.UDO_HOOKBACK_TEMPLATE_NAME || 'hookback_inactive_user',
    languageCode: 'en',
    cronSchedule: '0 20 * * *', // 8 PM IST daily
    enabled: process.env.ENABLE_HOOKBACKS === 'true' || process.env.NODE_ENV === 'production',
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Check if hookback system should be enabled
  if (finalConfig.enabled === false) {
    console.log('[Hookback Scheduler] Hookbacks disabled. Set ENABLE_HOOKBACKS=true to enable.');
    return;
  }

  if (!isSupabaseConfigured) {
    console.warn('[Hookback Scheduler] Database not configured. Hookbacks will not run.');
    return;
  }

  // Check if UDO is configured
  if (!process.env.UDO_API_KEY || !process.env.UDO_WHATSAPP_NUMBER) {
    console.warn(
      '[Hookback Scheduler] UDO WhatsApp not configured. Set UDO_API_KEY and UDO_WHATSAPP_NUMBER to enable hookbacks.'
    );
    return;
  }

  console.log('[Hookback Scheduler] Initializing hookback job...');
  console.log(`[Hookback Scheduler] Configuration:`, {
    inactiveDaysThreshold: finalConfig.inactiveDaysThreshold,
    cooldownDays: finalConfig.cooldownDays,
    templateName: finalConfig.templateName,
    languageCode: finalConfig.languageCode,
    cronSchedule: finalConfig.cronSchedule,
  });

  // Schedule hookback job
  // Default: Daily at 8 PM IST (20:00)
  cron.schedule(
    finalConfig.cronSchedule!,
    async () => {
      console.log('[Hookback Scheduler] Running hookback job...');

      try {
        const stats = await sendHookbacksToInactiveUsers({
          inactiveDaysThreshold: finalConfig.inactiveDaysThreshold,
          cooldownDays: finalConfig.cooldownDays,
          templateName: finalConfig.templateName,
          languageCode: finalConfig.languageCode,
        });

        console.log(
          `[Hookback Scheduler] ✅ Completed: ${stats.sent} sent, ${stats.failed} failed`
        );
      } catch (error: any) {
        console.error('[Hookback Scheduler] Error in hookback job:', error);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Kolkata', // Indian timezone (IST)
    }
  );

  console.log('[Hookback Scheduler] ✅ Hookback job initialized');
  console.log(`[Hookback Scheduler] Will run daily at 8 PM IST (${finalConfig.cronSchedule})`);
}




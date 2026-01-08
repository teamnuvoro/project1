-- =====================================================
-- ADD HOOKBACK REMINDER TYPE TO WHATSAPP_REMINDERS
-- =====================================================
-- This migration adds support for 'hookback_inactive_user' reminder type
-- Used for UDO WhatsApp Business API hookback system

-- Update the CHECK constraint to include the new reminder type
ALTER TABLE whatsapp_reminders
DROP CONSTRAINT IF EXISTS whatsapp_reminders_reminder_type_check;

ALTER TABLE whatsapp_reminders
ADD CONSTRAINT whatsapp_reminders_reminder_type_check
CHECK (reminder_type IN ('daily_checkin', 'subscription_expiry', 'inactive_user', 'hookback_inactive_user'));

-- Create index for hookback queries (filtering by type and status)
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_hookback
ON whatsapp_reminders(user_id, reminder_type, sent_at)
WHERE reminder_type = 'hookback_inactive_user' AND status = 'sent';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Hookback reminder type added to whatsapp_reminders table!' as status;




# WhatsApp Hookback System - Setup Guide

## Overview

The hookback system sends WhatsApp reminders to inactive users using Unique Digital Outreach (UDO) WhatsApp Business API. Messages are sent using pre-approved templates with template variables only (no dynamic text).

## Features

- ✅ Sends WhatsApp messages via UDO API using pre-approved templates
- ✅ Tracks inactive users based on `last_active_at` timestamp
- ✅ Enforces 7-day cooldown between hookbacks
- ✅ Respects user opt-in preferences (`whatsapp_opt_in`)
- ✅ Runs daily at 8 PM IST (configurable)
- ✅ Records all attempts in `whatsapp_reminders` table

## Prerequisites

1. **UDO WhatsApp Business API Account**
   - Active account with Unique Digital Outreach
   - Pre-approved template created in UDO dashboard
   - API key from UDO dashboard
   - WhatsApp Business number from UDO

2. **Database Migration**
   - Run the migration to add `hookback_inactive_user` reminder type

## Setup Instructions

### Step 1: Run Database Migration

Execute the migration file to add support for hookback reminder type:

```sql
-- Run this in your Supabase SQL Editor or database console
-- File: supabase/migrations/20250114_add_hookback_reminder_type.sql
```

This migration:
- Adds `hookback_inactive_user` to the allowed `reminder_type` values
- Creates an index for efficient hookback queries

### Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file:

```bash
# UDO WhatsApp Configuration (REQUIRED)
UDO_API_KEY=your_udo_api_key_here
UDO_WHATSAPP_NUMBER=your_udo_whatsapp_number_here

# Hookback Template Configuration
UDO_HOOKBACK_TEMPLATE_NAME=hookback_inactive_user  # Template name from UDO dashboard

# Hookback Settings (OPTIONAL - defaults shown)
HOOKBACK_INACTIVE_DAYS=3  # Number of days inactive before sending hookback (default: 3)
ENABLE_HOOKBACKS=true     # Enable/disable hookback system (default: true in production)
```

### Step 3: Create Template in UDO Dashboard

1. Log in to your UDO WhatsApp Business dashboard
2. Navigate to Templates section
3. Create a new template with the following:
   - **Template Name**: `hookback_inactive_user` (or your preferred name)
   - **Language**: `en` (English)
   - **Category**: Utility or Marketing
   - **Body**: Example template text:
     ```
     Hey {{1}}, we noticed you've been away 🌙
     Your calm space is still here whenever you need it.
     ```
   - **Variables**: One variable `{{1}}` for the user's first name
   - **No headers or media** (as per UDO requirements)

4. Wait for template approval from WhatsApp
5. Note the exact template name (case-sensitive)

### Step 4: Configure Template Name

Update the environment variable with your approved template name:

```bash
UDO_HOOKBACK_TEMPLATE_NAME=hookback_inactive_user  # Use your actual template name
```

### Step 5: Verify Configuration

The hookback system will automatically initialize when the server starts. Check logs for:

```
[Hookback Scheduler] Initializing hookback job...
[Hookback Scheduler] ✅ Hookback job initialized
[Hookback Scheduler] Will run daily at 8 PM IST
```

If you see warnings about missing configuration, check your environment variables.

## How It Works

### 1. Identifying Inactive Users

The system identifies users who:
- Have `last_active_at <= (now() - X days)` where X is `HOOKBACK_INACTIVE_DAYS` (default: 3)
- Have `whatsapp_opt_in = true`
- Have a valid `phone_number`
- Have NOT received a hookback in the last 7 days (cooldown period)

### 2. Sending Hookbacks

1. System runs daily at 8 PM IST (20:00)
2. Finds all eligible inactive users
3. For each user:
   - Extracts first name from user's name (or uses "there" as fallback)
   - Calls UDO API with template name and variable
   - Records attempt in `whatsapp_reminders` table
4. Processes users in batches of 10 to avoid rate limits

### 3. Cooldown Enforcement

The system ensures users don't receive more than one hookback per 7 days by:
- Checking `whatsapp_reminders` table for recent hookbacks
- Filtering out users who received a hookback in the last 7 days
- Recording all attempts (successful or failed) in the database

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UDO_API_KEY` | Yes | - | API key from UDO dashboard |
| `UDO_WHATSAPP_NUMBER` | Yes | - | WhatsApp Business number from UDO |
| `UDO_HOOKBACK_TEMPLATE_NAME` | No | `hookback_inactive_user` | Template name from UDO dashboard |
| `HOOKBACK_INACTIVE_DAYS` | No | `3` | Days inactive before sending hookback |
| `ENABLE_HOOKBACKS` | No | `true` (prod) | Enable/disable hookback system |

### Programmatic Configuration

You can also configure the scheduler programmatically in `server/index.ts`:

```typescript
initializeHookbackScheduler({
  inactiveDaysThreshold: 5,  // 5 days inactive
  cooldownDays: 7,           // 7-day cooldown
  templateName: 'my_template_name',
  languageCode: 'en',
  cronSchedule: '0 21 * * *', // 9 PM IST instead of 8 PM
});
```

## Monitoring & Logs

### Log Messages

The system logs important events:

- `[Hookback Scheduler] Running hookback job...` - Job started
- `[Hookback Service] Found X eligible inactive users` - Users found
- `[Hookback Service] ✅ Hookback sent to user...` - Successful send
- `[Hookback Service] Failed to send hookback...` - Failed send
- `[Hookback Scheduler] ✅ Completed: X sent, Y failed` - Job completed

### Database Tracking

All hookback attempts are recorded in `whatsapp_reminders` table:

```sql
SELECT * FROM whatsapp_reminders 
WHERE reminder_type = 'hookback_inactive_user' 
ORDER BY created_at DESC;
```

## Testing

### Manual Test

You can manually trigger a hookback by calling the service directly:

```typescript
import { sendHookbackToUser } from './server/services/hookback-service';

await sendHookbackToUser(userId, {
  inactiveDaysThreshold: 3,
  cooldownDays: 7,
  templateName: 'hookback_inactive_user',
  languageCode: 'en',
});
```

### Test with Different Schedule

For testing, you can change the cron schedule to run more frequently:

```typescript
initializeHookbackScheduler({
  cronSchedule: '*/10 * * * *', // Every 10 minutes (for testing only)
});
```

**⚠️ Warning**: Don't use frequent schedules in production to avoid spamming users.

## Troubleshooting

### Hookbacks Not Sending

1. **Check Environment Variables**
   ```bash
   echo $UDO_API_KEY
   echo $UDO_WHATSAPP_NUMBER
   ```

2. **Check Logs**
   - Look for configuration warnings
   - Check for API errors
   - Verify database connectivity

3. **Verify Template Name**
   - Template name must match exactly (case-sensitive)
   - Template must be approved in UDO dashboard
   - Check template language code matches

4. **Check User Eligibility**
   ```sql
   -- Check if users are eligible
   SELECT id, name, phone_number, whatsapp_opt_in, last_active_at 
   FROM users 
   WHERE whatsapp_opt_in = true 
   AND phone_number IS NOT NULL
   AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '3 days');
   ```

5. **Check Cooldown**
   ```sql
   -- Check recent hookbacks
   SELECT user_id, sent_at, status 
   FROM whatsapp_reminders 
   WHERE reminder_type = 'hookback_inactive_user' 
   AND sent_at > NOW() - INTERVAL '7 days';
   ```

### API Errors

- **401 Unauthorized**: Check `UDO_API_KEY`
- **404 Not Found**: Check template name
- **400 Bad Request**: Check phone number format or template variables
- **Rate Limit**: UDO may have rate limits; the system processes in batches with delays

## File Structure

```
server/
├── services/
│   ├── udo-whatsapp.ts          # UDO API service
│   └── hookback-service.ts      # Hookback business logic
├── jobs/
│   └── hookback-scheduler.ts    # Cron job scheduler
└── config.ts                    # Configuration helpers

supabase/migrations/
└── 20250114_add_hookback_reminder_type.sql  # Database migration
```

## API Reference

### UDO WhatsApp Service

```typescript
import { udoWhatsAppService } from './server/services/udo-whatsapp';

// Send template message
const result = await udoWhatsAppService.sendTemplateMessage(
  '91XXXXXXXXXX',           // Phone number (with country code)
  'hookback_inactive_user', // Template name
  ['Aarav'],                // Template variables (array)
  'en'                      // Language code
);
```

### Hookback Service

```typescript
import { sendHookbacksToInactiveUsers } from './server/services/hookback-service';

// Send hookbacks to all eligible users
const stats = await sendHookbacksToInactiveUsers({
  inactiveDaysThreshold: 3,
  cooldownDays: 7,
  templateName: 'hookback_inactive_user',
  languageCode: 'en',
});
```

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Check UDO dashboard for template approval status
4. Review database records in `whatsapp_reminders` table




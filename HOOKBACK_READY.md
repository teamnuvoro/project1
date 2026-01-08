# ✅ WhatsApp Hookback System - Ready to Use!

## Configuration Complete

The hookback system has been configured with your credentials:

- **API Key**: `Tg0vpLEyKZYZdP0qkMpnAg6XxFySQE`
- **WhatsApp Number**: `+918112367069`
- **Template Name**: `aigf`
- **Inactive Days Threshold**: `3 days`
- **Cooldown Period**: `7 days`
- **Schedule**: Daily at 8 PM IST

## What Was Set Up

### 1. Environment Variables
All required environment variables have been added to your `.env` file:
- `UDO_API_KEY`
- `UDO_WHATSAPP_NUMBER`
- `UDO_HOOKBACK_TEMPLATE_NAME`
- `HOOKBACK_INACTIVE_DAYS`
- `ENABLE_HOOKBACKS`

### 2. Phone Number Handling
The system correctly handles phone numbers:
- **From Number** (UDO WhatsApp Business): `+918112367069` → `918112367069` (cleaned for API)
- **User Phone Numbers**: Automatically cleaned and formatted (handles +91, 91, or 10-digit formats)

### 3. Services Created
- ✅ `server/services/udo-whatsapp.ts` - UDO API integration
- ✅ `server/services/hookback-service.ts` - Hookback business logic
- ✅ `server/jobs/hookback-scheduler.ts` - Daily cron job scheduler

### 4. Database Migration
The migration file is ready: `supabase/migrations/20250114_add_hookback_reminder_type.sql`

**⚠️ Important**: Run this migration in your Supabase SQL Editor before using the hookback system.

## Next Steps

### Step 1: Run Database Migration (REQUIRED)

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the migration file: `supabase/migrations/20250114_add_hookback_reminder_type.sql`

This adds support for the `hookback_inactive_user` reminder type.

### Step 2: Verify Template in UDO Dashboard

Make sure your template `aigf` is:
- ✅ Approved in UDO dashboard
- ✅ Has exactly one variable `{{1}}` for the user's first name
- ✅ Language code is `en`

### Step 3: Start the Server

The hookback service will start automatically when you start your server:

```bash
npm start
# or
npm run dev
```

You should see these log messages:
```
[UDO WhatsApp] Service initialized
[UDO WhatsApp] Using from number: 918112367069
[Hookback Scheduler] Initializing hookback job...
[Hookback Scheduler] ✅ Hookback job initialized
[Hookback Scheduler] Will run daily at 8 PM IST (0 20 * * *)
```

## How It Works

1. **Daily Execution**: Runs every day at 8 PM IST (20:00)
2. **Identifies Inactive Users**: Finds users who haven't been active for 3+ days
3. **Checks Cooldown**: Skips users who received a hookback in the last 7 days
4. **Sends Messages**: Uses UDO API to send template messages with user's first name
5. **Tracks Attempts**: Records all attempts in `whatsapp_reminders` table

## Testing

### Manual Test (Optional)

You can test the service manually by importing and calling:

```typescript
import { sendHookbackToUser } from './server/services/hookback-service';

await sendHookbackToUser('user-id-here', {
  inactiveDaysThreshold: 3,
  cooldownDays: 7,
  templateName: 'aigf',
  languageCode: 'en',
});
```

### Check Logs

Monitor the logs when the cron job runs (8 PM IST):
```
[Hookback Scheduler] Running hookback job...
[Hookback Service] Found X eligible inactive users
[Hookback Service] ✅ Hookback sent to user...
[Hookback Scheduler] ✅ Completed: X sent, Y failed
```

## Phone Number Format Handling

The system handles various phone number formats automatically:

| Input Format | Cleaned Output | Description |
|-------------|----------------|-------------|
| `+918112367069` | `918112367069` | Standard format (with +) |
| `918112367069` | `918112367069` | Already clean |
| `8112367069` | `918112367069` | 10-digit (adds 91) |
| `08112367069` | `918112367069` | Local format (removes 0, adds 91) |

## Troubleshooting

### Service Not Starting

1. **Check Environment Variables**:
   ```bash
   # Windows PowerShell
   Get-Content .env | Select-String -Pattern "UDO"
   ```

2. **Check Logs**: Look for configuration warnings in server logs

3. **Verify Template**: Make sure template `aigf` is approved in UDO dashboard

### Messages Not Sending

1. **Check User Eligibility**:
   ```sql
   SELECT id, name, phone_number, whatsapp_opt_in, last_active_at 
   FROM users 
   WHERE whatsapp_opt_in = true 
   AND phone_number IS NOT NULL;
   ```

2. **Check Cooldown**:
   ```sql
   SELECT user_id, sent_at 
   FROM whatsapp_reminders 
   WHERE reminder_type = 'hookback_inactive_user' 
   AND sent_at > NOW() - INTERVAL '7 days';
   ```

3. **Check API Errors**: Look for error messages in logs with `[UDO WhatsApp]`

## Configuration Files

- **Service**: `server/services/udo-whatsapp.ts`
- **Hookback Logic**: `server/services/hookback-service.ts`
- **Scheduler**: `server/jobs/hookback-scheduler.ts`
- **Migration**: `supabase/migrations/20250114_add_hookback_reminder_type.sql`
- **Config**: `server/config.ts`

## Support

For issues:
1. Check server logs for error messages
2. Verify template is approved in UDO dashboard
3. Check database migration was run
4. Verify environment variables are set correctly

---

**Status**: ✅ Configured and ready to use!
**Next Action**: Run the database migration and start the server.




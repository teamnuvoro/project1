# Migration Dependencies Analysis

## Migration File: `20250114_add_hookback_reminder_type.sql`

### What This Migration Does

1. **Modifies CHECK constraint** on `whatsapp_reminders.reminder_type` column
   - Adds `'hookback_inactive_user'` to the allowed values
   - Uses `DROP CONSTRAINT IF EXISTS` (safe - won't fail if constraint doesn't exist)

2. **Creates an index** on `whatsapp_reminders` table
   - Uses `CREATE INDEX IF NOT EXISTS` (safe - won't fail if index exists)

### Dependencies

**⚠️ REQUIRED DEPENDENCY:**

The `whatsapp_reminders` table **must exist** before running this migration because:
- The migration uses `ALTER TABLE whatsapp_reminders` 
- If the table doesn't exist, the migration will **fail**

### Previous Migration

The `whatsapp_reminders` table is created in:
- **File**: `supabase/migrations/20250113_whatsapp_reminders.sql`
- **Date**: January 13, 2025 (previous day)

This previous migration creates:
- ✅ `whatsapp_reminders` table
- ✅ `users.whatsapp_opt_in` column
- ✅ `users.last_active_at` column
- ✅ Indexes, triggers, RLS policies, etc.

### Do You Need to Run the Previous Migration First?

**Check if the table exists:**

Run this SQL query in your Supabase SQL Editor:

```sql
-- Check if whatsapp_reminders table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'whatsapp_reminders'
);
```

**If the table EXISTS:**
- ✅ You can run the hookback migration directly
- The migration is safe and will work

**If the table DOES NOT EXIST:**
- ❌ You need to run `20250113_whatsapp_reminders.sql` first
- Then run `20250114_add_hookback_reminder_type.sql`

### Safe Operations in This Migration

The migration uses safe operations:
- ✅ `DROP CONSTRAINT IF EXISTS` - Won't fail if constraint doesn't exist
- ✅ `CREATE INDEX IF NOT EXISTS` - Won't fail if index exists
- ⚠️ `ALTER TABLE` - **Will fail if table doesn't exist**

### Summary

| Dependency | Required? | What Happens If Missing |
|------------|-----------|-------------------------|
| `whatsapp_reminders` table | **YES** | Migration will fail with "table does not exist" error |
| `users` table | **YES** (for FK) | Migration will fail (but users table should already exist) |
| Previous migration | **Maybe** | Only if `whatsapp_reminders` table doesn't exist |

### Recommendation

**Before running the hookback migration:**

1. Check if `whatsapp_reminders` table exists (use the query above)
2. If it doesn't exist, run `20250113_whatsapp_reminders.sql` first
3. Then run `20250114_add_hookback_reminder_type.sql`

If you're unsure, you can run both migrations - the first one uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run even if the table already exists.




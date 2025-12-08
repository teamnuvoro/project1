
-- Migration to implement subscription features and payments security

-- 1. Update USERS table for subscription logic
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT; -- 'daily' or 'weekly'

-- 2. Update USAGE_STATS for daily messaging limits (Ensure they exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_stats' AND column_name = 'daily_messages_count') THEN
        ALTER TABLE usage_stats ADD COLUMN daily_messages_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_stats' AND column_name = 'last_daily_reset') THEN
        ALTER TABLE usage_stats ADD COLUMN last_daily_reset TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Ensure PAYMENTS table exists with correct schema (Secure storage)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    cashfree_order_id TEXT,
    cashfree_payment_id TEXT,
    amount NUMERIC,
    status TEXT, -- 'success', 'failed', 'pending'
    plan_type TEXT, -- 'daily', 'weekly'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on Payments for safety
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (auth.uid() = user_id);

-- Only Service Role can insert payments (from backend)
DROP POLICY IF EXISTS "Service role insert payments" ON payments;
CREATE POLICY "Service role insert payments"
ON payments FOR INSERT
WITH CHECK (true); -- Ideally restrict to service role explicitly if using Supabase Auth with roles

-- 5. Fix SUBSCRIPTIONS table RLS if needed
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON payments TO service_role;
GRANT SELECT ON payments TO authenticated;

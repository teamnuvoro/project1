-- Add is_admin column to users table if it doesn't exist
-- This migration adds the is_admin flag to the users table for admin access control

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;
        
        -- Add comment
        COMMENT ON COLUMN users.is_admin IS 'Flag to indicate if user has admin privileges';
        
        -- Create index for faster admin lookups
        CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
        
        RAISE NOTICE 'Added is_admin column to users table';
    ELSE
        RAISE NOTICE 'is_admin column already exists in users table';
    END IF;
END $$;

-- Optional: Set yourself as admin (replace with your user ID)
-- UPDATE users SET is_admin = TRUE WHERE id = 'YOUR_USER_ID_HERE';


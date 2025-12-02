-- Migration: Add UNIQUE constraint to avatar_configurations.user_id
-- Description: Ensures one avatar config per user, handling existing duplicates.

BEGIN;

-- 1. Identify and delete duplicate records, keeping the most recently updated one.
-- We use a CTE to find duplicates and rank them by updatedAt descending.
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id 
               ORDER BY updated_at DESC, created_at DESC
           ) as rn
    FROM avatar_configurations
)
DELETE FROM avatar_configurations
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Add the UNIQUE constraint to the user_id column.
-- This will fail if duplicates still exist (which step 1 should prevent).
ALTER TABLE avatar_configurations
ADD CONSTRAINT avatar_configurations_user_id_unique UNIQUE (user_id);

-- 3. (Optional) Create an index on user_id if it doesn't exist (UNIQUE constraint implies an index, but explicit is fine too)
-- CREATE INDEX IF NOT EXISTS idx_avatar_configurations_user_id ON avatar_configurations(user_id);

COMMIT;

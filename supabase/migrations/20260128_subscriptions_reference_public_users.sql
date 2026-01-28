-- subscriptions.user_id: change FK from auth.users(id) to public.users(id)
-- Required when using Firebase Auth: users live in public.users, not auth.users.

-- 1. Drop existing FK on subscriptions.user_id (discover and drop whatever constraint exists)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'subscriptions'
    AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
    RAISE NOTICE 'Dropped constraint % on subscriptions.user_id', r.constraint_name;
  END LOOP;
END $$;

-- 2. Add FK to public.users(id) so Firebase-created users (in public.users) can have subscriptions
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.subscriptions.user_id IS 'References public.users(id). Use this for Firebase Auth (users in public.users).';

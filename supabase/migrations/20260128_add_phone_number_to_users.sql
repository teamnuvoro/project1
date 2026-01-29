-- Add phone_number to public.users for profile/contact info (e.g. collected at signup)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
COMMENT ON COLUMN public.users.phone_number IS 'User phone number; collected at signup or profile.';

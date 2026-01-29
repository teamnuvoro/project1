/**
 * Supabase Admin Helper
 * 
 * Uses Supabase Admin API (service role key) to:
 * - Create users with phone authentication
 * - Issue session tokens
 * - Bypass RLS policies
 * 
 * Security: Service role key is server-side only, never exposed to client
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[Supabase Admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Normalize phone number for consistent storage
 */
function normalizePhoneForStorage(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = `+91${cleaned.replace(/^91/, '')}`;
  }
  return cleaned;
}

/**
 * Find user by phone number (tries multiple formats)
 */
async function findUserByPhone(phone: string): Promise<any | null> {
  const candidates = [
    normalizePhoneForStorage(phone),
    phone.replace(/^\+/, ''),
    phone.replace(/^\+91/, '91'),
    phone.replace(/^91/, '+91'),
  ];

  for (const candidate of candidates) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone_number', candidate)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[Supabase Admin] Error querying phone:', error);
      continue;
    }

    if (data) {
      return data;
    }
  }

  return null;
}

/**
 * Find user by email
 */
async function findUserByEmail(email: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase Admin] Error querying email:', error);
    return null;
  }

  return data;
}

/**
 * Create or get user with phone authentication
 * 
 * @param phoneNumber - Verified phone number
 * @param name - User name (for signup)
 * @param email - User email (for signup, optional)
 * @returns User object and session token
 */
export async function createOrGetUserByPhone(
  phoneNumber: string,
  name?: string,
  email?: string
): Promise<{ user: any; sessionToken: string }> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Admin not configured');
  }

  const normalizedPhone = normalizePhoneForStorage(phoneNumber);
  
  // Step 1: Check if user exists by phone number (login flow)
  let user = await findUserByPhone(normalizedPhone);

  if (user) {
    // Existing user found by phone - login
    console.log('[Supabase Admin] Found existing user by phone:', user.id);
    
    // Update phone_confirmed_at if not set
    if (!user.phone_confirmed_at) {
      await supabaseAdmin
        .from('users')
        .update({ 
          phone_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }
    
    // Generate session token
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    
    return { user, sessionToken };
  }

  // Step 2: New user signup - check if email already exists
  // If no name provided, this is a login attempt - user should exist
  if (!name) {
    console.log('[Supabase Admin] No user found by phone and no name provided - login attempt');
    throw new Error('No account found with this phone number. Please signup first.');
  }

  if (email) {
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
      // Email already exists - user should login instead
      console.log('[Supabase Admin] Email already exists:', email);
      throw new Error('An account with this email already exists. Please login instead.');
    }
  }

  console.log('[Supabase Admin] Creating new user with phone:', normalizedPhone);

  // Step 3: Create new user
  const crypto = await import('crypto');
  const userId = crypto.randomUUID();

  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  
  // Create user in Supabase
  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      phone_number: normalizedPhone,
      name,
      email: email || `${normalizedPhone.replace(/\D/g, '')}@temp.riya.ai`, // Temporary email if not provided
      phone_confirmed_at: new Date().toISOString(), // Mark phone as confirmed
      gender: 'prefer_not_to_say',
      persona: 'sweet_supportive',
      premium_user: false, // Default to free user
      subscription_plan: null,
      subscription_expiry: null,
      subscription_tier: null,
      subscription_start_time: null,
      subscription_end_time: null,
      locale: 'en-US',
      onboarding_complete: false, // Onboarding to be completed later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError || !newUser) {
    console.error('[Supabase Admin] Error creating user:', createError);
    
    // Handle specific error cases
    if (createError?.code === '23505') {
      // Unique constraint violation
      if (createError.message?.includes('email')) {
        throw new Error('An account with this email already exists. Please login instead.');
      } else if (createError.message?.includes('phone_number')) {
        throw new Error('An account with this phone number already exists. Please login instead.');
      }
    }
    
    throw new Error('Failed to create user account');
  }

  // Initialize usage stats
  await supabaseAdmin
    .from('usage_stats')
    .insert({
      user_id: newUser.id,
      total_messages: 0,
      total_call_seconds: 0,
      updated_at: new Date().toISOString(),
    });

  console.log('[Supabase Admin] Created new user:', newUser.id);

  // Generate session token
  const sessionToken = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');

  return { user: newUser, sessionToken };
}

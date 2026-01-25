/**
 * Supabase Phone OTP Authentication Helper
 * 
 * Uses Supabase's built-in phone authentication with Vonage
 */

import { supabase } from './supabase';

// Test phone numbers with fixed OTPs (for development/testing)
// These work with Supabase test phone numbers feature
// Format in Supabase Dashboard: 1234567890=123456
const TEST_PHONE_NUMBERS: Record<string, string> = {
  '1234567890': '123456',
  '+911234567890': '123456',
  '911234567890': '123456',
  '+919999999999': '123456',
  '919999999999': '123456',
  '9999999999': '123456',
};

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  if (!cleaned.startsWith('+')) {
    if (/^\d{10}$/.test(cleaned)) {
      cleaned = `+91${cleaned}`;
    } else if (/^91\d{10}$/.test(cleaned)) {
      cleaned = `+${cleaned}`;
    } else if (/^\d+$/.test(cleaned)) {
      cleaned = `+91${cleaned}`;
    }
  }
  
  return cleaned;
}

/**
 * Send OTP to phone number using Supabase
 */
export async function sendOTP(phoneNumber: string, metadata?: { name?: string; email?: string }): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  const cleanedInput = phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  // Check if this is a test phone number
  const isTestPhone = TEST_PHONE_NUMBERS[cleanedInput] || 
                      TEST_PHONE_NUMBERS[normalized] ||
                      TEST_PHONE_NUMBERS[phoneNumber.replace(/\s+/g, '')];
  
  if (isTestPhone) {
    console.log('[Supabase Auth] 🧪 Test phone detected:', phoneNumber, 'Fixed OTP:', isTestPhone);
  }
  
  console.log('[Supabase Auth] Sending OTP to:', normalized);
  console.log('[Supabase Auth] Original phone:', phoneNumber);
  console.log('[Supabase Auth] Metadata:', metadata);
  
  // Store normalized phone in localStorage for verification
  // For test phones, also store the raw input
  if (typeof window !== 'undefined') {
    localStorage.setItem('last_otp_phone', normalized);
    localStorage.setItem('last_otp_time', Date.now().toString());
    if (isTestPhone) {
      localStorage.setItem('last_otp_phone_raw', phoneNumber.replace(/\s+/g, ''));
      console.log('[Supabase Auth] Stored test phone for verification');
    }
  }
  
  // For test phones, try multiple formats when sending
  // Supabase test phones need to match exactly what's in the dashboard
  const phoneToSend = isTestPhone ? [
    phoneNumber.replace(/\s+/g, ''), // Raw input (most likely to match Supabase test config)
    cleanedInput, // Cleaned
    normalized, // Normalized
    '1234567890', // Exact test number
    '+911234567890', // With country code
  ].find(p => p) || normalized : normalized;
  
  console.log('[Supabase Auth] Using phone format for send:', phoneToSend);
  
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phoneToSend,
    options: {
      data: metadata || {},
      channel: 'sms', // Explicitly use SMS channel
    },
  });
  
  if (error) {
    console.error('[Supabase Auth] Send OTP error:', error);
    console.error('[Supabase Auth] Error details:', {
      status: error.status,
      message: error.message,
      name: error.name,
    });
    
    // Provide more specific error messages
    if (error.status === 403) {
      throw new Error('Phone authentication is not enabled or SMS provider is not configured. Please check your Supabase settings.');
    } else if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.message?.includes('Invalid')) {
      throw new Error('Invalid phone number format. Please use a valid phone number.');
    } else if (error.message?.includes('SMS') || error.message?.includes('provider')) {
      throw new Error('SMS provider error. Please check your Vonage configuration in Supabase Dashboard.');
    }
    
    throw new Error(error.message || 'Failed to send OTP');
  }
  
  console.log('[Supabase Auth] OTP sent successfully');
  console.log('[Supabase Auth] Response data:', data);
  
  // Check if there's a message ID or any delivery info
  if (data) {
    console.log('[Supabase Auth] Full response:', JSON.stringify(data, null, 2));
  }
  
  // Note: Supabase doesn't return the OTP in the response for security
  // The OTP is sent via SMS only
  // If SMS doesn't arrive, check:
  // 1. Supabase Dashboard → Logs → Auth Logs
  // 2. Vonage Dashboard → Messages → Outbound
  // 3. Verify Vonage credentials are saved in Supabase Dashboard
}

/**
 * Verify OTP code using Supabase
 */
export async function verifyOTP(phoneNumber: string, otpCode: string): Promise<{ session: any; user: any }> {
  // Clean OTP code (remove spaces, ensure it's 6 digits)
  const cleanOtp = otpCode.replace(/\s+/g, '').trim();
  
  if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    throw new Error('OTP code must be exactly 6 digits');
  }
  
  // Check if this is a test phone number
  const cleanedInput = phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  const normalizedForTest = normalizePhoneNumber(phoneNumber);
  const testPhoneKey = cleanedInput || normalizedForTest || phoneNumber;
  
  // Check all possible test phone formats
  const isTestPhone = TEST_PHONE_NUMBERS[testPhoneKey] || 
                      TEST_PHONE_NUMBERS[normalizedForTest] ||
                      TEST_PHONE_NUMBERS[cleanedInput] ||
                      TEST_PHONE_NUMBERS[phoneNumber];
  
  if (isTestPhone && cleanOtp === isTestPhone) {
    console.log('[Supabase Auth] 🧪 Test phone detected:', testPhoneKey, 'OTP:', cleanOtp);
    // For test phones, we still need to verify with Supabase, but we'll try all formats
  }
  
  // Get the phone number used when sending OTP (from localStorage)
  let phoneToUse = phoneNumber;
  if (typeof window !== 'undefined') {
    const lastOtpPhone = localStorage.getItem('last_otp_phone');
    const lastOtpTime = localStorage.getItem('last_otp_time');
    
    if (lastOtpPhone && lastOtpTime) {
      const timeSinceOtp = Date.now() - parseInt(lastOtpTime);
      const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
      
      // Don't expire test phone OTPs
      if (!isTestPhone && timeSinceOtp > OTP_EXPIRY) {
        localStorage.removeItem('last_otp_phone');
        localStorage.removeItem('last_otp_time');
        throw new Error('OTP has expired. Please request a new one.');
      }
      
      // Use the exact phone number that was used to send OTP
      phoneToUse = lastOtpPhone;
      console.log('[Supabase Auth] Using stored phone from OTP send:', phoneToUse);
    } else {
      // Fallback to normalizing the provided phone
      phoneToUse = normalizePhoneNumber(phoneNumber);
    }
  } else {
    phoneToUse = normalizePhoneNumber(phoneNumber);
  }
  
  const normalized = normalizePhoneNumber(phoneToUse);
  
  console.log('[Supabase Auth] Verifying OTP for:', normalized);
  console.log('[Supabase Auth] OTP code:', cleanOtp);
  console.log('[Supabase Auth] Original phone provided:', phoneNumber);
  
  // For test phones, try ALL possible formats including the raw input
  const phoneVariants = isTestPhone ? [
    phoneNumber.replace(/\s+/g, ''), // Raw input without spaces
    cleanedInput, // Cleaned input
    normalized, // Normalized with +91
    phoneToUse, // Stored phone
    normalized.replace(/^\+91/, '91'), // Without + but with 91
    normalized.replace(/^\+91/, ''), // Without country code
    '1234567890', // Exact test number
    '+911234567890', // With country code
    '911234567890', // With 91 prefix
  ] : [
    normalized, // Original normalized (most likely to work)
    phoneToUse, // Use stored phone if available
    normalized.replace(/^\+91/, '91'), // Without + but with 91
    normalized.replace(/^\+91/, ''), // Without country code
    phoneNumber.replace(/\s+/g, ''), // Original without spaces
  ];
  
  // Remove duplicates
  const uniqueVariants = [...new Set(phoneVariants.filter(v => v))];
  
  let lastError: any = null;
  
  // Try each phone format variant
  for (const phoneVariant of uniqueVariants) {
    try {
      console.log('[Supabase Auth] Trying phone variant:', phoneVariant);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneVariant,
        token: cleanOtp,
        type: 'sms',
      });
      
      if (error) {
        lastError = error;
        console.warn('[Supabase Auth] Verification failed for variant:', phoneVariant, error.message);
        continue; // Try next variant
      }
      
      if (!data.session) {
        throw new Error('No session returned from verification');
      }
      
      console.log('[Supabase Auth] ✅ OTP verified successfully with variant:', phoneVariant);
      
      // Clear stored OTP data on success
      if (typeof window !== 'undefined') {
        localStorage.removeItem('last_otp_phone');
        localStorage.removeItem('last_otp_time');
      }
      
      return {
        session: data.session,
        user: data.user,
      };
    } catch (err: any) {
      lastError = err;
      console.warn('[Supabase Auth] Error with variant:', phoneVariant, err.message);
      continue;
    }
  }
  
  // All variants failed - provide helpful error message
  console.error('[Supabase Auth] ❌ All verification attempts failed. Last error:', lastError);
  
  if (lastError) {
    // Provide more specific error messages
    if (lastError.status === 403) {
      throw new Error('Phone authentication is not enabled or SMS provider is not configured. Please check your Supabase settings.');
    } else if (lastError.message?.includes('Invalid token') || lastError.message?.includes('expired') || lastError.message?.includes('Token has expired') || lastError.message?.includes('has expired')) {
      throw new Error('OTP code has expired. Please request a new one.');
    } else if (lastError.message?.includes('not found') || lastError.message?.includes('No such')) {
      throw new Error('No OTP request found for this phone number. Please request a new OTP.');
    } else if (lastError.message?.includes('invalid') || lastError.message?.includes('Invalid')) {
      throw new Error('Invalid OTP code. Please check and try again.');
    }
    
    throw new Error(lastError.message || 'Failed to verify OTP. Please request a new code.');
  }
  
  throw new Error('Failed to verify OTP. Please request a new code.');
}

/**
 * Create or update user profile in Supabase after OTP verification
 */
export async function createOrUpdateUserProfile(
  userId: string,
  profileData: {
    name: string;
    email: string;
    phoneNumber: string;
  }
): Promise<any> {
  // Check if user profile exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (existingUser) {
    // Update existing user
    const { data, error } = await supabase
      .from('users')
      .update({
        name: profileData.name,
        email: profileData.email,
        phone_number: profileData.phoneNumber,
        phone_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('[Supabase Auth] Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
    
    return data;
  } else {
    // Create new user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: profileData.name,
        email: profileData.email,
        phone_number: profileData.phoneNumber,
        phone_confirmed_at: new Date().toISOString(),
        gender: 'prefer_not_to_say',
        persona: 'sweet_supportive',
        premium_user: false,
        subscription_plan: null,
        subscription_expiry: null,
        subscription_tier: null,
        subscription_start_time: null,
        subscription_end_time: null,
        locale: 'en-US',
        onboarding_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Supabase Auth] Error creating user profile:', error);
      
      // Handle duplicate email/phone errors
      if (error.code === '23505') {
        if (error.message?.includes('email')) {
          throw new Error('An account with this email already exists. Please login instead.');
        } else if (error.message?.includes('phone_number')) {
          throw new Error('An account with this phone number already exists. Please login instead.');
        }
      }
      
      throw new Error('Failed to create user profile');
    }
    
    // Initialize usage stats
    await supabase
      .from('usage_stats')
      .insert({
        user_id: userId,
        total_messages: 0,
        total_call_seconds: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    return data;
  }
}

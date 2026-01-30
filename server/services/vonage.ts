/**
 * Vonage Verify Service
 * 
 * Handles OTP sending and verification via Vonage Verify API (when enabled).
 * When VONAGE_ENABLED is false, SDK is not loaded and all OTP functions throw "OTP disabled".
 */

const VONAGE_ENABLED =
  !!process.env.VONAGE_API_KEY && !!process.env.VONAGE_API_SECRET;

let VonageClass: any = null;
let vonage: any = null;

if (VONAGE_ENABLED) {
  try {
    const vonageModule = require('@vonage/server-sdk');
    VonageClass = vonageModule.Vonage || vonageModule.default?.Vonage || vonageModule.default;
    if (VonageClass) {
      vonage = new VonageClass({
        apiKey: process.env.VONAGE_API_KEY || '',
        apiSecret: process.env.VONAGE_API_SECRET || '',
      });
    }
  } catch (error: any) {
    console.warn('[Vonage] @vonage/server-sdk not available. OTP features will be disabled.');
    vonage = null;
  }
} else {
  // Do not require @vonage/server-sdk when disabled (avoids "module not found" in production)
  console.warn('[Vonage] OTP disabled — SDK not loaded (set VONAGE_API_KEY and VONAGE_API_SECRET to enable).');
}

/**
 * Normalize phone number to E.164 format
 * Assumes India (+91) if no country code provided
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  if (!cleaned.startsWith('+')) {
    // If 10 digits, assume India
    if (/^\d{10}$/.test(cleaned)) {
      cleaned = `+91${cleaned}`;
    }
    // If 12 digits starting with 91, add +
    else if (/^91\d{10}$/.test(cleaned)) {
      cleaned = `+${cleaned}`;
    }
    // Otherwise, try to add +91
    else if (/^\d+$/.test(cleaned)) {
      cleaned = `+91${cleaned}`;
    }
  }
  
  return cleaned;
}

/**
 * Send OTP via Vonage Verify API
 * 
 * @param phoneNumber - Phone number in E.164 format
 * @returns request_id from Vonage (used for verification)
 */
export async function sendOTP(phoneNumber: string): Promise<string> {
  if (!VONAGE_ENABLED || !vonage) {
    throw new Error('OTP disabled');
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  try {
    console.log('[Vonage] Sending OTP to:', normalizedPhone);
    
    const response = await vonage.verify.start({
      number: normalizedPhone,
      brand: 'Riya',
      codeLength: 6,
      workflowId: 1, // SMS workflow
    });

    if (response.status === '0' && response.request_id) {
      console.log('[Vonage] OTP sent successfully, request_id:', response.request_id);
      return response.request_id;
    } else {
      const errorMsg = response.error_text || 'Failed to send OTP';
      console.error('[Vonage] Error sending OTP:', response.status, errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error('[Vonage] Exception sending OTP:', error);
    
    // Map Vonage errors to user-friendly messages
    if (error.message?.includes('Invalid')) {
      throw new Error('Invalid phone number format');
    } else if (error.message?.includes('quota') || error.message?.includes('balance')) {
      throw new Error('SMS service temporarily unavailable. Please try again later.');
    } else if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to send OTP. Please try again.');
  }
}

/**
 * Verify OTP code with Vonage
 * 
 * @param requestId - Request ID from sendOTP response
 * @param code - 6-digit OTP code
 * @returns true if valid, false if invalid
 */
export async function verifyOTP(requestId: string, code: string): Promise<boolean> {
  if (!VONAGE_ENABLED || !vonage) {
    throw new Error('OTP disabled');
  }

  if (!/^\d{6}$/.test(code)) {
    throw new Error('OTP code must be 6 digits');
  }

  try {
    console.log('[Vonage] Verifying OTP, request_id:', requestId);
    
    const response = await vonage.verify.check(requestId, code);

    if (response.status === '0') {
      console.log('[Vonage] OTP verified successfully');
      return true;
    } else {
      // Status codes:
      // '16' = code expired
      // '17' = code incorrect
      // '6' = too many attempts
      const status = response.status;
      const errorText = response.error_text || 'Verification failed';
      
      console.log('[Vonage] OTP verification failed:', status, errorText);
      
      if (status === '16') {
        throw new Error('OTP code has expired. Please request a new one.');
      } else if (status === '6') {
        throw new Error('Too many verification attempts. Please request a new OTP.');
      } else if (status === '17') {
        throw new Error('Invalid OTP code. Please check and try again.');
      }
      
      throw new Error(errorText);
    }
  } catch (error: any) {
    console.error('[Vonage] Exception verifying OTP:', error);
    throw error;
  }
}

/**
 * Cancel an ongoing OTP verification
 * Useful if user requests a new OTP before verifying the old one
 */
export async function cancelOTP(requestId: string): Promise<void> {
  if (!VONAGE_ENABLED || !vonage) {
    return;
  }
  
  try {
    await vonage.verify.cancel(requestId);
    console.log('[Vonage] OTP cancelled, request_id:', requestId);
  } catch (error: any) {
    console.warn('[Vonage] Error cancelling OTP:', error);
    // Don't throw - cancellation is best effort
  }
}

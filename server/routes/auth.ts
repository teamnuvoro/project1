import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';
import twilio from 'twilio';

const router = Router();

// Twilio Configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// In-memory OTP storage for development (use Redis in production)
interface OTPRecord {
  otp: string;
  phoneNumber: string;
  email: string;
  name: string;
  expiresAt: number;
  verified: boolean;
}

const otpStore = new Map<string, OTPRecord>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Twilio SMS
async function sendOTPViaSMS(phoneNumber: string, otp: string): Promise<boolean> {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`);
    return true; // Dev mode - just log OTP
  }

  try {
    await twilioClient.messages.create({
      body: `Your Riya AI verification code is: ${otp}. Valid for 10 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    console.log(`✅ OTP sent to ${phoneNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Twilio Error]', error.message);
    return false;
  }
}

// POST /api/auth/send-otp - Send OTP to phone number
router.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, email, name } = req.body;

    if (!phoneNumber || !email || !name) {
      return res.status(400).json({ 
        error: 'Phone number, email, and name are required' 
      });
    }

    // Validate phone number format (basic validation)
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format. Use international format (e.g., +919876543210)' 
      });
    }

    // Check if user already exists (skip in dev mode for easier testing)
    const skipDuplicateCheck = process.env.NODE_ENV === 'development' && process.env.SKIP_DUPLICATE_CHECK === 'true';
    
    if (isSupabaseConfigured && !skipDuplicateCheck) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, phone_number')
        .or(`email.eq.${email},phone_number.eq.${cleanPhone}`)
        .single();

      if (existingUser) {
        return res.status(409).json({ 
          error: 'Account already exists! Please use the LOGIN page instead, or use different email/phone.',
          shouldLogin: true,
          existingEmail: existingUser.email,
          existingPhone: existingUser.phone_number
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log('[SEND OTP] Generated OTP:', otp, 'for phone:', cleanPhone);

    // Store OTP
    otpStore.set(cleanPhone, {
      otp,
      phoneNumber: cleanPhone,
      email,
      name,
      expiresAt,
      verified: false
    });

    // Send OTP via SMS
    const sent = await sendOTPViaSMS(cleanPhone, otp);

    if (!sent && twilioClient) {
      return res.status(500).json({ 
        error: 'Failed to send OTP. Please try again.' 
      });
    }

    res.json({ 
      success: true,
      message: twilioClient 
        ? 'OTP sent to your phone number' 
        : `OTP sent (Dev Mode): ${otp}`,
      devMode: !twilioClient,
      otp: !twilioClient ? otp : undefined // Only show in dev mode
    });

  } catch (error: any) {
    console.error('[Send OTP Error]', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp - Verify OTP and create user
router.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    const otpRecord = otpStore.get(cleanPhone);

    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }

    // Check if OTP expired
    if (Date.now() > otpRecord.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Mark as verified
    otpRecord.verified = true;

    // Create user in Supabase
    if (!isSupabaseConfigured) {
      return res.status(500).json({ 
        error: 'Database not configured. Please set up Supabase.' 
      });
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        name: otpRecord.name,
        email: otpRecord.email,
        phone_number: cleanPhone,
        gender: 'prefer_not_to_say',
        persona: 'sweet_supportive', // Default to Riya
        premium_user: false,
        locale: 'hi-IN',
        onboarding_complete: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[Create User Error]', createError);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: createError.message 
      });
    }

    // Initialize usage stats
    await supabase
      .from('usage_stats')
      .insert({
        user_id: newUser.id,
        total_messages: 0,
        total_call_seconds: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Clean up OTP
    otpStore.delete(cleanPhone);

    // Create session (simplified - in production use proper JWT)
    const sessionToken = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phone_number,
        premiumUser: newUser.premium_user,
        onboardingComplete: newUser.onboarding_complete
      },
      sessionToken
    });

  } catch (error: any) {
    console.error('[Verify OTP Error]', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/login - Login with phone number (send OTP)
router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    // Check if user exists
    if (!isSupabaseConfigured) {
      return res.status(500).json({ 
        error: 'Database not configured. Please set up Supabase.' 
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone_number')
      .eq('phone_number', cleanPhone)
      .single();

    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this phone number',
        shouldSignup: true
      });
    }

    // Generate OTP for login
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP (for login, we store user info)
    otpStore.set(cleanPhone, {
      otp,
      phoneNumber: cleanPhone,
      email: user.email,
      name: user.name,
      expiresAt,
      verified: false
    });

    // Send OTP via SMS
    const sent = await sendOTPViaSMS(cleanPhone, otp);

    if (!sent && twilioClient) {
      return res.status(500).json({ 
        error: 'Failed to send OTP. Please try again.' 
      });
    }

    res.json({ 
      success: true,
      message: twilioClient 
        ? 'OTP sent to your phone number' 
        : `OTP sent (Dev Mode): ${otp}`,
      devMode: !twilioClient,
      otp: !twilioClient ? otp : undefined,
      userName: user.name
    });

  } catch (error: any) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

// POST /api/auth/verify-login-otp - Verify OTP for login
router.post('/api/auth/verify-login-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    const otpRecord = otpStore.get(cleanPhone);

    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }

    // Check if OTP expired
    if (Date.now() > otpRecord.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Get user from database
    if (!isSupabaseConfigured) {
      return res.status(500).json({ 
        error: 'Database not configured. Please set up Supabase.' 
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', cleanPhone)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up OTP
    otpStore.delete(cleanPhone);

    // Create session
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        premiumUser: user.premium_user,
        onboardingComplete: user.onboarding_complete,
        persona: user.persona
      },
      sessionToken
    });

  } catch (error: any) {
    console.error('[Verify Login OTP Error]', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// GET /api/auth/check - Check if user is authenticated (stub for now)
router.get('/api/auth/check', async (req: Request, res: Response) => {
  // In production, verify JWT token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ authenticated: false });
  }

  // For now, just return authenticated if header exists
  res.json({ authenticated: true });
});

// POST /api/auth/logout - Logout user
router.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    // Clear session
    if ((req as any).session) {
      (req as any).session = null;
    }
    
    console.log('[Auth] User logged out');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;


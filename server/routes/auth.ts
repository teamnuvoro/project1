import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';
import twilio from 'twilio';
import crypto from 'crypto';

const router = Router();

// Twilio Configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Secret for signing OTPs (use a stable secret in production)
const OTP_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret-key-do-not-use-in-prod';

// Test/Dummy credentials for third-party testing (Razorpay, etc.)
// Set these in environment variables for testing
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || '+919999999999'; // Default test number
const TEST_OTP = process.env.TEST_OTP || '123456'; // Default test OTP
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@riya.ai'; // Default test email
const TEST_NAME = process.env.TEST_NAME || 'Test User'; // Default test name

// Check if a phone number is a test number
function isTestPhoneNumber(phoneNumber: string): boolean {
  const cleanPhone = phoneNumber.replace(/\s+/g, '');
  return cleanPhone === TEST_PHONE_NUMBER || cleanPhone === TEST_PHONE_NUMBER.replace('+', '');
}

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sign OTP details to create a hash
function signOTP(phoneNumber: string, otp: string, expiresAt: number): string {
    const data = `${phoneNumber}.${otp}.${expiresAt}`;
    return crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
}

// Verify OTP hash
function verifyOTPHash(phoneNumber: string, otp: string, expiresAt: number, hash: string): boolean {
    if (Date.now() > expiresAt) return false;
    const expectedHash = signOTP(phoneNumber, otp, expiresAt);
    return expectedHash === hash;
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

        // Check if this is a test phone number
        const isTestNumber = isTestPhoneNumber(cleanPhone);
        
        // Check if user already exists (skip in dev mode or for test numbers)
        const skipDuplicateCheck = (process.env.NODE_ENV === 'development' && process.env.SKIP_DUPLICATE_CHECK === 'true') || isTestNumber;

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
        
        // For test numbers, allow multiple signups (useful for testing)
        if (isTestNumber) {
            console.log('[TEST MODE] Test number detected - allowing signup even if user exists');
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        console.log('[SEND OTP] Generated OTP:', otp, 'for phone:', cleanPhone);

        // Generate Hash for Stateless Verification
        const hash = signOTP(cleanPhone, otp, expiresAt);

        // Send OTP via SMS
        const sent = await sendOTPViaSMS(cleanPhone, otp);

        if (!sent && twilioClient) {
            return res.status(500).json({
                error: 'Failed to send OTP. Please try again.'
            });
        }

        res.json({
            success: true,
            message: isTestNumber 
                ? `Test OTP: ${TEST_OTP} (Test number - no SMS sent)`
                : twilioClient
                    ? 'OTP sent to your phone number'
                    : `OTP sent (Dev Mode): ${otp}`,
            devMode: !twilioClient || isTestNumber,
            isTestNumber: isTestNumber,
            otp: (!twilioClient || isTestNumber) ? otp : undefined, // Show OTP in dev mode or for test numbers
            hash,
            expiresAt
        });

    } catch (error: any) {
        console.error('[Send OTP Error]', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// POST /api/auth/verify-otp - Verify OTP and create user
router.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp, hash, expiresAt, name, email } = req.body;

        if (!phoneNumber || !otp || !hash || !expiresAt || !name || !email) {
            return res.status(400).json({ error: 'Missing required fields (phone, otp, hash, expiresAt, name, email)' });
        }

        const cleanPhone = phoneNumber.replace(/\s+/g, '');

        // Check if this is a test number - allow test OTP to bypass hash verification
        const isTestNumber = isTestPhoneNumber(cleanPhone);
        let isValid = false;

        if (isTestNumber && otp === TEST_OTP) {
            // Test number with test OTP - always allow (bypass hash check)
            console.log('[TEST MODE] Test number detected for signup, accepting test OTP without hash verification');
            isValid = true;
        } else {
            // Normal verification - check hash
            isValid = verifyOTPHash(cleanPhone, otp, Number(expiresAt), hash);
        }

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
        }

        // Create user in Supabase
        if (!isSupabaseConfigured) {
            return res.status(500).json({
                error: 'Database not configured. Please set up Supabase.'
            });
        }

        // Set premium fields - all new users get premium automatically
        // Set both old schema (premium_user) and new schema (subscription_tier) if it exists
        const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                name: name,
                email: email,
                phone_number: cleanPhone,
                gender: 'prefer_not_to_say',
                persona: 'sweet_supportive', // Default to Riya
                premium_user: true, // All new users are premium
                subscription_plan: 'daily',
                subscription_expiry: oneYearFromNow, // Old schema - 1 year expiry
                subscription_tier: 'daily', // New schema - will be ignored if column doesn't exist
                subscription_start_time: new Date().toISOString(), // New schema
                subscription_end_time: oneYearFromNow, // New schema - 1 year expiry
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

        // Check if this is a test phone number
        const isTestNumber = isTestPhoneNumber(cleanPhone);
        
        // Generate OTP (use fixed test OTP for test numbers)
        const otp = isTestNumber ? TEST_OTP : generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        if (isTestNumber) {
          console.log('[TEST MODE] Using test OTP for login with test phone number:', cleanPhone);
          console.log('[TEST MODE] Test OTP:', TEST_OTP);
        }

        // Generate Hash
        const hash = signOTP(cleanPhone, otp, expiresAt);

        // Send OTP via SMS (skip for test numbers, just log it)
        let sent = true;
        if (isTestNumber) {
          console.log(`[TEST MODE] OTP for test number ${cleanPhone}: ${TEST_OTP}`);
          console.log('[TEST MODE] No SMS sent - this is a test number');
        } else {
          sent = await sendOTPViaSMS(cleanPhone, otp);
        }

        if (!sent && twilioClient) {
            return res.status(500).json({
                error: 'Failed to send OTP. Please try again.'
            });
        }

        res.json({
            success: true,
            message: isTestNumber 
                ? `Test OTP: ${TEST_OTP} (Test number - no SMS sent)`
                : twilioClient
                    ? 'OTP sent to your phone number'
                    : `OTP sent (Dev Mode): ${otp}`,
            devMode: !twilioClient || isTestNumber,
            isTestNumber: isTestNumber,
            otp: (!twilioClient || isTestNumber) ? otp : undefined,
            userName: user.name,
            hash,
            expiresAt
        });

    } catch (error: any) {
        console.error('[Login Error]', error);
        res.status(500).json({ error: 'Failed to initiate login' });
    }
});

// POST /api/auth/verify-login-otp - Verify OTP for login
router.post('/api/auth/verify-login-otp', async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp, hash, expiresAt } = req.body;

        if (!phoneNumber || !otp || !hash || !expiresAt) {
            return res.status(400).json({ error: 'Missing required fields (phone, otp, hash, expiresAt)' });
        }

        const cleanPhone = phoneNumber.replace(/\s+/g, '');

        // Check if this is a test number - allow test OTP to bypass hash verification
        const isTestNumber = isTestPhoneNumber(cleanPhone);
        let isValid = false;

        if (isTestNumber && otp === TEST_OTP) {
            // Test number with test OTP - always allow (bypass hash check)
            console.log('[TEST MODE] Test number detected for login, accepting test OTP without hash verification');
            isValid = true;
        } else {
            // Normal verification - check hash
            isValid = verifyOTPHash(cleanPhone, otp, Number(expiresAt), hash);
        }

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
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

// ============================================
// 🔓 BACKDOOR LOGIN - FOR TESTING ONLY
// ============================================
// POST /api/auth/backdoor-login - Direct login with phone + password (testing only)
router.post('/api/auth/backdoor-login', async (req: Request, res: Response) => {
    try {
        const { phoneNumber, password } = req.body;

        // Backdoor credentials
        const BACKDOOR_PHONE = '8828447880';
        const BACKDOOR_PASSWORD = '0000';

        // Clean phone number (remove spaces, handle with/without country code)
        const cleanPhone = phoneNumber?.replace(/\s+/g, '').replace(/^\+91/, '').replace(/^91/, '');
        const cleanBackdoorPhone = BACKDOOR_PHONE.replace(/\s+/g, '');

        // Verify backdoor credentials
        if (cleanPhone !== cleanBackdoorPhone || password !== BACKDOOR_PASSWORD) {
            console.log('[BACKDOOR] Invalid credentials attempted:', { phone: cleanPhone, password: password ? '***' : 'missing' });
            return res.status(401).json({ 
                error: 'Invalid credentials',
                message: 'Backdoor access denied'
            });
        }

        console.log('[BACKDOOR] ✅ Backdoor login attempt for phone:', cleanPhone);

        // Get user from database
        if (!isSupabaseConfigured) {
            return res.status(500).json({
                error: 'Database not configured. Please set up Supabase.'
            });
        }

        // Try to find user with this phone number (with or without country code)
        // Try different phone number formats
        let user = null;
        let userError: any = null;
        
        // Try with +91 prefix first
        let { data: user1, error: err1 } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', `+91${cleanPhone}`)
            .maybeSingle();
        
        if (user1) {
            user = user1;
        } else {
            // Try with 91 prefix
            let { data: user2, error: err2 } = await supabase
                .from('users')
                .select('*')
                .eq('phone_number', `91${cleanPhone}`)
                .maybeSingle();
            
            if (user2) {
                user = user2;
            } else {
                // Try without prefix
                let { data: user3, error: err3 } = await supabase
                    .from('users')
                    .select('*')
                    .eq('phone_number', cleanPhone)
                    .maybeSingle();
                
                if (user3) {
                    user = user3;
                } else {
                    userError = { code: 'PGRST116', message: 'User not found' };
                }
            }
        }

        // If user doesn't exist, create it automatically for backdoor access
        if (userError || !user) {
            console.log('[BACKDOOR] User not found, creating backdoor user automatically...');
            
            const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            const backdoorPhone = `+91${cleanPhone}`;
            const backdoorEmail = `backdoor-${cleanPhone}@test.com`;
            
            // Try to insert, but if email exists, just update the existing user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    name: 'Backdoor Test User',
                    email: backdoorEmail,
                    phone_number: backdoorPhone,
                    gender: 'prefer_not_to_say',
                    persona: 'sweet_supportive', // Default to Riya
                    premium_user: true, // Backdoor users get premium
                    subscription_plan: 'daily',
                    subscription_expiry: oneYearFromNow,
                    subscription_tier: 'daily',
                    subscription_start_time: new Date().toISOString(),
                    subscription_end_time: oneYearFromNow,
                    locale: 'hi-IN',
                    onboarding_complete: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                // If user already exists (email conflict), try to find and update them
                if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
                    console.log('[BACKDOOR] User already exists, fetching and updating...');
                    const { data: existingUser, error: fetchError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', backdoorEmail)
                        .maybeSingle();
                    
                    if (existingUser) {
                        user = existingUser;
                        console.log('[BACKDOOR] ✅ Found existing user:', user.id, user.name);
                        
                        // Update to ensure premium status
                        await supabase
                            .from('users')
                            .update({
                                premium_user: true,
                                subscription_tier: 'daily',
                                subscription_plan: 'daily',
                                phone_number: backdoorPhone,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', user.id);
                    } else if (fetchError) {
                        console.error('[BACKDOOR] Error fetching existing user:', fetchError);
                        return res.status(500).json({ 
                            error: 'Failed to find or create backdoor user',
                            details: fetchError.message
                        });
                    }
                } else {
                    console.error('[BACKDOOR] Error creating user:', createError);
                    return res.status(500).json({ 
                        error: 'Failed to create backdoor user',
                        details: createError.message,
                        code: createError.code
                    });
                }
            } else if (newUser) {
                user = newUser;
                console.log('[BACKDOOR] ✅ Created new backdoor user:', user.id, user.name);

                // Initialize usage stats for new user (ignore errors if it already exists)
                await supabase
                    .from('usage_stats')
                    .insert({
                        user_id: user.id,
                        total_messages: 0,
                        total_call_seconds: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
            }
        } else {
            console.log('[BACKDOOR] ✅ User found:', user.id, user.name);
            
            // Ensure premium status is set for backdoor users
            if (!user.premium_user) {
                console.log('[BACKDOOR] Updating user to premium status...');
                await supabase
                    .from('users')
                    .update({
                        premium_user: true,
                        subscription_tier: 'daily',
                        subscription_plan: 'daily',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                user.premium_user = true;
                user.subscription_tier = 'daily';
                user.subscription_plan = 'daily';
            }
        }

        // Create session
        const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

        // Update last login time
        await supabase
            .from('users')
            .update({ 
                last_login_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        res.json({
            success: true,
            message: 'Backdoor login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phone_number,
                premiumUser: user.premium_user,
                onboardingComplete: user.onboarding_complete,
                persona: user.persona
            },
            sessionToken,
            isBackdoor: true
        });

    } catch (error: any) {
        console.error('[BACKDOOR] Error:', error);
        console.error('[BACKDOOR] Error stack:', error.stack);
        console.error('[BACKDOOR] Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        res.status(500).json({ 
            error: 'Backdoor login failed', 
            details: error.message,
            code: error.code,
            hint: process.env.NODE_ENV === 'development' ? error.hint : undefined
        });
    }
});

export default router;


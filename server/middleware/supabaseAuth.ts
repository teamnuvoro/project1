/**
 * Supabase JWT Auth Middleware
 *
 * - Extracts Bearer token from Authorization header
 * - Verifies token with Supabase Auth (getUser)
 * - Sets req.session.userId from JWT; auto-creates public.users row if missing
 * - Never trusts email/user from request body — only from Supabase session
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase as serverSupabase, isSupabaseConfigured } from '../supabase';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const authClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/health/detailed',
  '/api/payment/webhook',
  '/api/auth/check',
]);

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path) || path.startsWith('/api/health');
}

/**
 * Ensure a row exists in public.users for this auth user (idempotent).
 * Uses service-role Supabase client.
 */
async function ensureUserInDb(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): Promise<void> {
  if (!isSupabaseConfigured || !serverSupabase) return;

  const { data: existing } = await serverSupabase
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) return;

  const email = authUser.email ?? '';
  const name = (authUser.user_metadata?.name as string) || (email ? email.split('@')[0] || 'User' : 'User');

  await serverSupabase.from('users').insert({
    id: authUser.id,
    email: email || `${authUser.id.slice(0, 8)}@temp.riya.ai`,
    name,
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
  });

  await serverSupabase.from('usage_stats').insert({
    user_id: authUser.id,
    total_messages: 0,
    total_call_seconds: 0,
    updated_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error && error.code !== '23505') console.warn('[ensureUserInDb] usage_stats insert:', error.message);
  });

  console.log('[Auth] Auto-created user profile:', authUser.id);
}

/**
 * Middleware: verify Supabase JWT and set req.session.userId.
 * Public paths are skipped. If Authorization Bearer is present, it is verified;
 * if valid, user is ensured in DB and req.session.userId is set.
 */
export async function supabaseAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  (req as any).session = (req as any).session || {};

  if (isPublicPath(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  if (!authClient) {
    return next();
  }

  try {
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) {
      if (IS_PRODUCTION) {
        res.status(401).json({ error: 'Invalid or expired session', code: 'UNAUTHORIZED' });
        return;
      }
      return next();
    }

    (req as any).session.userId = user.id;
    await ensureUserInDb(user);
  } catch (e) {
    if (IS_PRODUCTION) {
      res.status(401).json({ error: 'Invalid session', code: 'UNAUTHORIZED' });
      return;
    }
    return next();
  }

  next();
}

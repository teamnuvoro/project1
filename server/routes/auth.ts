/**
 * Auth routes — Firebase Auth is the only auth.
 * Supabase is database only; backend verifies Firebase ID tokens and maps to users.firebase_uid.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// POST /api/auth/session — session already set by resolveFirebaseUser; return it + email
router.post('/api/auth/session', async (req: Request, res: Response) => {
  try {
    const fb = (req as any).firebaseUser as { uid: string; email?: string } | undefined;
    if (!fb?.uid) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const session = (req as any).session as { userId: string; firebaseUid: string } | undefined;
    if (!session?.userId) {
      return res.status(500).json({ error: 'Session not resolved' });
    }
    return res.json({
      ok: true,
      firebaseUid: session.firebaseUid,
      userId: session.userId,
      email: fb.email,
    });
  } catch (e: any) {
    console.error('[Auth] /api/auth/session error:', e);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/auth/check — returns 401 if no valid Firebase token
router.get('/api/auth/check', async (req: Request, res: Response) => {
  const fb = (req as any).firebaseUser as { uid: string; email?: string } | undefined;
  if (!fb?.uid) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, firebaseUid: fb.uid, email: fb.email });
});

// POST /api/auth/logout — client-only for Firebase; server returns ok
router.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    console.log('[Auth] Logout requested');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;

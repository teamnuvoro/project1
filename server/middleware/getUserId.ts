// Middleware to extract user ID from session (set by resolveFirebaseUser) or body/query.
// Auth is Firebase-only; session.userId is set after Firebase JWT verification.

import { Request } from 'express';

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  if ((req as any).session?.userId) {
    return (req as any).session.userId;
  }
  if (req.body?.userId) {
    return req.body.userId;
  }
  if (req.query?.userId) {
    return req.query.userId as string;
  }
  return null;
}



/**
 * Resolves Firebase UID to internal user id and sets req.session for downstream routes.
 * Must run after requireFirebaseAuth (so req.firebaseUser is set).
 * All protected /api routes can then use (req as any).session.userId.
 */

import { Request, Response, NextFunction } from "express";
import { getOrCreateUserIdForFirebaseUid } from "../utils/firebaseUser";

export async function resolveFirebaseUser(req: Request, res: Response, next: NextFunction) {
  const fb = (req as any).firebaseUser as { uid: string; email?: string; name?: string } | undefined;
  if (!fb?.uid) {
    return next();
  }

  try {
    const phoneNumber = (req as any).body?.phoneNumber;
    const { userId, firebaseUid } = await getOrCreateUserIdForFirebaseUid({
      firebaseUid: fb.uid,
      email: fb.email,
      name: fb.name,
      phoneNumber: typeof phoneNumber === "string" ? phoneNumber : undefined,
    });
    (req as any).session = {
      userId,
      firebaseUid,
    };
    return next();
  } catch (e: any) {
    const message = e?.message ?? "Failed to resolve user";
    console.error("[resolveFirebaseUser]", message, e);
    // Fallback: set session with Firebase UID so auth/session returns 200 and app can load.
    // Downstream routes (usage, chat) may return defaults if this userId isn't in Supabase.
    (req as any).session = {
      userId: fb.uid,
      firebaseUid: fb.uid,
    };
    return next();
  }
}

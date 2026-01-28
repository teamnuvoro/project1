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
    const { userId, firebaseUid } = await getOrCreateUserIdForFirebaseUid({
      firebaseUid: fb.uid,
      email: fb.email,
      name: fb.name,
    });
    (req as any).session = {
      userId,
      firebaseUid,
    };
    return next();
  } catch (e: any) {
    const message = e?.message ?? "Failed to resolve user";
    console.error("[resolveFirebaseUser]", message, e);
    return res.status(500).json({
      error: "Failed to resolve user",
      details: process.env.NODE_ENV === "development" ? message : undefined,
    });
  }
}

import { Request, Response, NextFunction } from "express";
import { firebaseAdmin, isFirebaseConfigured } from "../lib/firebaseAdmin";

export interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __firebaseAuthTypes: unknown;
}

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  if (!isFirebaseConfigured) {
    return res.status(503).json({ error: "Firebase Auth not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    (req as any).firebaseUser = {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      name: (decoded as { name?: string }).name,
    } satisfies FirebaseUser;
    (req as any).firebaseIdToken = token;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}


import crypto from "crypto";
import { supabase, isSupabaseConfigured } from "../supabase";

/**
 * Map Firebase UID -> internal users.id (uuid) row.
 * Creates a user row on first login (idempotent).
 *
 * Canonical auth identity is firebase_uid; internal uuid is used for existing FK relations.
 */
export async function getOrCreateUserIdForFirebaseUid(params: {
  firebaseUid: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
}): Promise<{ userId: string; firebaseUid: string }> {
  const { firebaseUid, email, name, phoneNumber } = params;

  if (!isSupabaseConfigured) {
    // Dev fallback: use firebaseUid as stable identifier, but keep shape
    return { userId: firebaseUid, firebaseUid };
  }

  const { data: existing, error: existingErr } = await supabase
    .from("users")
    .select("id,firebase_uid")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle();

  if (existingErr && existingErr.code !== "PGRST116") {
    console.error("[firebaseUser] select error:", existingErr.code, existingErr.message, existingErr.details);
    if (existingErr.message?.includes("firebase_uid") || existingErr.message?.includes("column")) {
      throw new Error(
        "users table missing firebase_uid. Run migration: supabase/migrations/20260121_add_firebase_uid.sql"
      );
    }
    throw new Error(existingErr.message);
  }

  if (existing?.id) {
    if (phoneNumber?.trim()) {
      await supabase
        .from("users")
        .update({ phone_number: phoneNumber.trim(), updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return { userId: existing.id, firebaseUid };
  }

  const newId = crypto.randomUUID();
  const insertPayload: Record<string, any> = {
    id: newId,
    firebase_uid: firebaseUid,
    email: email || `${firebaseUid}@temp.riya.ai`,
    name: name || (email ? email.split("@")[0] : "User"),
    ...(phoneNumber?.trim() ? { phone_number: phoneNumber.trim() } : {}),
    gender: "prefer_not_to_say",
    premium_user: false,
    persona: "sweet_supportive",
    locale: "en-US",
    onboarding_complete: false,
    subscription_tier: "free",
    subscription_plan: null,
    subscription_expiry: null,
    subscription_start_time: null,
    subscription_end_time: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let insertError: any = null;
  let lastPayload = insertPayload;
  const { error: insertErr } = await supabase.from("users").insert(insertPayload);
  insertError = insertErr;

  if (insertErr?.code === "23505") {
    // Duplicate key: try refetch by firebase_uid first (race: another request created the user).
    const { data: existingAfterConflict, error: refetchErr } = await supabase
      .from("users")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();
    if (!refetchErr && existingAfterConflict?.id) {
      const existingId = existingAfterConflict.id;
      await supabase
        .from("usage_stats")
        .insert({
          user_id: existingId,
          total_messages: 0,
          total_call_seconds: 0,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error && error.code !== "23505") console.warn("[firebaseUser] usage_stats insert failed:", error.message);
        });
      return { userId: existingId, firebaseUid };
    }
    // Duplicate email (users_email_unique): same email already exists for another account. Retry with unique email.
    const isEmailConflict =
      insertErr.message?.includes("users_email_unique") ||
      insertErr.message?.includes("email") ||
      (insertErr.details as string)?.includes("email");
    if (isEmailConflict) {
      const uniqueEmail = `${firebaseUid}@temp.riya.ai`;
      const retryPayload = { ...lastPayload, email: uniqueEmail };
      const { error: retryErr } = await supabase.from("users").insert(retryPayload);
      if (!retryErr) {
        insertError = null;
        lastPayload = retryPayload;
      } else if (retryErr.code === "23505") {
        // Race: refetch by firebase_uid one more time
        const { data: refetch2 } = await supabase
          .from("users")
          .select("id")
          .eq("firebase_uid", firebaseUid)
          .maybeSingle();
        if (refetch2?.id) {
          return { userId: refetch2.id, firebaseUid };
        }
        insertError = retryErr;
      } else {
        insertError = retryErr;
      }
    } else {
      insertError = insertErr;
    }
  }

  if (insertError) {
    console.error("[firebaseUser] insert error:", insertError.code, insertError.message, insertError.details);
    if (insertError.message?.includes("firebase_uid") || insertError.message?.includes("column")) {
      throw new Error(
        "users table missing firebase_uid or required column. Run migration: supabase/migrations/20260121_add_firebase_uid.sql"
      );
    }
    throw new Error(insertError.message);
  }

  // Initialize usage stats (best effort)
  await supabase
    .from("usage_stats")
    .insert({
      user_id: newId,
      total_messages: 0,
      total_call_seconds: 0,
      updated_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error && error.code !== "23505") {
        console.warn("[firebaseUser] usage_stats insert failed:", error.message);
      }
    });

  return { userId: newId, firebaseUid };
}


# Authentication — Firebase Auth (Supabase as DB only)

Auth uses **Firebase Auth only**. Supabase is used as the database; Supabase Email OTP is not used.

## Architecture

- **Frontend**: Firebase Auth (email/password) → ID token in `Authorization: Bearer <id_token>`.
- **Backend**: Verifies Firebase JWT with Firebase Admin; maps `firebase_uid` → internal `users.id` (uuid); sets `req.session.userId` and `req.session.firebaseUid` for all protected `/api` routes.
- **Supabase**: Database only; can trust Firebase JWTs via Third-Party Auth so RLS `auth.uid()` resolves to Firebase UID when needed.
- **Payments**: Use `session.userId` (internal uuid) or `firebase_uid` in metadata; no Supabase auth dependency.

## Flow

1. User signs up or logs in on `/signup` or `/login` with email + password via Firebase (`createUserWithEmailAndPassword` / `signInWithEmailAndPassword`).
2. Frontend gets Firebase ID token: `userCred.user.getIdToken()` and sends it to `POST /api/auth/session` with `Authorization: Bearer <id_token>`.
3. Backend verifies the token, calls `getOrCreateUserIdForFirebaseUid`, returns `{ userId, firebaseUid, email }`. All subsequent requests send the same Bearer token.
4. On every protected request, `requireFirebaseAuth` verifies the token and sets `req.firebaseUser`; `resolveFirebaseUser` resolves to internal user and sets `req.session = { userId, firebaseUid }`. Routes use `(req as any).session.userId`.

## Env vars and server credentials (auth)

**Client (Vite) — required for login/signup**

Add these to `.env` at the **project root** (same folder as `package.json`). Vite only exposes variables that start with `VITE_`.

- `VITE_FIREBASE_API_KEY` — Web API key (not the service account key)
- `VITE_FIREBASE_AUTH_DOMAIN` — e.g. `riya-auth-5e0f6.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID` — e.g. `riya-auth-5e0f6`

**Where to get the Web API key**

1. Open [Firebase Console](https://console.firebase.google.com/) → your project **riya-auth-5e0f6**.
2. Go to **Project settings** (gear) → **General**.
3. Under **Your apps**, if you don’t have a Web app, click **Add app** → **Web** (</>), register the app, and copy the config.
4. Copy `apiKey`, `authDomain`, and `projectId` from the config into your `.env`:

```env
VITE_FIREBASE_API_KEY=AIza...your-api-key...
VITE_FIREBASE_AUTH_DOMAIN=riya-auth-5e0f6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=riya-auth-5e0f6
```

Restart the Vite dev server after changing `.env`.

**Server — use one of these:**

**Option A — JSON file (recommended for local dev)**  
Save your Firebase service account JSON as:

- `server/firebase-service-account.json`

The file is in `.gitignore`. No env vars needed for server Firebase auth.  
Optional override path: `FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/file.json`

**Option B — Env vars**  
Set in `.env`:

- `FIREBASE_PROJECT_ID` — e.g. `riya-auth-5e0f6`
- `FIREBASE_CLIENT_EMAIL` — e.g. `firebase-adminsdk-xxxxx@riya-auth-5e0f6.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY` — full private key string; keep `\n` for newlines and wrap in double quotes

Get client config from Firebase Console → Project settings → General.  
Get server JSON from Project settings → Service accounts → Generate new private key.

## Rules

- Do **not** use `supabase.auth.*` or call `/auth/v1/*`.
- Firebase Auth is the single source of truth; `firebase_uid` is the canonical user identifier; internal `userId` (uuid) is for DB FKs and payments.

## Logout

- Frontend: `signOut(auth)`. Backend `POST /api/auth/logout` returns OK; no server-side session store.

## Testing

- User can sign up and log in via Firebase.
- Backend accepts Firebase JWT and returns/create user.
- All protected routes receive `session.userId` from middleware.
- No Supabase auth or OTP flows.

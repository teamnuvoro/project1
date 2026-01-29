# Environment Variables for Render

Set these in **Render Dashboard → Your Service → Environment**.

---

## Required for auth and core app

### Firebase (auth)

| Variable | Where to get it | Notes |
|----------|-----------------|--------|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project settings | e.g. `riya-auth-5e0f6` |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON (Project settings → Service accounts → Generate key) | e.g. `firebase-adminsdk-xxx@riya-auth-5e0f6.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Same JSON, `private_key` field | Paste the full key; use `\n` for newlines. In Render, paste as-is and ensure multiline is preserved, or use **Option A** below. |

**Option A (recommended on Render):** Put the full service account JSON in a **Secret File**.  
- Render: Environment → Add Secret File → mount at `server/firebase-service-account.json`.  
- Then you do **not** need `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` (the app reads from the file).

### Supabase (database)

| Variable | Where to get it |
|----------|-----------------|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → Project API keys → `service_role` (secret) |

### Client (Vite) — must be set at build time

These are baked into the frontend at build time. Add them in **Render Environment** so they exist when `npm run build` runs.

| Variable | Example / source |
|----------|-------------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web app config → `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `riya-auth-5e0f6.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `riya-auth-5e0f6` |

Optional (app has fallbacks in code):  
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`).

### Chat (Groq)

| Variable | Where to get it |
|----------|-----------------|
| `GROQ_API_KEY` | groq.com → API keys |

---

## Required for production URL

| Variable | Value on Render |
|----------|------------------|
| `BASE_URL` | Your Render service URL, e.g. `https://your-app-name.onrender.com` |

Use this for redirects and payment return URLs.

---

## Optional: payments (Dodo)

If you use Dodo payments in production:

| Variable | Notes |
|----------|--------|
| `DODO_PAYMENTS_API_KEY` | Dodo dashboard |
| `DODO_WEBHOOK_SECRET` | For webhook signature verification |
| `DODO_PRODUCT_ID_MONTHLY` | Your monthly product ID |
| `DODO_ENV` | `test_mode` or `live_mode` |
| `ENABLE_PAYMENTS_IN_DEV` | `true` only if you want payments in non-production |

Set `BASE_URL` and (for webhooks) `DODO_WEBHOOK_URL` (e.g. `https://your-app-name.onrender.com/api/payment/webhook`) if you use payments.

---

## Optional: other features

| Variable | Use |
|----------|-----|
| `VITE_API_URL` | Override API base URL (default: same origin) |
| `VITE_VAPI_PUBLIC_KEY` | Voice (Vapi) |
| `VAPI_PRIVATE_KEY` | Server-side Vapi |
| `VITE_AMPLITUDE_API_KEY` | Analytics |
| `DEEPGRAM_API_KEY` | Transcription |
| `BOLNA_API_KEY`, `BOLNA_AGENT_ID` | Voice (Bolna) |
| `VITE_DISABLE_AUTH` | `true` to disable auth (dev only) |

---

## Checklist for Render

1. **Auth**
   - [ ] Either set `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`, **or** add Secret File `server/firebase-service-account.json`.
   - [ ] Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` (so the client can log in).

2. **Database**
   - [ ] `SUPABASE_URL`
   - [ ] `SUPABASE_SERVICE_ROLE_KEY`

3. **App**
   - [ ] `GROQ_API_KEY` (for chat)
   - [ ] `BASE_URL` = your Render URL (e.g. `https://your-app.onrender.com`)

4. **Build**
   - [ ] Ensure `VITE_*` variables are in Environment so they exist during **Build** (Render runs `npm run build` with these).

---

## Notes

- **PORT**: Render sets `PORT` automatically; the app uses it.
- **NODE_ENV**: Render sets this for production builds.
- **Multiline (FIREBASE_PRIVATE_KEY):** If you paste the key with real newlines, Render usually keeps them. If you use `\n`, the server code replaces `\\n` with newlines. Prefer Secret File on Render to avoid multiline env issues.
- **CORS**: The server allows `process.env.NGROK_URL` and common origins; for a custom domain, add it to the CORS list in `server/index.ts` if needed.

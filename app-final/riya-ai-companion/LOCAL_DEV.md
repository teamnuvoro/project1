# Local Development Setup

1. **Create your env file**
   - Copy `.env.example` → `.env`.
   - Leave `USE_IN_MEMORY_STORAGE=true` if you don’t have Postgres handy. Switch it to `false` and provide a real `DATABASE_URL` when you’re ready to use Neon/Supabase/etc.
   - `DISABLE_AUTH=true` (plus `VITE_DISABLE_AUTH=true`) lets you skip the OTP flow while email delivery is being wired up. Flip both to `false` once authentication should be enforced again.
   - Add your Cashfree credentials (`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`) plus `CASHFREE_ENV` (`TEST`/`PRODUCTION`), `CASHFREE_WEBHOOK_URL` (ngrok URL + `/api/cashfree/webhook`), and matching `VITE_CASHFREE_MODE` (`sandbox`/`production`) so the checkout widget hits the same environment as the server.
   - Provide SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `SMTP_FROM/SMTP_SECURE`) when you want OTP emails to actually send. If these are missing we fall back to the Replit Gmail connector (when available) or log the OTP to the console in dev.
   - Leave `DISABLE_AUTH=true` / `VITE_DISABLE_AUTH=true` to skip the OTP flow locally; set both to `false` once SMTP or Replit email is configured so teammates experience the real login.
   - Optionally set the Replit Gmail connector vars if you want real OTP emails; otherwise OTPs are printed to the server console.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the fullstack dev server**
   ```bash
   npm run dev
   ```
   This starts the Express API and Vite dev server together on `http://localhost:3000`.

4. **Authentication modes**
   - By default (`DISABLE_AUTH=true` / `VITE_DISABLE_AUTH=true`) you’re auto-signed-in as the local dev account. Head straight to `/` and the chat loads without OTP.
   - To exercise the OTP/email flow, set both flags to `false`, restart `npm run dev`, and use the login page. Until Gmail is wired up, grab the OTP from the server log lines that start with `[DEV] Send this OTP manually`.

5. **Cashfree callbacks**
   - The default callback is `http://localhost:3000/payment/callback`. Update `REPLIT_DEV_DOMAIN` if you expose a tunnel (e.g., ngrok) to receive webhooks.
   - When testing Cashfree webhooks, run `ngrok http 3000` (or whichever port your server listens on) and set `CASHFREE_WEBHOOK_URL` to the tunnel URL plus `/api/cashfree/webhook`. Add the same URL inside the Cashfree Dashboard > Developers > Webhooks.

6. **Database**
   - The default `.env` uses the in-memory store so you can try the product without a database. When you’re ready for Postgres (Neon/Supabase/local), set `USE_IN_MEMORY_STORAGE=false`, update `DATABASE_URL`, then run `npm run db:push` if you need to sync schema changes.

That’s it—you’re ready to hack locally. Let me know if you need mock services or seed data.

## Email / OTP setup (when you're ready)

- Keep `DISABLE_AUTH=true` / `VITE_DISABLE_AUTH=true` until your email provider is configured so teammates can still access the UI.
- When you want real OTP emails, set both flags to `false`, restart the dev server, and configure one of:
  - Replit Gmail connector (set `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY` or `WEB_REPL_RENEWAL`).
  - Any other SMTP provider by swapping out `sendOTPEmail` (the code path logs helpful warnings if no connector is available).
- Even with auth enabled, OTP codes are logged with `[DEV] Send this OTP manually` so you can test before the mailer is live.


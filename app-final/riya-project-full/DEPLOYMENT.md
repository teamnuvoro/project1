# Riya AI Companion - Deployment Guide

## Environment Variables Required for Production

### Supabase Configuration (REQUIRED)

Get these from your Supabase project dashboard:

```
SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get these keys:**

1. Go to https://supabase.com/dashboard/project/xgraxcgavqeyqfwimbwt
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL` & `VITE_SUPABASE_URL`
   - **Service Role Secret** → `SUPABASE_SERVICE_ROLE_KEY`
   - **Anon Public** → `VITE_SUPABASE_ANON_KEY`

### Platform-Specific Setup

#### Vercel Deployment

1. Push code to GitHub
2. Go to https://vercel.com → Import your repo
3. In **Environment Variables**, add all 4 Supabase variables above
4. Click Deploy

#### Netlify Deployment

1. Push code to GitHub
2. Go to https://netlify.com → New site from Git
3. Choose your repo
4. In **Build settings** → **Environment**:
   - Add all 4 Supabase variables
5. Deploy

#### Lovable Deployment

1. Export/import project to Lovable
2. In Lovable **Settings** → **Environment Variables**:
   - Add all 4 Supabase variables
3. Click Publish

#### Replit Deployment

1. Fork/import project to Replit
2. In **Secrets** tab, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Click Publish

### Development vs Production

**Development (local):**
- Supabase keys are optional
- App uses mock data if keys missing
- Perfect for testing without a database

**Production (deployed):**
- ALL 4 Supabase keys are REQUIRED
- App will crash on startup if keys missing
- Database must be configured in Supabase

## Database Setup

### For New Supabase Projects

Run this in Supabase SQL Editor:

```sql
-- Copy entire contents of supabase-schema.sql
-- Paste into SQL Editor and run
```

### For Existing Supabase Projects

Run this in Supabase SQL Editor:

```sql
-- Copy entire contents of supabase-add-missing-columns.sql
-- Paste into SQL Editor and run
```

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is required in production"

**Solution:** You're deploying to production without setting the environment variable.

1. Get your Service Role Secret from Supabase
2. Add `SUPABASE_SERVICE_ROLE_KEY` to your deployment platform's environment variables
3. Redeploy

### Error: "VITE_SUPABASE_ANON_KEY is required in production"

**Solution:** Frontend can't connect to Supabase.

1. Get your Anon Key from Supabase
2. Add `VITE_SUPABASE_ANON_KEY` to environment variables
3. Rebuild and redeploy

### App works locally but crashes after deploy

**Solution:** Environment variables not set in deployment platform.

1. Go to your deployment platform (Vercel/Netlify/Lovable/Replit)
2. Add all 4 Supabase variables to environment settings
3. Redeploy

### "Could not find the table" error from Supabase

**Solution:** SQL schema not run in Supabase.

1. Go to Supabase SQL Editor
2. Run `supabase-schema.sql` (for new projects) or `supabase-add-missing-columns.sql` (for existing)
3. Wait 1-2 minutes for schema cache to refresh
4. Redeploy your app

## Verification Checklist

- [ ] Supabase project created at https://supabase.com
- [ ] All 4 environment variables obtained from Supabase
- [ ] Environment variables added to deployment platform
- [ ] SQL schema executed in Supabase SQL Editor
- [ ] Application deployed successfully
- [ ] Can access chat at `/chat` endpoint
- [ ] Can select persona in `/personality-selection`

## Support

- Supabase Docs: https://supabase.com/docs
- Project Dashboard: https://supabase.com/dashboard/project/xgraxcgavqeyqfwimbwt
- GitHub Issues: Create an issue in your repo

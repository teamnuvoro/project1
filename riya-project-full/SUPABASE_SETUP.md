# Supabase Database Setup Guide

## Quick Setup

To connect your app to Supabase database, follow these steps:

### 1. Get Your Supabase Credentials

Go to your Supabase project dashboard: https://supabase.com/dashboard

#### A. Get Supabase URL and Keys
1. Go to **Project Settings** > **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

#### B. Get Database Connection String
1. Go to **Project Settings** > **Database**
2. Under **Connection string**, select **URI**
3. Copy the connection string → `DATABASE_URL`
4. Replace `[YOUR-PASSWORD]` with your actual database password

### 2. Update Your `.env` File

Open `riya-project-full/.env` and update these values:

```env
# Disable in-memory storage (already done)
# USE_IN_MEMORY_STORAGE=true  # DISABLED - Using Supabase database

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Your service role key

# Frontend Supabase Keys
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Your anon key

# Database Connection String
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

### 3. Verify Database Schema

Make sure your Supabase database has the required tables. Run the SQL script:

```bash
# Check if schema exists, or run:
# supabase-schema.sql (in the project root)
```

Required tables:
- `users`
- `sessions`
- `messages`
- `usage_stats`
- `call_sessions`

### 4. Restart Your Server

```bash
npm run dev
```

### 5. Verify Connection

Check the server console for:
```
[Supabase] ✅ Connected to Supabase database
[Server] ✅ Using Supabase as backend
```

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY not set"
- Add the service role key to your `.env` file
- Restart the server

### "DATABASE_URL environment variable is required"
- Add the database connection string to `.env`
- Make sure the password is correct

### Messages not saving
- Check if `USE_IN_MEMORY_STORAGE` is commented out (disabled)
- Verify Supabase credentials are correct
- Check server console for errors

## Current Status

✅ **In-Memory Storage**: DISABLED (using Supabase)
✅ **Analyze My Type Button**: Moved to navbar (top right)
✅ **Backend**: Configured to use Supabase database


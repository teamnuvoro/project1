# Riya AI Companion - Local Development Setup

Complete guide to run this project on your local machine, ensuring it works exactly like the Replit version.

---

## System Requirements

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | **20.x** (exactly v20) | `node --version` |
| npm | **10.x** | `npm --version` |
| Git | Any recent | `git --version` |

### Important: Use Node.js 20

This project is developed and tested with Node.js 20. Using a different version may cause issues.

**Install Node.js 20 using nvm:**
```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify versions
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

---

## Quick Start (5 Minutes)

```bash
# 1. Clone and enter directory
git clone <your-repo-url>
cd riya-ai-companion

# 2. Install dependencies (uses package-lock.json for exact versions)
npm ci

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your API keys (see below)
nano .env  # or use your preferred editor

# 5. Push database schema (if using new Supabase project)
npm run db:push

# 6. Start development server
npm run dev
```

Open http://localhost:5000 in your browser.

---

## Required Environment Variables

At minimum, you need these values in your `.env` file:

### 1. Supabase Database (Required)
Get from: [Supabase Dashboard](https://supabase.com) > Project Settings > Database

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

### 2. Supabase API Keys (Required)
Get from: [Supabase Dashboard](https://supabase.com) > Project Settings > API

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 3. Groq API Key (Required for Chat)
Get from: [Groq Console](https://console.groq.com/keys)

```env
GROQ_API_KEY=gsk_...
```

---

## All npm Commands

| Command | Description |
|---------|-------------|
| `npm ci` | Install exact dependency versions (recommended) |
| `npm install` | Install dependencies (may update versions) |
| `npm run dev` | Start development server on port 5000 |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to database |

---

## Project Structure

```
riya-ai-companion/
├── client/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   ├── pages/         # Page components
│   │   ├── App.tsx        # Main app
│   │   └── main.tsx       # Entry point
│   └── index.html         # HTML template
├── server/                # Backend (Express)
│   ├── routes/            # API routes
│   ├── services/          # External services
│   ├── index.ts           # Server entry
│   └── ...
├── shared/                # Shared types/schemas
├── supabase/              # Supabase Edge Functions
├── docs/                  # Documentation
├── package.json           # Dependencies
├── package-lock.json      # Locked versions
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
└── .env.example           # Environment template
```

---

## How the App Works

### Architecture
1. **Frontend**: React 18 with Vite, TailwindCSS, Radix UI components
2. **Backend**: Express.js server with REST API
3. **Database**: Supabase (PostgreSQL) via Drizzle ORM
4. **AI**: Groq (Llama 3.3 70B) for chat responses
5. **Voice**: Vapi AI or Sarvam AI (optional)

### Key URLs
| URL | Description |
|-----|-------------|
| http://localhost:5000 | Main application |
| http://localhost:5000/api/health | API health check |

---

## Differences from Replit

The code is designed to work identically on Replit and locally. The only differences:

1. **Replit plugins**: The vite.config.ts conditionally loads Replit-specific plugins only when `REPL_ID` is defined. These are:
   - `@replit/vite-plugin-cartographer` (dev tools)
   - `@replit/vite-plugin-dev-banner` (dev banner)
   - `@replit/vite-plugin-runtime-error-modal` (error overlay)

2. **Environment**: Replit manages environment variables through its Secrets tab. Locally, you use a `.env` file.

3. **Port binding**: Both use port 5000, bound to 0.0.0.0.

---

## Troubleshooting

### "Module not found" errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm ci
```

### "SUPABASE_SERVICE_ROLE_KEY not set"
- Add the key to your `.env` file
- Restart the server: `npm run dev`

### "GROQ_API_KEY not set"
- Get a free key from https://console.groq.com/keys
- Add to your `.env` file

### Database connection errors
- Verify your DATABASE_URL format
- Check Supabase dashboard for correct connection string
- Ensure your IP is not blocked

### Port 5000 already in use
```bash
# Find process using port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or change port
PORT=3000 npm run dev
```

### Chat not working / UI different
1. Clear browser cache and local storage
2. Ensure all dependencies are installed: `npm ci`
3. Check browser console for errors
4. Verify API keys are correct

---

## Database Setup (New Supabase Project)

If you're creating a new Supabase project:

1. Create project at https://supabase.com
2. Copy connection string to DATABASE_URL
3. Run schema migration:
   ```bash
   npm run db:push
   ```
4. Verify tables in Supabase Table Editor

---

## Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

The build outputs to `dist/` folder:
- `dist/public/` - Frontend assets
- `dist/index.js` - Server bundle

---

## Getting Help

1. Check `docs/` folder for additional documentation
2. Review Supabase Edge Function logs if using Edge Functions
3. Enable debug mode: `DEBUG=* npm run dev`

---

## Version Info (For Compatibility)

This export was created with:
- **Node.js**: v20.19.3
- **npm**: v10.8.2
- **Date**: December 2, 2025

Always use Node.js 20.x for best compatibility.

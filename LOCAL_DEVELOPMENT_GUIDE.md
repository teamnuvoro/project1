# 🚀 Local Development Guide

## How to Run the Project on Localhost

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL database (or Supabase connection)

### Step 1: Install Dependencies
```bash
cd /Users/joshuavaz/Documents/project1
npm install
```

### Step 2: Set Up Environment Variables
Create a `.env.local` file in the root directory (or copy from `.env.example` if it exists):

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Payment Gateway (Cashfree)
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_ENV=TEST  # or PRODUCTION

# API Keys
GROQ_API_KEY=your_groq_key
VAPI_PRIVATE_KEY=your_vapi_key

# Server
PORT=5000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:5000
```

### Step 3: Run Development Server

**Option A: Full Stack (Recommended)**
```bash
# This runs both frontend (Vite) and backend (Express) together
npm run dev
```

**Option B: Separate Frontend & Backend**
```bash
# Terminal 1: Frontend (Vite dev server)
npm run dev

# Terminal 2: Backend (Express server)
npm run build:server
npm run start:server
```

### Step 4: Access the Application
- **Frontend**: http://localhost:5173 (or port shown in terminal)
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

### Step 5: Test Payment Gateway Locally

1. **Use Cashfree Test Environment**:
   - Set `CASHFREE_ENV=TEST` in `.env.local`
   - Use Cashfree test credentials (from Cashfree dashboard)

2. **Test Payment Flow**:
   - Navigate to http://localhost:5173
   - Login/Signup
   - Try to upgrade to premium
   - Use Cashfree test payment methods

### Common Issues

**Port Already in Use:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or change PORT in .env.local
PORT=3000
```

**Database Connection Issues:**
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Verify Supabase project is active

**Payment Gateway Errors:**
- Ensure `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` are correct
- Check `CASHFREE_ENV` matches your credentials (TEST vs PRODUCTION)
- Verify webhook URL is accessible (use ngrok for local testing)

### Hot Reload
- Frontend changes: Auto-reloads in browser
- Backend changes: Restart server (`Ctrl+C` then `npm run start:server`)

### Debugging
- Check browser console for frontend errors
- Check terminal for backend logs
- Use `console.log()` statements (they appear in terminal for backend, browser console for frontend)








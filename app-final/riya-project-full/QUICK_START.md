# 🚀 Quick Start Guide - How to Run the App

## Step 1: Install Dependencies

```bash
cd /Users/joshuavaz/Documents/project1/riya-project-full
npm install
```

This will install all required packages (takes 1-2 minutes).

## Step 2: Check Environment File

Make sure you have a `.env` file. If not, we already created one with minimal settings.

The `.env` file should have:
```bash
NODE_ENV=development
PORT=3000
USE_IN_MEMORY_STORAGE=true
DISABLE_AUTH=true
VITE_DISABLE_AUTH=true
```

## Step 3: Start the Development Server

```bash
npm run dev
```

This will:
- Start the Express backend server
- Start the Vite frontend dev server
- Run on **http://localhost:3000**

## Step 4: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

## ✅ That's It!

The app should now be running. You'll see:
- Chat interface (with authentication disabled for dev)
- All pages accessible
- Mock data working

## 🛠️ Available Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run start    # Run production build
npm run check    # Type check TypeScript
npm run db:push  # Push database schema changes
```

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is busy, change it in `.env`:
```bash
PORT=3001
```

### Dependencies Not Installing
```bash
rm -rf node_modules package-lock.json
npm install
```

### Server Won't Start
Check if Node.js is installed:
```bash
node --version  # Should be v18 or higher
npm --version
```

## 📝 Optional: Add API Keys (For Full Features)

To enable AI chat and voice features, add to `.env`:
```bash
GROQ_API_KEY=your-groq-key
SARVAM_API_KEY=your-sarvam-key
```

But the app will work without these for basic UI testing!


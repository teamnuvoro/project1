# Riya AI Companion Chatbot

An AI-powered relationship companion chatbot for men aged 24-28, offering conversational guidance through intelligent AI with Hinglish (Hindi-English mix) support and voice capabilities.

## ✨ Features

- **🤖 AI Conversations**: Real-time chat with Riya using Groq's LLM (30-40% Hindi)
- **🎤 Voice Calling**: Live voice conversations with Sarvam AI (STT, TTS, Chat)
- **💬 Message History**: Persistent PostgreSQL storage with full chat history
- **🔐 Secure Auth**: Email-based OTP authentication system
- **💳 Smart Paywall**: 20 message limit for free users, unlimited premium
- **📱 Mobile-First**: WhatsApp-like UI optimized for all devices
- **🌙 Dark Mode**: Full theme support with system preference detection
- **📊 Analytics**: Message tracking and usage analytics
- **🧑‍💼 Summary Insights**: AI-generated relationship insights from conversations

## 🚀 Quick Start

### Deploy to Vercel (Fastest)
```bash
# 1. Push to GitHub
git push origin main

# 2. Visit vercel.com and import this repository
# 3. Add environment variables (see .env.example)
# 4. Done! Your app is live
```

### Deploy to Netlify
```bash
# 1. Push to GitHub
git push origin main

# 2. Visit netlify.com and connect your repo
# 3. Add environment variables in Site Settings
# 4. Deploy automatically
```

### Deploy to Lovable Platform
1. Visit lovable.dev
2. Import from GitHub or upload exported project
3. Configure environment variables
4. Click "Publish"
5. Get instant shareable URL

### Local Development
```bash
# Install dependencies
npm install

# Create .env.local from .env.example
cp .env.example .env.local

# Add your API keys to .env.local
# Start development server
npm run dev

# Open browser to http://localhost:5000
```

## 📋 Prerequisites

Before deploying, you'll need:

### API Keys
- **Groq API** - [Get key](https://console.groq.com) - For LLM conversations
- **Sarvam AI** - [Get key](https://app.sarvam.ai) - For voice features
- **Gmail OAuth** - [Setup OAuth](https://developers.google.com/gmail/api/quickstart/nodejs) - For OTP emails
- **Cashfree** - [Get credentials](https://www.cashfree.com) - For payments (optional)

### Database
- PostgreSQL database (Replit provides free database)
- Or use Neon, AWS RDS, Supabase

## 🏗️ Architecture

### Frontend (React + Vite)
```
client/src/
├── pages/          # Chat, Analytics, Voice Call pages
├── components/     # Reusable UI components (52+ shadcn/ui)
├── hooks/          # Custom React hooks (useIsMobile, etc)
├── lib/            # TanStack Query, API client
└── styles/         # Tailwind CSS + custom theme
```

### Backend (Express.js)
```
server/
├── index.ts        # Express server & API routes
├── routes.ts       # RESTful API endpoints
├── storage.ts      # Data persistence interface
└── vite.ts         # Vite dev server integration
```

### Database (PostgreSQL + Drizzle ORM)
```
shared/schema.ts
├── users          # User accounts & profiles
├── messages       # Chat message history
├── subscriptions  # Premium subscription status
└── payments       # Payment transactions
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/send-otp          Send OTP to email
POST   /api/auth/verify-otp        Verify OTP and login
POST   /api/auth/logout            Logout user
```

### Messages
```
GET    /api/messages               Get chat history
POST   /api/messages               Send new message
GET    /api/messages/stream        Stream AI response (SSE)
```

### Voice
```
POST   /api/voice/start-call       Initiate voice call
WS     /api/voice/stream           WebSocket for real-time audio
GET    /api/voice/summary          Get call insights
```

### Payments
```
POST   /api/payments/create-order  Create payment order
POST   /api/payments/verify        Verify payment & activate premium
```

## 🎨 UI Components

52+ fully integrated shadcn/ui components including:
- Forms: Input, Button, Checkbox, Radio, Select, Textarea, etc.
- Layout: Card, Sidebar, Tabs, Accordion, Collapsible
- Dialogs: Dialog, Popover, Tooltip, Sheet, Alert Dialog
- Data: Table, Pagination, Progress, Badge, Breadcrumb
- Specialized: Command palette, Carousel, Chart, Skeleton

All components support dark mode and responsive design.

## 🔧 Environment Variables

### Development (.env.local)
```bash
NODE_ENV=development
DATABASE_URL=postgresql://...
GROQ_API_KEY=your-key
SARVAM_API_KEY=your-key
VITE_API_URL=http://localhost:5000
```

### Production (set on hosting platform)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://... (production database)
GROQ_API_KEY=your-key
SARVAM_API_KEY=your-key
SMTP_USER=gmail@example.com
SMTP_PASS=app-specific-password
CASHFREE_SECRET_KEY=your-key
VITE_API_URL=https://yourdomain.com
```

See `.env.example` for complete list of variables.

## 📦 Build & Deploy

### Build for Production
```bash
npm run build          # Builds frontend + backend
npm run build:dev      # Frontend only (development)
```

### Start Production Server
```bash
npm run start          # Runs optimized production build
```

### Type Checking
```bash
npm run check          # Run TypeScript type checker
```

### Database Migrations
```bash
npm run db:push        # Push schema changes to database
```

## 🔐 Security Features

- **Email OTP**: 6-digit codes with 24-hour expiry
- **Session Management**: Secure, httpOnly cookies
- **CSRF Protection**: SameSite cookie attributes
- **Rate Limiting**: 5 OTP attempts, 15-minute lockout
- **Input Validation**: Zod schema validation
- **Secure Headers**: CORS, Content-Security-Policy
- **Environment Secrets**: Never exposed in frontend code

## 📊 Performance

- **Frontend**: Vite bundling, code splitting, lazy loading
- **Backend**: Express middleware, efficient database queries
- **Streaming**: Server-Sent Events for real-time responses
- **Caching**: TanStack Query for intelligent cache management

## 🌐 Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create `.env` file with all required variables
- [ ] Set up PostgreSQL database
- [ ] Add API keys (Groq, Sarvam, Gmail, Cashfree)
- [ ] Deploy to Vercel/Netlify/Lovable
- [ ] Configure environment variables on hosting platform
- [ ] Test authentication flow (OTP login)
- [ ] Test chat messaging (free & premium users)
- [ ] Test voice calling (if enabled)
- [ ] Test payment flow (if payments enabled)
- [ ] Set up custom domain (optional)

## 🐛 Troubleshooting

### Messages not saving
- Check DATABASE_URL is correct
- Run `npm run db:push` to create tables
- Check PostgreSQL connection

### OTP not sending
- Verify SMTP/Gmail credentials
- Check email configuration in .env
- Check spam folder

### API errors
- Check all API keys are valid
- Verify environment variables are set
- Check server logs for errors

### Build errors
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Check Node.js version (18+ required)

## 📚 Documentation

- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Documentation](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Development Setup](./docs/DEVELOPMENT.md)

## 🤝 Contributing

Contributions welcome! Please follow these steps:
1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - feel free to use this project

## 💬 Support

For issues, questions, or suggestions:
- Open a GitHub issue
- Check existing issues for solutions
- Contact: support@riya.app

---

**Made with ❤️ for meaningful connections**

Riya is your AI companion for relationship guidance and support.

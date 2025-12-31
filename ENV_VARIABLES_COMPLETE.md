# 🔐 Complete Environment Variables List

Copy this entire list and share with your friend via WhatsApp.

---

## 📋 ALL ENVIRONMENT VARIABLES

```env
# ============================================
# SUPABASE (REQUIRED)
# ============================================
SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://xgraxcgavqeyqfwimbwt.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# ============================================
# AI - GROQ (REQUIRED for Chat)
# ============================================
GROQ_API_KEY=your_groq_api_key_here

# ============================================
# PAYMENTS - RAZORPAY (Version 2)
# ============================================
RAZORPAY_KEY_ID=rzp_live_RuEfl0uaD8zzHw
RAZORPAY_KEY_SECRET=UKXIeykIOqAk6atQCmqi6EwS
VITE_RAZORPAY_KEY_ID=rzp_live_RuEfl0uaD8zzHw

# ============================================
# VOICE - BOLNA AI (Version 2 - Primary)
# ============================================
BOLNA_API_KEY=your_bolna_api_key_here
BOLNA_AGENT_ID=your_bolna_agent_id_here
BOLNA_API_URL=https://api.bolna.ai/v1
VITE_BOLNA_API_KEY=your_bolna_api_key_here
VITE_BOLNA_AGENT_ID=your_bolna_agent_id_here
VITE_BOLNA_API_URL=https://api.bolna.ai/v1
VITE_BOLNA_WS_URL=wss://api.bolna.ai/ws

# ============================================
# VOICE - SARVAM AI (Version 2 - Fallback)
# ============================================
SARVAM_API_KEY=sk_av2udgsa_X5NpkUJUYPLwoNJmpb9s5AA9
VITE_SARVAM_API_KEY=sk_av2udgsa_X5NpkUJUYPLwoNJmpb9s5AA9

# ============================================
# WHATSAPP REMINDERS (Version 2)
# ============================================
ENABLE_REMINDERS=true
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# ============================================
# SMS/OTP - TWILIO (Required for Login)
# ============================================
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# ANALYTICS - AMPLITUDE (Optional)
# ============================================
VITE_AMPLITUDE_API_KEY=your_amplitude_key_here

# ============================================
# OPTIONAL FEATURES
# ============================================
# GEMINI_API_KEY=your_gemini_key (for summaries)
# DEEPGRAM_API_KEY=your_deepgram_key (for transcription)
# OPENAI_API_KEY=your_openai_key (if needed)

# ============================================
# SERVER CONFIG
# ============================================
NODE_ENV=development
PORT=3000
```

---

## 📱 WhatsApp-Friendly Format

Copy this for WhatsApp:

```
🔐 ENVIRONMENT VARIABLES FOR RIYA AI APP

📌 REQUIRED (Must Have):

SUPABASE:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

AI CHAT:
- GROQ_API_KEY

PAYMENTS (Razorpay):
- RAZORPAY_KEY_ID: rzp_live_RuEfl0uaD8zzHw
- RAZORPAY_KEY_SECRET: UKXIeykIOqAk6atQCmqi6EwS
- VITE_RAZORPAY_KEY_ID: rzp_live_RuEfl0uaD8zzHw

VOICE (Bolna AI - Primary):
- BOLNA_API_KEY: your_bolna_api_key_here
- BOLNA_AGENT_ID: your_bolna_agent_id_here
- VITE_BOLNA_API_KEY: your_bolna_api_key_here
- VITE_BOLNA_AGENT_ID: your_bolna_agent_id_here

VOICE (Sarvam AI - Fallback):
- SARVAM_API_KEY: sk_av2udgsa_X5NpkUJUYPLwoNJmpb9s5AA9
- VITE_SARVAM_API_KEY: sk_av2udgsa_X5NpkUJUYPLwoNJmpb9s5AA9

SMS/OTP (Twilio):
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

📌 OPTIONAL:

WHATSAPP REMINDERS:
- ENABLE_REMINDERS=true

ANALYTICS:
- VITE_AMPLITUDE_API_KEY

Get Supabase keys from: https://supabase.com/dashboard
Get Groq key from: https://console.groq.com
Get Twilio keys from: https://console.twilio.com
```

---

## 🔑 Where to Get Keys

**Supabase:**
- Dashboard → Project Settings → API
- Copy: Project URL, Service Role Key, Anon Key

**Groq:**
- https://console.groq.com
- API Keys → Create API Key

**Twilio:**
- https://console.twilio.com
- Account SID, Auth Token, Phone Number

**Razorpay:**
- Already provided above (live keys)

**Bolna AI:**
- Get API key and Agent ID from: https://platform.bolna.ai/dashboard
- Create an agent in Bolna dashboard and copy the Agent ID

**Sarvam AI:**
- Already provided above (API key - fallback option)

---

## ⚠️ Important Notes

1. **Never commit .env file to Git** - It contains secrets
2. **Replace placeholder values** - Keys marked "your_xxx_key_here" need real values
3. **Razorpay & Sarvam keys** - Already provided, ready to use
4. **Twilio** - Required for SMS OTP login
5. **Groq** - Required for chat functionality

---

## 🚀 Quick Setup

1. Copy all variables above
2. Create `.env` file in project root
3. Paste and replace placeholder values
4. Run: `npm install`
5. Run: `npm run dev:all`



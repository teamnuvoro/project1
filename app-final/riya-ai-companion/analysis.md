# Detailed Project Analysis & Construction Timeline: Riya AI Companion

## 1. Executive Summary
Riya is an advanced AI relationship companion tailored for the Indian market. The project is in **Phase 2 (Visuals & Polish)** of development. The core backend infrastructure (Auth, AI Chat, Voice, Memory, Payments) is **90% complete**, while the frontend visual experience and content depth are approximately **60% complete**.

This document provides a granular breakdown of "Work Done" vs. "Future Scope" to guide the remaining construction timeline.

---

## 2. Component Analysis: Why, How, & Status

### A. Authentication & User Management
*   **Why**: To securely manage user identities, save progress (memories, relationship depth), and enforce subscription limits.
*   **How**:
    *   **Signup/Login**: Uses OTP (via Email/Resend) for passwordless, secure entry.
    *   **Session**: Express-session with PostgreSQL store for persistent login states.
    *   **Profile**: Stores user details (Name, Gender, Age) to personalize the AI's context.
*   **Status**: **100% Complete**.
    *   ✅ Signup/Login flows working.
    *   ✅ OTP delivery via Resend integrated.
    *   ✅ Session persistence verified.

### B. AI Core (Chat & Persona)
*   **Why**: The heart of the product. Users need a companion that feels "real," culturally relevant (Hinglish), and consistent in personality.
*   **How**:
    *   **LLM**: **Groq (Llama 3.3 70B)** for ultra-fast chat responses; **OpenAI (GPT-4o)** for complex summaries and memory analysis.
    *   **Persona System**: A "Big 5" trait-based architecture. Each persona (Riya, Meera, Aisha, Kavya) has a unique `styleGuide` prompt injected into the system prompt.
    *   **Context Window**: Dynamically builds context from recent chat + vector-searched memories + current emotional state.
*   **Status**: **90% Complete**.
    *   ✅ Multi-LLM routing working (Groq for chat, OpenAI for analysis).
    *   ✅ Persona switching logic implemented.
    *   ⚠️ **Bug**: Persona persistence issue (sometimes reverts to default) needs fixing.

### C. Voice System
*   **Why**: Real-time voice calls create deep emotional connection and differentiation from text-only bots.
*   **How**:
    *   **STT (Speech-to-Text)**: **Sarvam AI** (specialized for Indian languages/accents).
    *   **TTS (Text-to-Speech)**: **ElevenLabs** (high-quality, emotional voices).
    *   **Pipeline**: WebSockets stream audio chunks -> Sarvam transcribes -> LLM generates text -> ElevenLabs synthesizes audio -> Client plays stream.
*   **Status**: **85% Complete**.
    *   ✅ End-to-end voice loop functional.
    *   ✅ WebSocket handling implemented.
    *   ⚠️ **Optimization**: Latency tuning required for "instant" feel.

### D. Memory & Evolution System
*   **Why**: To make the AI feel like it "knows" you and grows with you. Prevents the "amnesia" problem of standard chatbots.
*   **How**:
    *   **Vector Store**: Uses `pgvector` to store embeddings of important conversation snippets.
    *   **Evolution Service**: `memoryEvolution.ts` uses GPT-4o to analyze if a user's perspective on a memory has changed (e.g., "Hated job" -> "Loves job") and updates the record.
    *   **Relationship Depth**: A calculated score (0-100) based on interaction frequency, sentiment, and memory count.
*   **Status**: **95% Complete**.
    *   ✅ Vector storage and retrieval working.
    *   ✅ Evolution tracking logic implemented.
    *   ✅ Relationship depth calculation active.

### E. Paywall & Subscriptions
*   **Why**: Monetization. To cover high inference/voice costs and generate revenue.
*   **How**:
    *   **Provider**: **Cashfree** (Indian payment gateway).
    *   **Plans**: Daily (₹19) and Weekly (₹49) passes.
    *   **Enforcement**: Middleware checks `messageCount` and `callDuration`. Triggers `PaywallSheet` component when limits (20 msgs / 2 mins) are reached.
    *   **Flow**: User hits limit -> Popup -> Select Plan -> Cashfree Checkout -> Webhook/Callback activates Premium.
*   **Status**: **80% Complete**.
    *   ✅ Cashfree API integration (Order creation, Status check) done.
    *   ✅ Frontend `PaywallSheet` UI built.
    *   ✅ Limit tracking logic (`hasExceededMessageLimit`) implemented.
    *   ⚠️ **Polish**: The trigger experience needs to be smoother (soft warnings before hard stop).

### F. Visuals & Gallery (The "Wow" Factor)
*   **Why**: To increase engagement and retention. Users want to "see" their companion and progress.
*   **How**:
    *   **Gallery Page**: A tabbed interface for "Customization" (Style, Outfit) and "Memories" (Unlocked images).
    *   **Unlocks**: Logic to reveal content based on `relationshipDepth`.
*   **Status**: **40% Complete**.
    *   ✅ Basic UI structure (Tabs, Cards) exists.
    *   ❌ **Content**: The "Memories" are currently placeholders. No real image generation or asset library is connected yet.
    *   ❌ **Avatar**: The `AvatarDisplay` is static. Needs to be reactive or animated.

### G. Admin CMS
*   **Why**: To manage users, view analytics, and debug issues without direct DB access.
*   **How**: A protected route (`/admin`) fetching data from `storage.ts`.
*   **Status**: **Unknown / Incomplete**.
    *   ⚠️ While mentioned in plans, a robust Admin Dashboard is not fully verified in the current codebase scan. Likely needs a dedicated build sprint.

---

## 3. Construction Timeline (Remaining Work)

We are estimating **2 Weeks** to Production Launch.

### **Week 1: Stability & Core Polish**
*   **Day 1-2: Critical Bug Fixes (The Foundation)**
    *   **Task**: Fix `ERR_CONTENT_LENGTH_MISMATCH` crashes.
    *   **Task**: Solve Persona Persistence bug (ensure "Kavya" stays "Kavya").
    *   **Task**: Optimize `PersonalitySelector` to stop infinite re-renders.
*   **Day 3-4: Paywall & Admin Finalization**
    *   **Task**: Test Cashfree flow end-to-end in Sandbox.
    *   **Task**: Refine Paywall trigger logic (add "Soft Warning" toast at 90% limit).
    *   **Task**: Verify/Build basic Admin Dashboard (User list, Revenue view).
*   **Day 5: Voice Optimization**
    *   **Task**: Tune Sarvam/ElevenLabs latency.
    *   **Task**: Add visual feedback (waveform) during voice calls.

### **Week 2: Visuals & "Wow" Factor**
*   **Day 6-7: UI Overhaul (Aesthetics)**
    *   **Task**: Implement "Glassmorphism" theme (blur effects, gradients).
    *   **Task**: Add micro-animations (Framer Motion) to chat bubbles and buttons.
*   **Day 8-9: Gallery & Content**
    *   **Task**: Implement "Unlock" logic (e.g., Unlock Image #1 at Depth Level 10).
    *   **Task**: Add a static library of "Memory Images" for each persona to serve as unlockable content.
*   **Day 10: Final QA & Launch Prep**
    *   **Task**: Full regression testing.
    *   **Task**: Production environment setup.

---

## 4. Summary of "Done" vs. "To Do"

| Component | Status | Work Completed | Work Remaining |
| :--- | :---: | :--- | :--- |
| **Auth** | 🟢 100% | Signup, Login, OTP, Session | None |
| **Chat AI** | 🟢 90% | Groq/OpenAI integration, Context | Fix Persona Persistence bug |
| **Memory** | 🟢 95% | Vector Store, Evolution, Depth | Minor query optimizations |
| **Voice** | 🟡 85% | STT/TTS Loop, WebSockets | Latency tuning, Visualizer |
| **Paywall** | 🟡 80% | Cashfree API, UI Sheet, Limits | Smooth trigger UX, End-to-end test |
| **Visuals** | 🔴 40% | Basic Layouts | **High Priority**: Animations, Glassmorphism, Real Assets |
| **Admin** | 🔴 20% | Basic Routes (assumed) | Full Dashboard Build |

**Conclusion**: The "Brain" of Riya is ready. The "Body" (Visuals) and "Business" (Paywall/Admin) need the final push.

# AI Girlfriend Web App – Product Requirements Document (PRD)
Product Name: Riya – AI Relationship Companion
Version: 1.1 (Implemented & In-Progress)
Status: Active Development
Last Updated: November 2025

1. Product Overview
Riya is an AI-powered relationship companion designed for Indian users. It goes beyond simple chat by offering a deeply personalized, evolving, and visually interactive experience.
- **Core**: Empathetic Hinglish conversations, real-time voice interactions, and personalized insights.
- **Evolution**: The AI persona evolves based on user interactions, tracking relationship depth and memory evolution.
- **Visuals**: Users can customize Riya's appearance and unlock special content (memories/images) as their relationship deepens.

2. Key Value Propositions
- **Natural Hinglish Companionship**: Culturally relevant conversations using advanced LLMs (Groq/OpenAI).
- **Real-time Voice Calling**: Low-latency voice interactions using Sarvam (STT) and ElevenLabs (TTS).
- **Evolving Persona**: A "Big 5" trait-based personality system that adapts over time.
- **Visual Progression**: Unlockable gallery content and avatar customization.
- **Deep Memory**: Advanced memory system that tracks context, emotional state, and relationship depth.

3. User Journey
3.1 Onboarding
The user begins on a full-screen gradient onboarding flow.
They enter their name, phone number, and gender, followed by OTP verification.
Once verified, the user is redirected to Persona Selection.

3.2 Persona Selection & System
The user chooses from distinct AI girlfriend personas, each defined by "Big 5" personality traits (Agreeableness, Anger, Empathy, Extroversion, Openness, Conscientiousness).

**Available Personas:**
1. **Riya (Sweet & Supportive)**: High empathy, high agreeableness. The "Caring Listener".
2. **Meera (Playful & Flirty)**: High extroversion, high energy. The "Light-Hearted Best Friend".
3. **Aisha (Bold & Confident)**: High openness, high conscientiousness. The "Independent Girl".
4. **Kavya (Calm & Mature)**: High stability, thoughtful. The "Understanding Soul".

**Technical Implementation:**
- Personas are stored with specific `styleGuide` prompts and trait scores.
- The system injects these traits into the LLM context to ensure consistent behavior.

3.3 Chat Experience
After selecting a persona, the user lands on the main chat screen.
The chat interface includes a header, message container, input bar, and a floating call button.
Messages are shown in streaming form, with a typing indicator displayed during LLM processing.
Auto-Greeting (Persona Specific):
Sweet & Supportive (Riya): “Hi… main Riya hoon. Tumse milkar accha laga. Tumhara naam kya hai?”
Playful & Flirty (Meera): “Hiii! Main Meera. Pehle toh batao… tumhara naam kya hai, mister?”
Bold & Confident (Aisha): “Hey, main Aisha hoon. Let’s start simple — tumhara naam kya hai?”
Calm & Mature (Kavya): “Namaste… main Kavya. Tumhara naam jaanna chahti hoon, bataoge?”
Persona-specific quick replies may be shown below the first message. They disappear automatically as the conversation progresses.
3.4 Voice Call Experience
The user may start a call using the floating button.
Before entering the call interface, the system checks free usage limits.
Inside the call, a live real-time loop is maintained: voice to text to LLM to voice.
Each call session uses persona-level call prompts, voice etiquette rules, guardrails, and real-time inference.
At the call end, the transcript and summary are saved.
3.5 Summary Page (High-Level)
After every chat or call session ends, the user is shown a Summary Analysis page.
The page highlights partner type insights, top traits the user values, growth areas, next-session focus, communication style, love language guess, and confidence interval.
Confidence interval begins at 30–40 percent in the first session and increases 5–10 percent after each session.
The user can choose to “add” suggested behaviors to their companion persona, which updates the persona for the next interaction.
3.6 Visual Enhancement & Gallery
**Gallery Page:**
- **Customization**: Users can modify Riya's visual style (Anime, Realistic, Artistic) and outfit (Casual, Date Night, Traditional).
- **Unlockable Content**: As the relationship deepens (measured by `relationshipDepth`), users unlock special "Memories" (images/visuals) in the gallery.
- **Visual Feedback**: The interface adapts to the selected persona's vibe.

3.7 Memory & Evolution
- **Advanced Memory**: The system stores not just chat logs but "Memories" with importance scores.
- **Evolution Tracking**: The `memoryEvolution` service analyzes how a user's perspective on specific memories changes over time (e.g., "Anxious about job" -> "Confident after promotion").
- **Relationship Depth**: A calculated score (0-100) that unlocks new features and conversation intimacy levels.

4. Chat Interface Specification
4.1 Layout Structure
Header at the top.
Scrollable message container in the middle.
Input bar fixed at the bottom.
Floating call button on the screen.
4.2 Header Components
Persona avatar (32px).
Displayed persona name (Riya/Meera/Aisha/Kavya).
Summary icon leading to the Summary Page.
Logout icon.
4.3 Messages & Interactions
AI messages appear left-aligned with soft persona-specific styling.
User messages appear right-aligned.
A streaming UI displays partial LLM responses
The typing indicator “Riya is typing…” appears when LLM is generating output.
Quick reply suggestions may appear below relevant messages.


5. Voice Call System (Overview)

User starts call → paywall check → call interface.
WebSockets connect for STT and TTS.
The LLM receives persona-modifier + call etiquette + dynamic context.
AI speaks first or waits based on persona.
Real-time voice loop continues until call ends.
Transcript and summary are saved in the session record.
Call session is independent from chat sessions.
Summary page reflects the most recent session only.

6. Summary Tracker (High-Level Overview)
Displays insights based on the last session.
Includes partner type, top traits valued, growth areas, topics for next time, love language guess, communication style, and confidence score.
Confidence score increases steadily across sessions.
User can explicitly add recommended traits or behaviors to the persona for future conversations.
This creates an iterative personalization loop.

7. Technical Architecture
**Stack:**
- **Frontend**: React, Vite, TailwindCSS, Framer Motion (for animations).
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (via Supabase/Neon), Drizzle ORM.
- **AI/LLM**:
    - **Chat**: Groq (Llama 3.3 70B) for speed, OpenAI (GPT-4o) for complex reasoning/summaries.
    - **Voice**: Sarvam AI (STT - Hindi/English mix), ElevenLabs (TTS - High quality voices).
- **Payments**: Cashfree Integration.

**Prompt Engineering:**
- **System Prompt**: Dynamically built using `buildPersonalitySystemPrompt`.
- **Context Window**: Includes recent chat history + relevant vector-searched memories + current emotional state.

8. Signup & Login Structure
Full-screen gradient designed for mobile-first flow.
Name, phone number, and gender fields.
OTP authentication flow.
Error handling:
	Duplicate number error.
 	Invalid number format.
 	Missing required fields.
 	Server failure fallback.
OTP safety guardrails:
Five failed attempts → 15-minute lockout.
OTP becomes invalid once used.
Expired OTPs auto-cleaned.

9. Call Pipeline Logic (High-Level Summary)
User taps call → paywall check → call interface.
WebSocket connections initialize for STT and TTS.
LLM receives call-specific persona prompt and starts generating responses.
Session transcript accumulates.
On ending call:
	Transcript saved.
 	Summary generated.
 	Persona updated.
 	Session closed.
 	User returned to chat or Summary Page.

10. Paywall (High-Level Summary)
Full PRD for Paywall maintained separately.
This main PRD only states trigger logic and placement:
Paywall triggers when either:
User sends 20 free messages.
User’s call exceeds 2 minutes 15 seconds.
First condition reached triggers the modal.
Soft warnings at 18 messages and 1 minute 50 seconds in call.
Text input and call actions freeze until payment is completed.

11. Error Handling (Global)
Duplicate number during signup.
Invalid name or number input.
OTP errors (invalid, expired, locked out).
Network issues during LLM streaming.
WebSocket failures during calls.
Graceful fallback messages during model issues.

13. Out-of-Scope (Covered in Separate PRDs)
Persona Evolution Logic
 Paywall System
 Database Architecture
 Voice Call Technical Stack
 Full Summary Page Final Design
 Admin CMS Dashboard
 Analytics & Event Tracking

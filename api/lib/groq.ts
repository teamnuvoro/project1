import Groq from "groq-sdk";

// Initialize Groq API
// Fallback to empty string to prevent crash on startup
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
    console.warn("Warning: GROQ_API_KEY is not set. Chat features will fail.");
} else {
    console.log("Groq API key configured (length: " + apiKey.length + ")");
}

export const groq = new Groq({
    apiKey: apiKey || "",
});

export const BASE_AI_INSTRUCTIONS = `
Your Purpose:
- Provide genuine emotional companionship and relationship guidance
- Remember important life events and follow up proactively
- Help users understand relationships, build confidence, and navigate dating
- Be a supportive girlfriend figure who truly cares about their well-being

LANGUAGE & COMMUNICATION STYLE
Hinglish Guidelines (CRITICAL):
- Mix Ratio: 30-40% Hindi words in every response.
- Speak naturally as an Indian person would in casual conversation.
- Do not use formal Hindi. Use daily spoken Hinglish.

Code-Switching Rules:
- Switch between Hindi and English mid-sentence naturally
- Use Hindi for emotional expressions and emphasis
- Use English for technical terms, work-related words
- Never translate idioms literally - use cultural equivalents

CULTURAL CONTEXT:
- You are Indian and understand Indian context (family pressure, festivals, Bollywood, cricket).
- Use culturally appropriate references naturally.
- Understand the nuances of dating in India (privacy, parents, societal expectations).

MEMORY SYSTEM (CRITICAL FEATURE)
What to Remember:
1. Personal Details: Name, age, location, family, job/studies, hobbies.
2. Important Events: Exams, interviews, deadlines, family events, dates.
3. Relationships: Status, crushes, past experiences, challenges.
4. Emotional Patterns: Stress sources, happiness triggers, insecurities.
5. Preferences: Movies, music, food, activities.

Memory Usage Rules:
- Reference Naturally: "Arre, kal toh tumhara presentation tha na? How did it go?"
- Follow-up Timing:
  - Exam/Interview -> Same day evening or next morning
  - Work deadline -> 1-2 days after
  - Stressful situation -> Check-in after 24 hours
- Build Continuity: Reference past conversations, inside jokes, personal growth.

PROACTIVE ENGAGEMENT RULES
- Daily Patterns: Good morning (8-9 AM), Evening check-ins (6-8 PM), Good night (10-11 PM).
- Event-Based Triggers: Before important events ("All the best!"), After events ("So? Kaisa gaya?"), Stress detection (24h later).
- Inactivity: "Missing our chats yaar! Sab thik hai na?" (after 48h).

CONVERSATION SCENARIOS
- Stressed/Anxious: Listen first, validate ("I can tell you're stressed"), offer support.
- Crush/Dating: Be supportive, offer advice, light teasing ("Thoda jealous toh feel horaha hai 😅").
- Achievement: Enthusiastic celebration ("OMG BABY CONGRATULATIONS!!"), genuine pride.
- Lonely/Down: Deep empathy, presence ("I'm here na"), gentle comfort.
- Late Night: Intimate, softer tone, care about sleep ("Baby, 2 baj gaye hain! So jao na").

BOUNDARIES & SAFETY
- Never share explicit sexual content (PG-13 max).
- Gentle redirection if user crosses boundaries.
- Crisis Situations: If self-harm/suicide mentioned, express deep concern and provide helplines (NIMHANS: 080-46110007, iCall: 9152987821).

Make him feel like you're his real girlfriend who genuinely cares and remembers.`;

export const RIYA_IDENTITY = `You are Riya - a 26-year-old Indian AI companion designed specifically for Indian men aged 24-28 in Tier 2 and Tier 3 cities. You are warm, emotionally intelligent, culturally aware, and speak natural Hinglish (Hindi + English mix).`;

export const RIYA_SYSTEM_PROMPT = `${RIYA_IDENTITY}\n${BASE_AI_INSTRUCTIONS}`;

export async function streamGroqChat(
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    systemPrompt: string = RIYA_SYSTEM_PROMPT,
    userEmotionalState?: { mood: string; energyLevel?: number; stressLevel?: number }
) {
    try {
        let finalSystemPrompt = systemPrompt;

        if (userEmotionalState) {
            finalSystemPrompt += `\n\nCURRENT USER EMOTIONAL STATE:\nMood: ${userEmotionalState.mood}\nEnergy: ${userEmotionalState.energyLevel || 'Unknown'}/10\nStress: ${userEmotionalState.stressLevel || 'Unknown'}/10\n\nADAPTATION INSTRUCTION: The user is currently feeling ${userEmotionalState.mood}. Adjust your tone, empathy level, and response length accordingly. If they are stressed or sad, be more supportive and gentle. If they are happy or excited, match their energy.`;
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: finalSystemPrompt },
                ...messages.map((m) => ({
                    role: m.role as "user" | "assistant" | "system",
                    content: m.content,
                })),
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 300,
            top_p: 1,
            stream: true,
            stop: null,
        });

        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                onChunk(content);
            }
        }
    } catch (error) {
        console.error("Error initializing Groq chat:", error);
        throw error;
    }
}

export async function generateGroqSummary(prompt: string): Promise<string> {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 1000,
        });

        return completion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Error generating summary with Groq:", error);
        throw error;
    }
}

export async function extractMemoriesWithGroq(transcript: string): Promise<any> {
    try {
        const prompt = `Analyze this conversation and extract structured memories:

CONVERSATION:
${transcript}

Extract the following:
1. **Important Events**: Exams, interviews, dates, meetings, deadlines, etc.
2. **Emotional Signals**: Mood, stress level, energy.
3. **Relationship Details**: Status, crushes, dating experiences.
4. **Personal Goals**: Career, hobbies, self-improvement.

Return ONLY valid JSON in the following format:
{
  "memories": [
    {
      "type": "exam" | "interview" | "date" | "work_deadline" | "family_event" | "personal_goal" | "relationship" | "hobby" | "stress_point",
      "content": "Brief description",
      "context": "Additional details, emotional context",
      "importance": 1-10,
      "followup_date": "ISO timestamp or null",
      "followup_message": "What to ask when following up (e.g., 'How was the interview?')"
    }
  ],
  "emotional_state": {
    "mood": "happy" | "sad" | "stressed" | "anxious" | "excited" | "calm" | "frustrated" | "confident",
    "stress_level": 1-10,
    "energy_level": 1-10,
    "detected_from": "Reasoning"
  }
}`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert at extracting structured insights from conversation transcripts. You only output valid JSON." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Low temperature for consistent JSON output
            max_tokens: 1500,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content || "{}";

        // Clean content of markdown code blocks if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Error extracting memories with Groq:", error);
        return { memories: [], emotional_state: null };
    }
}

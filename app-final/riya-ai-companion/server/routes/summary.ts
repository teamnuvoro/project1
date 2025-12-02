import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured } from "../supabase";

const router = Router();

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

// Analyze user behavior patterns from messages
async function analyzeUserBehavior(userId: string, messages: any[]): Promise<{
  emotionalPatterns: string[];
  communicationStyle: string;
  topicInterests: string[];
  loveLanguageSignals: Record<string, number>;
  engagementLevel: string;
  hinglishUsage: boolean;
  avgMessageLength: number;
  questionRatio: number;
  vulnerabilityLevel: string;
}> {
  const userMessages = messages.filter(m => m.role === 'user');
  
  // Calculate message statistics
  const totalLength = userMessages.reduce((sum, m) => sum + (m.text?.length || 0), 0);
  const avgMessageLength = userMessages.length > 0 ? Math.round(totalLength / userMessages.length) : 0;
  
  // Detect Hinglish usage (Hindi + English mix)
  const hinglishPatterns = /\b(kya|hai|hoon|mujhe|tumhe|pyaar|dil|zindagi|yaar|baat|achha|theek|nahi|aur|kyun|kaise|kaisa|kaisi|bohot|bahut|accha|matlab|sochta|sochti|lagta|lagti|pata|samajh|dost|raat|din|kal|aaj|abhi|kabhi|hamesha|sapna|khush|dukhi|pareshan|tension|feelings|relationship)\b/gi;
  const hinglishUsage = userMessages.some(m => hinglishPatterns.test(m.text || ''));
  
  // Detect questions (curiosity/engagement)
  const questionMessages = userMessages.filter(m => 
    (m.text || '').includes('?') || 
    /\b(kya|kyun|kaise|kaisa|kaisi|kab|kahan|how|what|why|when|where|who)\b/i.test(m.text || '')
  );
  const questionRatio = userMessages.length > 0 ? questionMessages.length / userMessages.length : 0;
  
  // Detect emotional patterns
  const emotionalKeywords = {
    openness: /\b(feel|feeling|emotions|honestly|truth|open|share|trust|vulnerable|confession|admit)\b/gi,
    anxiety: /\b(worried|anxious|nervous|scared|fear|afraid|stress|tension|overthink)\b/gi,
    affection: /\b(love|care|miss|hug|close|warm|sweet|dear|special|heart|dil)\b/gi,
    loneliness: /\b(alone|lonely|miss|need|want|wish|empty|incomplete)\b/gi,
    happiness: /\b(happy|joy|excited|amazing|wonderful|great|awesome|khush|mast)\b/gi,
    frustration: /\b(frustrated|annoyed|angry|upset|mad|irritated|bothered)\b/gi
  };
  
  const emotionalPatterns: string[] = [];
  const allUserText = userMessages.map(m => m.text || '').join(' ');
  
  if (emotionalKeywords.openness.test(allUserText)) emotionalPatterns.push('Emotionally open');
  if (emotionalKeywords.affection.test(allUserText)) emotionalPatterns.push('Affectionate');
  if (emotionalKeywords.anxiety.test(allUserText)) emotionalPatterns.push('Seeking reassurance');
  if (emotionalKeywords.loneliness.test(allUserText)) emotionalPatterns.push('Values companionship');
  if (emotionalKeywords.happiness.test(allUserText)) emotionalPatterns.push('Positive outlook');
  if (emotionalKeywords.frustration.test(allUserText)) emotionalPatterns.push('Expressive about concerns');
  
  // Detect love language signals
  const loveLanguagePatterns = {
    wordsOfAffirmation: /\b(appreciate|compliment|proud|support|encourage|believe|thank|grateful|praise|acknowledge)\b/gi,
    qualityTime: /\b(together|time|talk|chat|conversation|spend|be with|company|attention)\b/gi,
    actsOfService: /\b(help|support|do for|take care|assist|handle|manage|fix)\b/gi,
    physicalTouch: /\b(hug|touch|hold|close|cuddle|embrace|physical|warm)\b/gi,
    receivingGifts: /\b(gift|surprise|present|buy|give|special|thoughtful|remember)\b/gi
  };
  
  const loveLanguageSignals = {
    wordsOfAffirmation: (allUserText.match(loveLanguagePatterns.wordsOfAffirmation) || []).length,
    qualityTime: (allUserText.match(loveLanguagePatterns.qualityTime) || []).length,
    actsOfService: (allUserText.match(loveLanguagePatterns.actsOfService) || []).length,
    physicalTouch: (allUserText.match(loveLanguagePatterns.physicalTouch) || []).length,
    receivingGifts: (allUserText.match(loveLanguagePatterns.receivingGifts) || []).length
  };
  
  // Detect topic interests
  const topicPatterns = {
    career: /\b(work|job|career|office|boss|colleague|professional|business)\b/gi,
    family: /\b(family|parents|mom|dad|mother|father|brother|sister|relative)\b/gi,
    friends: /\b(friend|buddy|dost|yaar|gang|group|social)\b/gi,
    romance: /\b(date|dating|relationship|love|partner|girlfriend|boyfriend|marriage)\b/gi,
    selfGrowth: /\b(improve|grow|learn|better|change|develop|goal|dream|aspiration)\b/gi,
    mentalHealth: /\b(stress|anxiety|depression|mental|therapy|peace|calm|meditat)\b/gi
  };
  
  const topicInterests: string[] = [];
  if (topicPatterns.career.test(allUserText)) topicInterests.push('Career & Work');
  if (topicPatterns.family.test(allUserText)) topicInterests.push('Family');
  if (topicPatterns.friends.test(allUserText)) topicInterests.push('Friendships');
  if (topicPatterns.romance.test(allUserText)) topicInterests.push('Romance & Dating');
  if (topicPatterns.selfGrowth.test(allUserText)) topicInterests.push('Personal Growth');
  if (topicPatterns.mentalHealth.test(allUserText)) topicInterests.push('Mental Wellness');
  
  // Determine communication style
  let communicationStyle = 'Friendly';
  if (avgMessageLength > 100) communicationStyle = 'Detailed & Expressive';
  else if (avgMessageLength > 50) communicationStyle = 'Thoughtful & Balanced';
  else if (avgMessageLength < 20) communicationStyle = 'Brief & Direct';
  
  if (questionRatio > 0.4) communicationStyle += ', Curious';
  if (hinglishUsage) communicationStyle += ', Culturally connected';
  
  // Determine engagement level
  let engagementLevel = 'Moderate';
  if (userMessages.length > 50) engagementLevel = 'Highly Engaged';
  else if (userMessages.length > 20) engagementLevel = 'Active';
  else if (userMessages.length < 10) engagementLevel = 'Getting Started';
  
  // Determine vulnerability level
  let vulnerabilityLevel = 'low';
  const vulnerabilityScore = emotionalPatterns.length;
  if (vulnerabilityScore >= 4) vulnerabilityLevel = 'high';
  else if (vulnerabilityScore >= 2) vulnerabilityLevel = 'medium';
  
  return {
    emotionalPatterns,
    communicationStyle,
    topicInterests,
    loveLanguageSignals,
    engagementLevel,
    hinglishUsage,
    avgMessageLength,
    questionRatio,
    vulnerabilityLevel
  };
}

// Calculate confidence score based on data quality
function calculateConfidenceScore(messageCount: number, behaviorAnalysis: any): number {
  let confidence = 0.25; // Base confidence
  
  // More messages = higher confidence
  if (messageCount >= 100) confidence += 0.35;
  else if (messageCount >= 50) confidence += 0.25;
  else if (messageCount >= 20) confidence += 0.15;
  else if (messageCount >= 10) confidence += 0.08;
  
  // Emotional patterns detected = better understanding
  confidence += Math.min(0.15, behaviorAnalysis.emotionalPatterns.length * 0.03);
  
  // Topic diversity = richer profile
  confidence += Math.min(0.1, behaviorAnalysis.topicInterests.length * 0.02);
  
  // Vulnerability shown = deeper connection
  if (behaviorAnalysis.vulnerabilityLevel === 'high') confidence += 0.1;
  else if (behaviorAnalysis.vulnerabilityLevel === 'medium') confidence += 0.05;
  
  // Cap at 0.95 (never 100% certain)
  return Math.min(0.95, Math.max(0.25, confidence));
}

// Determine primary love language from signals
function determineLoveLanguage(signals: Record<string, number>): string {
  const sorted = Object.entries(signals).sort(([,a], [,b]) => b - a);
  const topSignal = sorted[0];
  
  if (!topSignal || topSignal[1] === 0) return "Quality Time";
  
  const languageMap: Record<string, string> = {
    wordsOfAffirmation: "Words of Affirmation",
    qualityTime: "Quality Time",
    actsOfService: "Acts of Service",
    physicalTouch: "Physical Touch",
    receivingGifts: "Receiving Gifts"
  };
  
  return languageMap[topSignal[0]] || "Quality Time";
}

// Parse traits to ensure they have proper format (handles strings, objects, and "Trait - Description" format)
function parseTraits(traits: any[]): string[] {
  if (!Array.isArray(traits)) return [];
  
  return traits.slice(0, 3).map(trait => {
    // Handle object format: { name: "...", description: "..." }
    if (typeof trait === 'object' && trait !== null) {
      const name = trait.name || trait.trait || '';
      const description = trait.description || trait.desc || '';
      if (name && description) {
        return `${name} - ${description}`;
      }
      return name || String(trait);
    }
    
    // Handle string format
    if (typeof trait === 'string') {
      // If trait already has description format "Trait - Description", return as is
      if (trait.includes(' - ')) return trait;
      return trait.trim();
    }
    
    return String(trait);
  }).filter(t => t.length > 0);
}

// Generate smart summary from chat history using Groq with behavior analysis
async function generateSummaryFromChats(userId: string): Promise<{
  partnerTypeOneLiner: string;
  top3TraitsYouValue: string[];
  whatYouMightWorkOn: string[];
  nextTimeFocus: string[];
  loveLanguageGuess: string;
  communicationFit: string;
  confidenceScore: number;
} | null> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.error("[generateSummaryFromChats] GROQ_API_KEY not configured");
    return null;
  }

  // Fetch all messages for this user
  const { data: messages, error } = await supabase
    .from("messages")
    .select("role, text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(150);

  if (error || !messages || messages.length < 4) {
    console.log("[generateSummaryFromChats] Not enough messages to generate summary");
    return null;
  }

  // Analyze user behavior first
  const behaviorAnalysis = await analyzeUserBehavior(userId, messages);
  console.log("[generateSummaryFromChats] Behavior analysis:", JSON.stringify(behaviorAnalysis, null, 2));
  
  // Persist behavior analytics to Supabase (fire and forget)
  updateBehaviorAnalytics(userId, behaviorAnalysis).catch(err => 
    console.log("[generateSummaryFromChats] Behavior analytics update skipped:", err.message)
  );

  // Build transcript (last 80 messages for context)
  const recentMessages = messages.slice(-80);
  const transcript = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Riya'}: ${m.text}`)
    .join("\n");

  // Build behavior context for AI
  const behaviorContext = `
BEHAVIORAL ANALYSIS (from ${messages.length} messages):
- Communication Style: ${behaviorAnalysis.communicationStyle}
- Emotional Patterns Detected: ${behaviorAnalysis.emotionalPatterns.join(', ') || 'Still learning'}
- Topics They Discuss: ${behaviorAnalysis.topicInterests.join(', ') || 'General conversation'}
- Engagement Level: ${behaviorAnalysis.engagementLevel}
- Uses Hinglish: ${behaviorAnalysis.hinglishUsage ? 'Yes (Hindi-English mix)' : 'Primarily English'}
- Average Message Length: ${behaviorAnalysis.avgMessageLength} characters
- Question Asking Ratio: ${Math.round(behaviorAnalysis.questionRatio * 100)}%
- Emotional Openness: ${behaviorAnalysis.vulnerabilityLevel}
- Love Language Signals: Words of Affirmation (${behaviorAnalysis.loveLanguageSignals.wordsOfAffirmation}), Quality Time (${behaviorAnalysis.loveLanguageSignals.qualityTime}), Acts of Service (${behaviorAnalysis.loveLanguageSignals.actsOfService}), Physical Touch (${behaviorAnalysis.loveLanguageSignals.physicalTouch}), Receiving Gifts (${behaviorAnalysis.loveLanguageSignals.receivingGifts})
`;

  const prompt = `You are an expert relationship psychologist analyzing a user's conversations with Riya (an AI relationship companion for Indian men aged 24-28).

${behaviorContext}

RECENT CONVERSATION EXCERPT:
${transcript}

Based on this behavioral data and conversation, generate a personalized relationship profile. Consider:
1. Their communication patterns and what they reveal about attachment style
2. Emotional needs they express (directly or indirectly)
3. What kind of partner would complement their personality
4. Areas where they could grow in relationships
5. Their apparent love language based on how they express and seek connection

Provide a JSON response with:
1. "partnerTypeOneLiner": A warm, personalized one-liner about their ideal partner type (e.g., "You connect best with someone emotionally expressive who values deep, meaningful conversations")
2. "top3TraitsYouValue": Array of exactly 3 specific traits they value, with brief descriptions (e.g., ["Emotional understanding - Deep empathy and connection", "Playful communication - Light-hearted banter and fun", "Shared ambition - Supporting each other's dreams"])
3. "whatYouMightWorkOn": Array of 2-3 growth areas based on their patterns (be gentle and constructive, e.g., ["Opening up more about your feelings in moments of stress"])
4. "nextTimeFocus": Array of 2-3 suggested topics to explore (e.g., ["Love Language", "Attachment Style", "Future Goals"])
5. "loveLanguageGuess": Their primary love language based on the behavioral signals (one of: Words of Affirmation, Quality Time, Physical Touch, Acts of Service, Receiving Gifts)
6. "communicationFit": A brief, warm description of their communication style (e.g., "Thoughtful & Direct - You express yourself clearly while caring about how others feel")

IMPORTANT: 
- Be warm and encouraging, not clinical
- Use insights from the behavioral analysis
- Return ONLY valid JSON, no other text
- Make it personal to this specific user based on their actual patterns`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a warm, insightful relationship psychologist who helps people understand themselves better. You analyze behavioral patterns and provide personalized, encouraging insights. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("[generateSummaryFromChats] Groq API error:", await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[generateSummaryFromChats] Could not parse JSON from response");
      return null;
    }

    const summary = JSON.parse(jsonMatch[0]);
    
    // Calculate confidence based on actual data quality
    const confidenceScore = calculateConfidenceScore(messages.length, behaviorAnalysis);
    
    // Use behavior-derived love language as fallback
    const behaviorLoveLanguage = determineLoveLanguage(behaviorAnalysis.loveLanguageSignals);
    
    // Parse and validate traits
    const parsedTraits = parseTraits(summary.top3TraitsYouValue);
    const validTraits = parsedTraits.length >= 3 
      ? parsedTraits 
      : ["Emotional understanding", "Good communication", "Mutual respect"];
    
    return {
      partnerTypeOneLiner: summary.partnerTypeOneLiner || "You connect best with someone warm and emotionally available who values genuine connection.",
      top3TraitsYouValue: validTraits,
      whatYouMightWorkOn: Array.isArray(summary.whatYouMightWorkOn) 
        ? summary.whatYouMightWorkOn.slice(0, 3) 
        : ["Being more open about feelings", "Expressing needs clearly"],
      nextTimeFocus: Array.isArray(summary.nextTimeFocus) 
        ? summary.nextTimeFocus.slice(0, 3) 
        : ["Love Language", "Communication Style", "Relationship Goals"],
      loveLanguageGuess: summary.loveLanguageGuess || behaviorLoveLanguage,
      communicationFit: summary.communicationFit || behaviorAnalysis.communicationStyle,
      confidenceScore: confidenceScore,
    };
  } catch (error) {
    console.error("[generateSummaryFromChats] Error:", error);
    return null;
  }
}

// Update behavior analytics in Supabase
async function updateBehaviorAnalytics(userId: string, behaviorData: any): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_behavior_analytics")
      .upsert({
        user_id: userId,
        dominant_emotions: behaviorData.emotionalPatterns,
        frequently_discussed_topics: behaviorData.topicInterests,
        uses_hinglish: behaviorData.hinglishUsage,
        avg_message_length: behaviorData.avgMessageLength,
        question_asking_ratio: behaviorData.questionRatio,
        vulnerability_level: behaviorData.vulnerabilityLevel,
        words_of_affirmation_signals: behaviorData.loveLanguageSignals.wordsOfAffirmation,
        quality_time_signals: behaviorData.loveLanguageSignals.qualityTime,
        acts_of_service_signals: behaviorData.loveLanguageSignals.actsOfService,
        physical_touch_signals: behaviorData.loveLanguageSignals.physicalTouch,
        receiving_gifts_signals: behaviorData.loveLanguageSignals.receivingGifts,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (error) {
      console.log("[updateBehaviorAnalytics] Note: Behavior table may not exist yet:", error.message);
    }
  } catch (error) {
    console.log("[updateBehaviorAnalytics] Skipping behavior update:", error);
  }
}

// Update summary with specific values
router.post("/api/summary/update", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    if (!isSupabaseConfigured) {
      return res.status(400).json({ error: "Database not configured" });
    }

    const summaryData = req.body;
    
    const { error: upsertError } = await supabase
      .from("user_summary_latest")
      .upsert({
        user_id: userId,
        partner_type_one_liner: summaryData.partnerTypeOneLiner,
        top_3_traits_you_value: summaryData.top3TraitsYouValue,
        what_you_might_work_on: summaryData.whatYouMightWorkOn,
        next_time_focus: summaryData.nextTimeFocus,
        love_language_guess: summaryData.loveLanguageGuess,
        communication_fit: summaryData.communicationFit,
        confidence_score: summaryData.confidenceScore,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("[/api/summary/update] Upsert error:", upsertError);
      return res.status(500).json({ error: "Failed to update summary" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[/api/summary/update] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Generate and save summary endpoint
router.post("/api/summary/generate", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    if (!isSupabaseConfigured) {
      return res.status(400).json({ error: "Database not configured" });
    }

    console.log("[/api/summary/generate] Generating summary for user:", userId);
    
    const generatedSummary = await generateSummaryFromChats(userId);
    
    if (!generatedSummary) {
      return res.status(400).json({ 
        error: "Could not generate summary. Need more conversation history." 
      });
    }

    // Save to user_summary_latest table
    const { error: upsertError } = await supabase
      .from("user_summary_latest")
      .upsert({
        user_id: userId,
        partner_type_one_liner: generatedSummary.partnerTypeOneLiner,
        top_3_traits_you_value: generatedSummary.top3TraitsYouValue,
        what_you_might_work_on: generatedSummary.whatYouMightWorkOn,
        next_time_focus: generatedSummary.nextTimeFocus,
        love_language_guess: generatedSummary.loveLanguageGuess,
        communication_fit: generatedSummary.communicationFit,
        confidence_score: generatedSummary.confidenceScore,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("[/api/summary/generate] Upsert error:", upsertError);
      return res.status(500).json({ error: "Failed to save summary" });
    }

    console.log("[/api/summary/generate] Summary generated and saved successfully");
    
    res.json({
      success: true,
      summary: generatedSummary
    });
  } catch (error: any) {
    console.error("[/api/summary/generate] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/summary/latest", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;
    const autoGenerate = req.query.autoGenerate !== 'false';

    if (!isSupabaseConfigured) {
      return res.json({
        hasSummary: false,
        summary: null
      });
    }

    const { data: summary, error } = await supabase
      .from("user_summary_latest")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[/api/summary/latest] Supabase error:", error);
    }

    if (!summary) {
      // Check session for summary data
      const { data: latestSession } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestSession && latestSession.partner_type_one_liner) {
        return res.json({
          hasSummary: true,
          summary: {
            partnerTypeOneLiner: latestSession.partner_type_one_liner,
            top3TraitsYouValue: latestSession.top_3_traits_you_value || [],
            whatYouMightWorkOn: latestSession.what_you_might_work_on || [],
            nextTimeFocus: latestSession.next_time_focus || [],
            loveLanguageGuess: latestSession.love_language_guess,
            communicationFit: latestSession.communication_fit,
            confidenceScore: latestSession.confidence_score || 0.3,
            updatedAt: latestSession.updated_at || latestSession.created_at
          }
        });
      }

      // Auto-generate summary if requested and we have enough messages
      if (autoGenerate) {
        const { count: messageCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (messageCount && messageCount >= 4) {
          console.log("[/api/summary/latest] Auto-generating summary for user:", userId);
          const generatedSummary = await generateSummaryFromChats(userId);
          
          if (generatedSummary) {
            // Save to database
            await supabase
              .from("user_summary_latest")
              .upsert({
                user_id: userId,
                partner_type_one_liner: generatedSummary.partnerTypeOneLiner,
                top_3_traits_you_value: generatedSummary.top3TraitsYouValue,
                what_you_might_work_on: generatedSummary.whatYouMightWorkOn,
                next_time_focus: generatedSummary.nextTimeFocus,
                love_language_guess: generatedSummary.loveLanguageGuess,
                communication_fit: generatedSummary.communicationFit,
                confidence_score: generatedSummary.confidenceScore,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });

            return res.json({
              hasSummary: true,
              summary: {
                ...generatedSummary,
                updatedAt: new Date().toISOString()
              }
            });
          }
        }
      }

      return res.json({
        hasSummary: false,
        summary: null
      });
    }

    res.json({
      hasSummary: true,
      summary: {
        partnerTypeOneLiner: summary.partner_type_one_liner,
        top3TraitsYouValue: summary.top_3_traits_you_value || [],
        whatYouMightWorkOn: summary.what_you_might_work_on || [],
        nextTimeFocus: summary.next_time_focus || [],
        loveLanguageGuess: summary.love_language_guess,
        communicationFit: summary.communication_fit,
        confidenceScore: summary.confidence_score || 0.3,
        updatedAt: summary.updated_at
      }
    });
  } catch (error: any) {
    console.error("[/api/summary/latest] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/summary/stats", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    if (!isSupabaseConfigured) {
      return res.json({
        totalMessages: 0,
        totalSessions: 0,
        avgResponseTime: 0,
        lastSessionTime: null
      });
    }

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    const { data: usage } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    res.json({
      totalMessages: messageCount || usage?.total_messages || 0,
      totalSessions: sessions?.length || 0,
      totalCallSeconds: usage?.total_call_seconds || 0,
      lastSessionTime: sessions?.[0]?.started_at || null,
      sessions: sessions?.slice(0, 10) || []
    });
  } catch (error: any) {
    console.error("[/api/summary/stats] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/analytics", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId || DEV_USER_ID;

    if (!isSupabaseConfigured) {
      return res.json({
        engagement: {
          totalUsers: 1,
          activeUsers7d: 1,
          avgMessagesPerSession: 0,
          totalMessages: 0,
          voiceCallSessions: 0,
          voiceMinutes: 0
        },
        conversion: {
          premiumUsers: 0,
          freeToPaidConversion: 0,
          planBreakdown: {}
        },
        quality: {
          confidenceScore: 0.3
        }
      });
    }

    const { data: usage } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId);

    const { data: summary } = await supabase
      .from("user_summary_latest")
      .select("confidence_score")
      .eq("user_id", userId)
      .single();

    const chatSessions = sessions?.filter(s => s.type === "chat") || [];
    const callSessions = sessions?.filter(s => s.type === "call") || [];

    res.json({
      engagement: {
        totalUsers: 1,
        activeUsers7d: 1,
        avgMessagesPerSession: chatSessions.length > 0 
          ? Math.round((usage?.total_messages || 0) / chatSessions.length) 
          : 0,
        totalMessages: usage?.total_messages || 0,
        voiceCallSessions: callSessions.length,
        voiceMinutes: Math.round((usage?.total_call_seconds || 0) / 60)
      },
      conversion: {
        premiumUsers: 0,
        freeToPaidConversion: 0,
        planBreakdown: {}
      },
      quality: {
        confidenceScore: summary?.confidence_score || 0.3
      }
    });
  } catch (error: any) {
    console.error("[/api/analytics] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

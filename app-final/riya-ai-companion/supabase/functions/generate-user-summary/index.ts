import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Generate User Summary Edge Function
 * 
 * Analyzes all user conversations and generates a comprehensive
 * cumulative summary with personality insights, communication style,
 * and relationship understanding metrics.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Calculate understanding level based on session count
 * Uses diminishing returns - early sessions contribute more
 * 
 * Progression:
 * Session 1: 25%, Session 2: 35% (+10)
 * Sessions 3-4: +5 each, Sessions 5-6: +2.5 each
 * Sessions 7-8: +1.5 each, Sessions 9-10: +1 each
 * Sessions 11+: Decreasing increments, max 75%
 */
function calculateUnderstandingLevel(sessionCount: number): number {
  if (sessionCount <= 0) return 0;
  
  const BASE_LEVEL = 25;
  const MAX_LEVEL = 75;
  
  let level = BASE_LEVEL;
  
  for (let session = 2; session <= sessionCount; session++) {
    let increment: number;
    
    if (session === 2) increment = 10;
    else if (session <= 4) increment = 5;
    else if (session <= 6) increment = 2.5;
    else if (session <= 8) increment = 1.5;
    else if (session <= 10) increment = 1;
    else if (session <= 14) increment = 0.5;
    else if (session <= 20) increment = 0.25;
    else increment = 0.1;
    
    level += increment;
    
    if (level >= MAX_LEVEL) return MAX_LEVEL;
  }
  
  return Math.round(level * 10) / 10;
}

/**
 * Format messages into readable conversation history
 */
function formatConversationHistory(messages: any[]): string {
  if (!messages || messages.length === 0) {
    return "No conversation history available.";
  }
  
  return messages
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((msg) => {
      const timestamp = new Date(msg.created_at).toISOString();
      const role = msg.role === 'user' ? 'User' : 'Riya';
      return `[${timestamp}] ${role}: ${msg.content}`;
    })
    .join('\n');
}

/**
 * Call Groq API to analyze conversation and generate insights
 */
async function analyzeWithGroq(conversationHistory: string, groqApiKey: string): Promise<any> {
  const systemPrompt = `You are an expert relationship analyst AI. Analyze this cumulative conversation history between a user and their AI companion "Riya" and extract comprehensive insights about the user.

Return a valid JSON object with these exact fields:
{
  "cumulative_summary": "A 2-3 paragraph summary of who this user is based on all conversations",
  "ideal_partner_type": "Description of what kind of partner would suit this user",
  "user_personality_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "communication_style": "How the user communicates (direct, gentle, emotional, analytical, etc.)",
  "emotional_needs": ["need1", "need2", "need3"],
  "values": ["value1", "value2", "value3", "value4"],
  "interests": ["interest1", "interest2", "interest3"],
  "relationship_expectations": "What the user expects from relationships",
  "what_to_explore": ["topic1", "topic2", "topic3"],
  "suggested_conversation_starters": ["starter1", "starter2", "starter3"],
  "growth_areas": ["area1", "area2", "area3"],
  "engagement_level": "low | medium | high",
  "primary_conversation_theme": "The main theme across all conversations",
  "mood_pattern": "General mood pattern observed in conversations"
}

Be specific and cite actual conversation content where possible. If there's not enough data for a field, provide a reasonable inference based on available information. Always return valid JSON.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the complete conversation history to analyze:\n\n${conversationHistory}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Groq API Error]", response.status, errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in Groq response");
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error("[JSON Parse Error]", parseError, "Content:", content);
    throw new Error("Failed to parse Groq response as JSON");
  }
}

/**
 * Default insights when AI analysis fails or insufficient data
 */
function getDefaultInsights(): any {
  return {
    cumulative_summary: "Not enough conversation data to generate a comprehensive summary. Continue chatting to build understanding.",
    ideal_partner_type: "More conversations needed to determine",
    user_personality_traits: ["curious", "friendly"],
    communication_style: "conversational",
    emotional_needs: ["connection", "understanding"],
    values: ["honesty", "respect"],
    interests: [],
    relationship_expectations: "Building understanding through conversation",
    what_to_explore: ["personal interests", "relationship goals", "daily life"],
    suggested_conversation_starters: [
      "What made you smile today?",
      "Tell me about something you're passionate about",
      "What's been on your mind lately?"
    ],
    growth_areas: ["self-expression", "emotional awareness"],
    engagement_level: "medium",
    primary_conversation_theme: "Getting to know each other",
    mood_pattern: "neutral"
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-user-summary] Starting for user: ${userId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch all sessions for this user
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (sessionsError) {
      console.error("[Sessions Error]", sessionsError);
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    const sessionIds = sessions?.map(s => s.id) || [];
    const totalSessionsCount = sessionIds.length;

    console.log(`[generate-user-summary] Found ${totalSessionsCount} sessions`);

    // Step 2: Fetch all messages for these sessions
    let allMessages: any[] = [];
    
    if (sessionIds.length > 0) {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("id, session_id, role, content, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("[Messages Error]", messagesError);
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }

      allMessages = messages || [];
    }

    const totalMessagesCount = allMessages.length;
    console.log(`[generate-user-summary] Found ${totalMessagesCount} messages`);

    // Step 3: Check for existing summary
    const { data: existingSummary, error: summaryError } = await supabase
      .from("user_cumulative_summary")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (summaryError && summaryError.code !== "PGRST116") {
      console.error("[Existing Summary Error]", summaryError);
    }

    // Step 4: Generate insights
    let insights: any;
    
    if (totalMessagesCount < 5) {
      console.log("[generate-user-summary] Not enough messages, using defaults");
      insights = getDefaultInsights();
    } else if (!groqApiKey) {
      console.error("[generate-user-summary] GROQ_API_KEY not configured");
      insights = getDefaultInsights();
    } else {
      try {
        const conversationHistory = formatConversationHistory(allMessages);
        console.log(`[generate-user-summary] Analyzing ${conversationHistory.length} chars of conversation`);
        insights = await analyzeWithGroq(conversationHistory, groqApiKey);
        console.log("[generate-user-summary] Groq analysis complete");
      } catch (groqError) {
        console.error("[generate-user-summary] Groq analysis failed:", groqError);
        insights = getDefaultInsights();
      }
    }

    // Step 5: Calculate understanding level
    const understandingLevel = calculateUnderstandingLevel(totalSessionsCount);
    console.log(`[generate-user-summary] Understanding level: ${understandingLevel}%`);

    // Step 6: Prepare data for save
    const summaryData = {
      user_id: userId,
      cumulative_summary: insights.cumulative_summary,
      all_sessions_context: {
        session_ids: sessionIds,
        first_session: sessions?.[0]?.created_at || null,
        last_session: sessions?.[sessions.length - 1]?.created_at || null,
        analyzed_at: new Date().toISOString()
      },
      ideal_partner_type: insights.ideal_partner_type,
      user_personality_traits: insights.user_personality_traits || [],
      communication_style: insights.communication_style,
      emotional_needs: insights.emotional_needs || [],
      values: insights.values || [],
      interests: insights.interests || [],
      relationship_expectations: insights.relationship_expectations,
      what_to_explore: insights.what_to_explore || [],
      suggested_conversation_starters: insights.suggested_conversation_starters || [],
      growth_areas: insights.growth_areas || [],
      understanding_level: understandingLevel,
      total_sessions_count: totalSessionsCount,
      total_messages_count: totalMessagesCount,
      engagement_level: insights.engagement_level,
      primary_conversation_theme: insights.primary_conversation_theme,
      mood_pattern: insights.mood_pattern,
      updated_at: new Date().toISOString(),
      last_analysis_at: new Date().toISOString()
    };

    // Step 7: Save to database (upsert)
    let savedSummary;
    
    if (existingSummary) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from("user_cumulative_summary")
        .update(summaryData)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("[Update Error]", updateError);
        throw new Error(`Failed to update summary: ${updateError.message}`);
      }
      
      savedSummary = updated;
      console.log("[generate-user-summary] Updated existing summary");
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from("user_cumulative_summary")
        .insert(summaryData)
        .select()
        .single();

      if (insertError) {
        console.error("[Insert Error]", insertError);
        throw new Error(`Failed to insert summary: ${insertError.message}`);
      }
      
      savedSummary = inserted;
      console.log("[generate-user-summary] Created new summary");
    }

    // Step 8: Return success response
    return new Response(
      JSON.stringify({
        success: true,
        summary: savedSummary,
        message: "User summary generated successfully",
        stats: {
          sessions_analyzed: totalSessionsCount,
          messages_analyzed: totalMessagesCount,
          understanding_level: understandingLevel
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("[generate-user-summary] Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: "Failed to generate user summary"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

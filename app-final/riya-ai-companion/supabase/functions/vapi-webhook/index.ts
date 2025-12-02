import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface VapiWebhookPayload {
  type: string;
  call?: {
    id: string;
    customerId?: string;
    startedAt?: string;
    endedAt?: string;
    status?: string;
    transcript?: string;
    duration?: number;
    analysis?: {
      summary?: string;
      structuredData?: Record<string, unknown>;
    };
  };
  message?: {
    role: string;
    content: string;
    timestamp: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: VapiWebhookPayload = await req.json();
    console.log("Vapi webhook received:", payload.type);

    const eventType = payload.type;
    const call = payload.call;

    switch (eventType) {
      case "call-started":
        if (call) {
          await supabaseClient.from("user_events").insert({
            event_type: "call_started",
            user_id: call.customerId || null,
            metadata: {
              vapi_call_id: call.id,
              started_at: call.startedAt,
            },
          });
        }
        break;

      case "call-ended":
        if (call) {
          const { data: existingSession } = await supabaseClient
            .from("call_sessions")
            .select("id, user_id")
            .eq("vapi_call_id", call.id)
            .single();

          if (existingSession) {
            await supabaseClient
              .from("call_sessions")
              .update({
                ended_at: call.endedAt || new Date().toISOString(),
                duration_seconds: call.duration || 0,
                status: "completed",
                transcript: call.transcript || null,
                metadata: {
                  vapi_status: call.status,
                  analysis: call.analysis,
                },
              })
              .eq("id", existingSession.id);

            if (call.duration && call.duration > 0) {
              const { data: currentUsage } = await supabaseClient
                .from("usage_stats")
                .select("call_duration_seconds")
                .eq("user_id", existingSession.user_id)
                .single();

              const currentSeconds = currentUsage?.call_duration_seconds || 0;

              await supabaseClient
                .from("usage_stats")
                .upsert({
                  user_id: existingSession.user_id,
                  call_duration_seconds: currentSeconds + call.duration,
                  last_call_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: "user_id" });
            }
          }

          await supabaseClient.from("user_events").insert({
            event_type: "call_ended",
            user_id: call.customerId || null,
            metadata: {
              vapi_call_id: call.id,
              duration: call.duration,
              transcript_available: !!call.transcript,
            },
          });
        }
        break;

      case "transcript":
        if (call && payload.message) {
          await supabaseClient.from("user_events").insert({
            event_type: "call_transcript",
            user_id: call.customerId || null,
            metadata: {
              vapi_call_id: call.id,
              role: payload.message.role,
              content: payload.message.content,
              timestamp: payload.message.timestamp,
            },
          });
        }
        break;

      case "hang":
        if (call) {
          await supabaseClient.from("user_events").insert({
            event_type: "call_hang",
            user_id: call.customerId || null,
            metadata: {
              vapi_call_id: call.id,
              reason: "user_hang",
            },
          });
        }
        break;

      case "speech-update":
        break;

      default:
        console.log("Unhandled Vapi webhook type:", eventType);
        await supabaseClient.from("user_events").insert({
          event_type: `vapi_${eventType}`,
          metadata: {
            payload: payload,
          },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Vapi webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

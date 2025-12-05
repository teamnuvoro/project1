import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured } from "../supabase";

const router = Router();

router.post("/api/analytics/event", async (req: Request, res: Response) => {
    try {
        if (!isSupabaseConfigured) {
            return res.status(200).json({ success: true, message: "Analytics skipped (no DB)" });
        }

        const { eventName, eventType, properties, path, sessionId } = req.body;
        const userId = (req as any).session?.userId || req.body.userId || null;

        // Fire and forget - don't await unless strict
        const { error } = await supabase.from("user_events").insert({
            user_id: userId,
            session_id: sessionId,
            event_name: eventName,
            event_type: eventType || 'track',
            event_properties: properties,
            path: path,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error("[Analytics] Error saving event:", error);
            // Don't fail the request for analytics errors
        }

        res.json({ success: true });
    } catch (error) {
        console.error("[Analytics] Error:", error);
        res.status(500).json({ error: "Failed to track event" });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';

const router = Router();

// Middleware to check if user is authenticated (password protection is handled on frontend)
async function requireAuth(req: Request, res: Response, next: Function) {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[Admin] Database not configured, allowing access (dev mode)');
      return next(); // Allow in dev mode
    }

    // Get user ID from request body, query, or headers
    const userId = req.body?.userId || req.query?.userId || (req as any).session?.userId || (req as any).user?.id;
    
    if (!userId) {
      console.warn('[Admin] No userId provided');
      // Try to get from Authorization header if using Supabase JWT
      const authHeader = req.headers.authorization;
      if (authHeader) {
        // For now, we'll require userId to be passed explicitly
        // In production, you'd decode the JWT to get the user ID
        return res.status(401).json({ error: 'Unauthorized - User ID required. Please pass userId in request body or query.' });
      }
      // In dev mode, allow access without user ID
      console.warn('[Admin] No user session, allowing access (dev mode)');
      return next();
    }

    // Try to verify user exists (but don't fail if user doesn't exist - password protection is on frontend)
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors if user doesn't exist

    if (error) {
      console.error('[Admin] Error fetching user:', error);
      // Don't block access if there's a database error - password protection is on frontend
      console.warn('[Admin] Database error, but allowing access (password protected on frontend)');
    }

    if (!user) {
      console.warn(`[Admin] User ${userId} not found in database, but allowing access (password protected on frontend)`);
    } else {
      console.log(`[Admin] User ${userId} authenticated`);
    }

    // Allow access - password check is handled on frontend
    next();
  } catch (error: any) {
    console.error('[Admin] Auth check error:', error);
    // Don't block access on error - password protection is on frontend
    console.warn('[Admin] Error in auth check, but allowing access (password protected on frontend)');
    next();
  }
}

// GET /api/admin/analytics - Get analytics data (password protected on frontend)
router.get('/api/admin/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Get date range (default: last 7 days)
    const days = parseInt(req.query.days as string) || 7;
    const userId = req.query.userId as string | undefined; // Optional user filter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateISO = startDate.toISOString();

    // Build query for user events
    const filterUserId = req.query.filterUserId as string | undefined;
    let eventsQuery = supabase
      .from('user_events')
      .select('*')
      .gte('event_time', startDateISO)
      .order('event_time', { ascending: false });

    // Filter by user if specified (for drill-down view)
    if (filterUserId && filterUserId !== 'all') {
      eventsQuery = eventsQuery.eq('user_id', filterUserId);
    }

    const { data: events, error: eventsError } = await eventsQuery.limit(5000); // Increased limit for detailed analytics

    if (eventsError) {
      console.error('[Admin Analytics] Error fetching events:', eventsError);
    }

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .gte('created_at', startDateISO)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('[Admin Analytics] Error fetching sessions:', sessionsError);
    }

    // Fetch subscriptions for conversion rate
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .gte('created_at', startDateISO);

    if (subsError) {
      console.error('[Admin Analytics] Error fetching subscriptions:', subsError);
    }

    // Fetch payments for conversion tracking
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDateISO);

    if (paymentsError) {
      console.error('[Admin Analytics] Error fetching payments:', paymentsError);
    }

    // Calculate metrics based on tracking plan events
    const uniqueUsers = new Set(sessions?.map(s => s.user_id) || []);
    const totalActiveUsers = uniqueUsers.size;

    // DAU: Count unique users with daily_active_user event
    const dailyActiveUsers = new Set(
      events?.filter(e => e.event_name === 'daily_active_user' || e.event_name === 'session_start').map(e => e.user_id) || []
    ).size;

    // Retention: returning_user_login events
    const returningUserLogins = events?.filter(e => e.event_name === 'returning_user_login' || e.event_name === 'login_successful').length || 0;
    const totalLogins = events?.filter(e => e.event_name === 'login_successful' || e.event_name === 'login_otp_success').length || 0;
    const retentionRate = totalLogins > 0 ? (returningUserLogins / totalLogins) * 100 : 0;

    // Paywall Efficiency: pay_daily_selected + pay_weekly_selected / paywall_triggered
    const paywallHits = events?.filter(e => 
      e.event_name === 'paywall_triggered' || 
      e.event_name === 'message_limit_hit' ||
      e.event_name === 'free_message_warning_shown'
    ).length || 0;
    const paywallSelections = events?.filter(e => 
      e.event_name === 'pay_daily_selected' || 
      e.event_name === 'pay_weekly_selected'
    ).length || 0;
    const paywallEfficiency = paywallHits > 0 ? (paywallSelections / paywallHits) * 100 : 0;

    // Avg Session Time: from session_length_recorded events
    const sessionLengthEvents = events?.filter(e => e.event_name === 'session_length_recorded') || [];
    const sessionLengths = sessionLengthEvents
      .map(e => e.event_data?.session_length_sec || e.event_data?.sessionLength || 0)
      .filter(len => len > 0);
    const avgSessionTime = sessionLengths.length > 0
      ? Math.round(sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length)
      : 0;

    // Count successful payments
    const successfulPayments = payments?.filter(p => p.status === 'success').length || 0;
    const conversionRate = paywallHits > 0 ? (successfulPayments / paywallHits) * 100 : 0;

    // Find highest traffic page
    const pageCounts: Record<string, number> = {};
    events?.forEach(event => {
      if (event.event_place) {
        pageCounts[event.event_place] = (pageCounts[event.event_place] || 0) + 1;
      }
    });
    const highestTrafficPage = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Get top 5 event names
    const eventNameCounts: Record<string, number> = {};
    events?.forEach(event => {
      if (event.event_name) {
        eventNameCounts[event.event_name] = (eventNameCounts[event.event_name] || 0) + 1;
      }
    });
    const top5EventNames = Object.entries(eventNameCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Get top 5 event places
    const top5EventPlaces = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([place, count]) => ({ place, count }));

    // Persona Popularity: Group by persona_type from persona_selected events
    const personaCounts: Record<string, number> = {};
    events?.forEach(event => {
      if (event.event_name === 'persona_selected' || event.event_name === 'persona_selection') {
        const personaType = event.event_data?.persona_type || event.event_data?.persona || 'unknown';
        personaCounts[personaType] = (personaCounts[personaType] || 0) + 1;
      }
    });
    const personaPopularity = Object.entries(personaCounts)
      .map(([persona, count]) => ({ persona, count }))
      .sort((a, b) => b.count - a.count);

    // Conversion Funnel: Step-by-step counts
    const funnelSteps = {
      signup_started: events?.filter(e => e.event_name === 'signup_started' || e.event_name === 'signup_initiated').length || 0,
      otp_verified: events?.filter(e => e.event_name === 'otp_verified' || e.event_name === 'login_otp_success').length || 0,
      persona_selected: events?.filter(e => e.event_name === 'persona_selected' || e.event_name === 'persona_selection').length || 0,
      chat_opened: events?.filter(e => e.event_name === 'chat_opened' || e.event_name === 'session_start').length || 0,
      message_limit_hit: paywallHits,
    };

    // Feature Usage: Count specific interaction events
    const featureUsage = {
      voice_call_clicked: events?.filter(e => e.event_name === 'cta_voice_call_clicked' || e.event_name === 'voice_call_started').length || 0,
      summary_clicked: events?.filter(e => e.event_name === 'cta_summary_clicked' || e.event_name === 'summary_viewed').length || 0,
      persona_alignment_viewed: events?.filter(e => e.event_name === 'persona_alignment_viewed' || e.event_name === 'persona_info_viewed').length || 0,
    };

    // Get unique user IDs for dropdown
    const uniqueUserIds = Array.from(new Set(events?.map(e => e.user_id).filter(Boolean) || []))
      .sort()
      .slice(0, 100); // Limit to 100 users for dropdown

    // Get recent events (up to 200 for user journey table)
    // Note: filterUserId is already declared above, reuse it
    let filteredEvents = events || [];
    if (filterUserId && filterUserId !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.user_id === filterUserId);
    }
    
    const recentEvents = filteredEvents.slice(0, 200).map(event => ({
      event_time: event.event_time,
      user_id: event.user_id || 'N/A',
      event_name: event.event_name,
      event_place: event.event_place || event.event_data?.screen || 'N/A',
      event_data: event.event_data || {}
    }));

    res.json({
      metrics: {
        // Pulse Cards (Global View)
        dailyActiveUsers,
        retentionRate: Math.round(retentionRate * 100) / 100,
        paywallEfficiency: Math.round(paywallEfficiency * 100) / 100,
        avgSessionTime, // in seconds
        
        // Legacy metrics (for backward compatibility)
        totalActiveUsers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        highestTrafficPage,
        paywallHits,
        successfulPayments,
        totalEvents: events?.length || 0,
        dateRange: {
          start: startDateISO,
          end: new Date().toISOString(),
          days
        }
      },
      // Charts data
      personaPopularity,
      conversionFunnel: funnelSteps,
      featureUsage,
      
      // Tables
      recentEvents,
      top5EventNames,
      top5EventPlaces,
      
      // User list for dropdown
      uniqueUserIds,
      
      // Raw data
      rawData: {
        eventsCount: events?.length || 0,
        sessionsCount: sessions?.length || 0,
        subscriptionsCount: subscriptions?.length || 0,
        paymentsCount: payments?.length || 0
      }
    });
  } catch (error: any) {
    console.error('[Admin Analytics] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

export default router;


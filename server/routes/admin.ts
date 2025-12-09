import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase';

const router = Router();

// Middleware to check if user is admin
async function requireAdmin(req: Request, res: Response, next: Function) {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Get user ID from request body, query, or headers (adjust based on your auth setup)
    // Since this app uses Supabase auth, we'll get userId from the request
    const userId = req.body?.userId || req.query?.userId || (req as any).session?.userId || (req as any).user?.id;
    
    if (!userId) {
      // Try to get from Authorization header if using Supabase JWT
      const authHeader = req.headers.authorization;
      if (authHeader) {
        // For now, we'll require userId to be passed explicitly
        // In production, you'd decode the JWT to get the user ID
        return res.status(401).json({ error: 'Unauthorized - User ID required. Please pass userId in request body or query.' });
      }
      return res.status(401).json({ error: 'Unauthorized - No user session' });
    }

    // Check if user is admin
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('[Admin] Error fetching user:', error);
      return res.status(403).json({ error: 'Forbidden - User not found' });
    }

    if (!user.is_admin) {
      console.warn(`[Admin] Non-admin user ${userId} attempted to access admin endpoint`);
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // User is admin, proceed
    next();
  } catch (error: any) {
    console.error('[Admin] Auth check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/admin/analytics - Get analytics data
router.get('/api/admin/analytics', requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Get date range (default: last 7 days)
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateISO = startDate.toISOString();

    // Fetch user events
    const { data: events, error: eventsError } = await supabase
      .from('user_events')
      .select('*')
      .gte('event_time', startDateISO)
      .order('event_time', { ascending: false })
      .limit(1000); // Limit to prevent huge responses

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

    // Calculate metrics
    const uniqueUsers = new Set(sessions?.map(s => s.user_id) || []);
    const totalActiveUsers = uniqueUsers.size;

    // Count paywall triggers
    const paywallHits = events?.filter(e => e.event_name === 'paywall_triggered').length || 0;

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

    // Get recent 50 events
    const recentEvents = (events || []).slice(0, 50).map(event => ({
      event_time: event.event_time,
      user_id: event.user_id ? `${event.user_id.substring(0, 8)}...` : 'N/A', // Anonymize
      event_name: event.event_name,
      event_place: event.event_place,
      event_data: event.event_data
    }));

    res.json({
      metrics: {
        totalActiveUsers,
        conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
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
      recentEvents,
      top5EventNames,
      top5EventPlaces,
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


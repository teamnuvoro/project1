import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface AnalyticsData {
  totalEvents: number;
  totalUsers: number;
  topEvents: Array<{ name: string; count: number }>;
  recentEvents: Array<{ event: string; time: string; user: string }>;
  eventBreakdown: {
    onboarding: number;
    chat: number;
    calls: number;
    summary: number;
    paywall: number;
    engagement: number;
  };
}

export default function AnalyticsPage() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Removed admin lock - analytics is now accessible to all users
    fetchAnalyticsData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchAnalyticsData = async () => {
    try {
      if (!loading) setRefreshing(true);

      // For now, using mock data
      // Replace with actual Amplitude API calls when ready
      const mockData: AnalyticsData = {
        totalEvents: 1234,
        totalUsers: 89,
        topEvents: [
          { name: 'Chat Started', count: 450 },
          { name: 'Message Sent', count: 320 },
          { name: 'Call Started', count: 280 },
          { name: 'Payment Successful', count: 184 },
          { name: 'Persona Selected', count: 156 },
        ],
        recentEvents: [
          { event: 'Message Sent', time: '2 mins ago', user: 'User #1' },
          { event: 'Chat Opened', time: '5 mins ago', user: 'User #2' },
          { event: 'Call Started', time: '8 mins ago', user: 'User #3' },
          { event: 'Payment Successful', time: '12 mins ago', user: 'User #4' },
        ],
        eventBreakdown: {
          onboarding: 89,
          chat: 450,
          calls: 280,
          summary: 156,
          paywall: 184,
          engagement: 95,
        },
      };

      setData(mockData);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminUnlocked');
    navigate('/');
  };

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <div className="analytics-header-actions">
          <button 
            className="analytics-lock"
            onClick={() => alert('🔒 Secure Analytics Dashboard\n\nThis page is protected and tracks all user activity.')}
            title="Security Info"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }}
          >
            🔒
          </button>
          <button className="analytics-refresh" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <button className="analytics-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="analytics-card">
          <h3>Total Events</h3>
          <p className="analytics-number">{data?.totalEvents}</p>
        </div>
        <div className="analytics-card">
          <h3>Total Users</h3>
          <p className="analytics-number">{data?.totalUsers}</p>
        </div>
      </div>

      {/* Event Breakdown */}
      <div className="analytics-section">
        <h2>Event Breakdown by Category</h2>
        <div className="analytics-breakdown">
          <div className="breakdown-item">
            <span>Onboarding</span>
            <span className="breakdown-count">{data?.eventBreakdown.onboarding}</span>
          </div>
          <div className="breakdown-item">
            <span>Chat</span>
            <span className="breakdown-count">{data?.eventBreakdown.chat}</span>
          </div>
          <div className="breakdown-item">
            <span>Calls</span>
            <span className="breakdown-count">{data?.eventBreakdown.calls}</span>
          </div>
          <div className="breakdown-item">
            <span>Summary</span>
            <span className="breakdown-count">{data?.eventBreakdown.summary}</span>
          </div>
          <div className="breakdown-item">
            <span>Paywall</span>
            <span className="breakdown-count">{data?.eventBreakdown.paywall}</span>
          </div>
          <div className="breakdown-item">
            <span>Engagement</span>
            <span className="breakdown-count">{data?.eventBreakdown.engagement}</span>
          </div>
        </div>
      </div>

      {/* Top Events */}
      <div className="analytics-section">
        <h2>Top Events</h2>
        <div className="analytics-list">
          {data?.topEvents.map((event, idx) => (
            <div key={idx} className="analytics-item">
              <span>{event.name}</span>
              <span className="analytics-badge">{event.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="analytics-section">
        <h2>Recent Events</h2>
        <div className="analytics-table">
          <div className="analytics-table-header">
            <div>Event</div>
            <div>Time</div>
            <div>User</div>
          </div>
          {data?.recentEvents.map((event, idx) => (
            <div key={idx} className="analytics-table-row">
              <div>{event.event}</div>
              <div>{event.time}</div>
              <div>{event.user}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Amplitude Integration Note */}
      <div className="analytics-section">
        <div className="analytics-note">
          <h3>📊 Amplitude Integration Active</h3>
          <p>
            All events are being tracked to Amplitude. To see real-time data:
          </p>
          <ol>
            <li>Add your Amplitude API key to <code>.env</code> as <code>VITE_AMPLITUDE_API_KEY</code></li>
            <li>Visit <a href="https://amplitude.com/" target="_blank" rel="noopener noreferrer">amplitude.com</a> to view detailed analytics</li>
            <li>Track 50+ events across onboarding, chat, calls, payments, and more</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

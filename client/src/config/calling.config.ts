// Calling API Configuration
// Replace these values with your actual API credentials when ready for production

export const CallingConfig = {
  // Choose your provider: 'daily' | 'agora' | 'twilio' | '100ms' | 'demo' | 'vapi'
  provider: 'vapi', // Using Vapi for AI voice calls
  
  // Daily.co Configuration
  daily: {
    apiKey: import.meta.env.VITE_DAILY_API_KEY || 'YOUR_DAILY_API_KEY',
    apiUrl: 'https://api.daily.co/v1'
  },
  
  // Agora Configuration
  agora: {
    appId: import.meta.env.VITE_AGORA_APP_ID || 'YOUR_AGORA_APP_ID',
    appCertificate: import.meta.env.AGORA_APP_CERTIFICATE || 'YOUR_AGORA_CERTIFICATE'
  },
  
  // Twilio Configuration
  twilio: {
    accountSid: import.meta.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
    authToken: import.meta.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN',
    apiKeySid: import.meta.env.TWILIO_API_KEY_SID || 'YOUR_TWILIO_API_KEY_SID',
    apiKeySecret: import.meta.env.TWILIO_API_KEY_SECRET || 'YOUR_TWILIO_API_SECRET'
  },
  
  // 100ms Configuration
  hms: {
    appId: import.meta.env.VITE_HMS_APP_ID || 'YOUR_100MS_APP_ID',
    appSecret: import.meta.env.HMS_APP_SECRET || 'YOUR_100MS_APP_SECRET'
  },
  
  // Call Settings
  settings: {
    maxCallDuration: 3600, // 1 hour in seconds
    defaultVideoQuality: 'high', // 'low' | 'medium' | 'high'
    enableRecording: false,
    enableScreenShare: false,
    autoStartVideo: true,
    autoStartAudio: true
  }
};

// Helper function to check if using demo mode
export const isDemoMode = () => CallingConfig.provider === 'demo';

// Helper function to get API credentials for current provider
export const getApiConfig = () => {
  switch (CallingConfig.provider) {
    case 'daily':
      return CallingConfig.daily;
    case 'agora':
      return CallingConfig.agora;
    case 'twilio':
      return CallingConfig.twilio;
    case '100ms':
      return CallingConfig.hms;
    case 'vapi':
      return { provider: 'vapi' };
    default:
      return null;
  }
};


// Call Service Utilities
// These functions help manage calling sessions and rooms

import { CallingConfig, isDemoMode } from '../config/calling.config';

interface CallRoom {
  id: string;
  url: string;
  createdAt: Date;
  expiresAt: Date;
}

interface CallSession {
  roomId: string;
  participants: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  callType: 'audio' | 'video';
}

/**
 * Creates a new call room
 * In production, this should call your backend API which then calls the video provider's API
 */
export const createCallRoom = async (callType: 'audio' | 'video'): Promise<CallRoom> => {
  if (isDemoMode()) {
    // Demo mode - return mock room
    return {
      id: `demo-room-${Date.now()}`,
      url: 'demo://local-call',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };
  }

  // In production, call your backend endpoint
  try {
    const response = await fetch('/api/create-call-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callType,
        provider: CallingConfig.provider
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create call room');
    }

    const data = await response.json();
    return data.room;
  } catch (error) {
    console.error('Error creating call room:', error);
    throw error;
  }
};

/**
 * Invites the AI to join the call
 * This would trigger your AI backend to join the room
 */
export const inviteAIToCall = async (roomId: string, aiName: string): Promise<boolean> => {
  if (isDemoMode()) {
    // In demo mode, simulate AI joining
    console.log(`AI ${aiName} joining room ${roomId}`);
    return true;
  }

  try {
    const response = await fetch('/api/invite-ai-to-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        aiName
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error inviting AI to call:', error);
    return false;
  }
};

/**
 * Logs call session for analytics
 */
export const logCallSession = async (session: CallSession): Promise<void> => {
  if (isDemoMode()) {
    console.log('Call session:', session);
    return;
  }

  try {
    await fetch('/api/log-call-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session)
    });
  } catch (error) {
    console.error('Error logging call session:', error);
  }
};

/**
 * Ends a call and cleans up resources
 */
export const endCall = async (roomId: string): Promise<void> => {
  if (isDemoMode()) {
    console.log(`Ending call in room ${roomId}`);
    return;
  }

  try {
    await fetch('/api/end-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId })
    });
  } catch (error) {
    console.error('Error ending call:', error);
  }
};

/**
 * Gets call quality metrics
 */
export const getCallQualityMetrics = () => {
  // This would integrate with your video provider's quality APIs
  return {
    videoQuality: 'high',
    audioQuality: 'excellent',
    latency: 45, // ms
    packetLoss: 0.1 // percentage
  };
};

/**
 * Helper to check browser compatibility
 */
export const checkBrowserCompatibility = () => {
  const isWebRTCSupported = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );

  const isVideoSupported = !!(
    HTMLVideoElement &&
    HTMLVideoElement.prototype.canPlayType
  );

  return {
    isSupported: isWebRTCSupported && isVideoSupported,
    webRTC: isWebRTCSupported,
    video: isVideoSupported,
    browser: getBrowserInfo()
  };
};

/**
 * Get browser information
 */
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edge') > -1) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
  }

  return { name: browserName, version: browserVersion };
};

/**
 * Request camera and microphone permissions
 */
export const requestMediaPermissions = async (includeVideo: boolean = true) => {
  try {
    const constraints = {
      audio: true,
      video: includeVideo ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Stop all tracks after permission granted
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true, error: null };
  } catch (error: any) {
    return { 
      granted: false, 
      error: error.name === 'NotAllowedError' 
        ? 'Permission denied by user' 
        : 'Media devices not available'
    };
  }
};


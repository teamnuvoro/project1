import * as amplitude from '@amplitude/analytics-browser';

// Initialize Amplitude (call this in App.tsx)
export const initAmplitude = (apiKey: string) => {
  amplitude.init(apiKey, {
    trackingOptions: {
      ipAddress: true,
      locale: true,
    },
  });
};

// ============================================
// SECTION 1: ONBOARDING & AUTHENTICATION
// ============================================

export const trackSignupStarted = (deviceType: string) => {
  amplitude.track('signup_started', {
    device_type: deviceType,
    screen_name: 'Signup',
    timestamp: new Date().toISOString(),
  });
};

export const trackSignupCompleted = (nameLength: number, gender: string) => {
  amplitude.track('signup_completed', {
    name_length: nameLength,
    gender: gender,
    timestamp: new Date().toISOString(),
  });
};

export const trackOtpSent = (userEmail: string) => {
  amplitude.track('otp_sent', {
    delivery_method: 'email',
    user_email: userEmail,
    timestamp: new Date().toISOString(),
  });
};

export const trackOtpVerified = (attemptCount: number) => {
  amplitude.track('otp_verified', {
    attempt_count: attemptCount,
    timestamp: new Date().toISOString(),
  });
};

export const trackLoginSuccessful = (isReturningUser: boolean, userId: string) => {
  amplitude.setUserId(userId);
  amplitude.track('login_successful', {
    returning_user: isReturningUser,
    timestamp: new Date().toISOString(),
  });
};

export const trackPersonaSelectionOpened = (previousPersona?: string) => {
  amplitude.track('persona_selection_opened', {
    screen_name: 'Persona Selection',
    previous_persona: previousPersona || null,
    timestamp: new Date().toISOString(),
  });
};

export const trackPersonaSelected = (personaType: 'sweet' | 'playful' | 'bold' | 'mature') => {
  amplitude.track('persona_selected', {
    persona_type: personaType,
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 2: CHAT EVENTS
// ============================================

export const trackChatOpened = (personaType: string, isPremium: boolean) => {
  amplitude.track('chat_opened', {
    persona_type: personaType,
    is_premium: isPremium,
    screen_name: 'Chat',
    timestamp: new Date().toISOString(),
  });
};

export const trackMessageSent = (messageLength: number, sessionNumber: number) => {
  amplitude.track('message_sent', {
    message_length: messageLength,
    session_number: sessionNumber,
    timestamp: new Date().toISOString(),
  });
};

export const trackMessageReceived = (responseLength: number, latencyMs: number) => {
  amplitude.track('message_received', {
    response_length: responseLength,
    latency_ms: latencyMs,
    timestamp: new Date().toISOString(),
  });
};

export const trackTypingIndicatorShown = (durationMs: number) => {
  amplitude.track('typing_indicator_shown', {
    duration_ms: durationMs,
    timestamp: new Date().toISOString(),
  });
};

export const trackFreeMessageWarningShown = (messageCount: number) => {
  amplitude.track('free_message_warning_shown', {
    message_count: messageCount,
    timestamp: new Date().toISOString(),
  });
};

export const trackMessageLimitHit = (totalMessagesSent: number) => {
  amplitude.track('message_limit_hit', {
    total_messages_sent: totalMessagesSent,
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 3: VOICE CALL EVENTS
// ============================================

export const trackCallButtonClicked = (personaType: string) => {
  amplitude.track('call_button_clicked', {
    persona_type: personaType,
    screen_name: 'Chat',
    timestamp: new Date().toISOString(),
  });
};

export const trackCallStarted = (sessionNumber: number, callSessionId: string) => {
  amplitude.track('call_started', {
    session_number: sessionNumber,
    call_session_id: callSessionId,
    screen_name: 'Call',
    timestamp: new Date().toISOString(),
  });
};

export const trackCallTranscriptReceived = (transcriptLength: number) => {
  amplitude.track('call_transcript_received', {
    transcript_length: transcriptLength,
    timestamp: new Date().toISOString(),
  });
};

export const trackCallAiResponseGenerated = (responseLength: number) => {
  amplitude.track('call_ai_response_generated', {
    response_length: responseLength,
    timestamp: new Date().toISOString(),
  });
};

export const trackCallDurationUpdated = (durationSecs: number) => {
  amplitude.track('call_duration_updated', {
    duration_sec: durationSecs,
    screen_name: 'Call',
    timestamp: new Date().toISOString(),
  });
};

export const trackFreeCallWarningShown = (durationSecs: number) => {
  amplitude.track('free_call_warning_shown', {
    duration_sec: durationSecs,
    timestamp: new Date().toISOString(),
  });
};

export const trackCallLimitHit = (durationSecs: number) => {
  amplitude.track('call_limit_hit', {
    duration_sec: durationSecs,
    timestamp: new Date().toISOString(),
  });
};

export const trackCallEnded = (totalDurationSec: number, endedByUser: boolean, reason: string) => {
  amplitude.track('call_ended', {
    total_duration_sec: totalDurationSec,
    ended_by_user: endedByUser,
    reason: reason,
    screen_name: 'Call',
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 4: SUMMARY PAGE EVENTS
// ============================================

export const trackSummaryPageOpened = (fromScreen: string, sessionId: string) => {
  amplitude.track('summary_page_opened', {
    from_screen: fromScreen,
    session_id: sessionId,
    screen_name: 'Summary',
    timestamp: new Date().toISOString(),
  });
};

export const trackSummaryConfidenceViewed = (confidenceScore: number) => {
  amplitude.track('summary_confidence_viewed', {
    confidence_score: confidenceScore,
    screen_name: 'Summary',
    timestamp: new Date().toISOString(),
  });
};

export const trackSummaryTraitsViewed = (traitsCount: number) => {
  amplitude.track('summary_traits_viewed', {
    traits_count: traitsCount,
    screen_name: 'Summary',
    timestamp: new Date().toISOString(),
  });
};

export const trackSummaryNextFocusViewed = (focusCount: number) => {
  amplitude.track('summary_next_focus_viewed', {
    focus_count: focusCount,
    screen_name: 'Summary',
    timestamp: new Date().toISOString(),
  });
};

export const trackSummaryScrollDepth = (scrollPercent: number) => {
  amplitude.track('summary_scroll_depth', {
    scroll_percent: scrollPercent,
    screen_name: 'Summary',
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 5: SUMMARY GENERATION & EVOLUTION
// ============================================

export const trackSessionSummaryGenerated = (sessionNumber: number, confidenceScore: number) => {
  amplitude.track('session_summary_generated', {
    session_number: sessionNumber,
    confidence: confidenceScore,
    screen_name: 'Backend',
    timestamp: new Date().toISOString(),
  });
};

export const trackCumulativeSummaryUpdated = (newConfidenceScore: number, confidenceDelta: number, traitsChanged: string[]) => {
  amplitude.track('cumulative_summary_updated', {
    new_confidence_score: newConfidenceScore,
    delta_score: confidenceDelta,
    traits_changed: traitsChanged,
    screen_name: 'Backend',
    timestamp: new Date().toISOString(),
  });
};

export const trackSummaryEvolutionViewed = (sessionsCompleted: number, confidenceScore: number) => {
  amplitude.track('summary_evolution_viewed', {
    sessions_completed: sessionsCompleted,
    confidence_score: confidenceScore,
    screen_name: 'Summary',
    timestamp: new Date().toISOString(),
  });
};

export const trackSummaryEvolutionUpdated = (previousScore: number, newScore: number, delta: number, changedTraits: string[]) => {
  amplitude.track('summary_evolution_updated', {
    previous_confidence_score: previousScore,
    new_confidence_score: newScore,
    delta: delta,
    changed_traits: changedTraits,
    screen_name: 'Backend',
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 6: PAYWALL EVENTS
// ============================================

export const trackPaywallShown = (triggerType: 'chat_limit' | 'call_limit') => {
  amplitude.track('paywall_shown', {
    trigger_source: triggerType,
    screen_name: 'Paywall',
    timestamp: new Date().toISOString(),
  });
};

export const trackPlanViewed = (planType: 'daily' | 'weekly' | 'monthly') => {
  amplitude.track('plan_viewed', {
    plan_type: planType,
    screen_name: 'Paywall',
    timestamp: new Date().toISOString(),
  });
};

export const trackPlanSelected = (planType: string, price: number, durationDays: number) => {
  amplitude.track('plan_selected', {
    plan_type: planType,
    price: price,
    duration_days: durationDays,
    screen_name: 'Paywall',
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentSessionCreated = (orderId: string, amount: number) => {
  amplitude.track('payment_session_created', {
    order_id: orderId,
    amount: amount,
    screen_name: 'Paywall',
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentSuccessful = (planType: string, subscriptionEndDate: string) => {
  amplitude.track('payment_successful', {
    plan_type: planType,
    subscription_end_date: subscriptionEndDate,
    screen_name: 'Callback',
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentFailed = (failureReason: string) => {
  amplitude.track('payment_failed', {
    failure_reason: failureReason,
    screen_name: 'Callback',
    timestamp: new Date().toISOString(),
  });
};

export const trackPaywallDismissed = (timeSpentSecs: number) => {
  amplitude.track('paywall_dismissed', {
    time_spent: timeSpentSecs,
    screen_name: 'Paywall',
    timestamp: new Date().toISOString(),
  });
};

export const trackAccessUnlocked = () => {
  amplitude.track('access_unlocked', {
    is_premium: true,
    screen_name: 'Global',
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 7: SESSION-LEVEL EVENTS
// ============================================

export const trackSessionStarted = (sessionType: 'chat' | 'call', sessionNumber: number) => {
  amplitude.track('session_started', {
    session_type: sessionType,
    session_number: sessionNumber,
    timestamp: new Date().toISOString(),
  });
};

export const trackSessionEnded = (messageCount: number, callDurationSecs: number) => {
  amplitude.track('session_ended', {
    message_count: messageCount,
    call_duration_sec: callDurationSecs,
    timestamp: new Date().toISOString(),
  });
};

export const trackSessionLengthRecorded = (sessionLengthSec: number, totalInteractions: number) => {
  amplitude.track('session_length_recorded', {
    session_length_sec: sessionLengthSec,
    total_interactions: totalInteractions,
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// SECTION 8: ENGAGEMENT & RETENTION
// ============================================

export const trackReturningUserLogin = (daysSinceLastSession: number) => {
  amplitude.track('returning_user_login', {
    days_since_last_session: daysSinceLastSession,
    timestamp: new Date().toISOString(),
  });
};

export const trackDailyActiveUser = () => {
  amplitude.track('daily_active_user', {
    unique_user: true,
    timestamp: new Date().toISOString(),
  });
};

export const trackPersonaAlignmentViewed = (alignmentScore: number) => {
  amplitude.track('persona_alignment_viewed', {
    alignment_score: alignmentScore,
    timestamp: new Date().toISOString(),
  });
};

export const trackCtaVoiceCallClicked = (placement: string) => {
  amplitude.track('cta_voice_call_clicked', {
    placement: placement,
    screen_name: 'Chat',
    timestamp: new Date().toISOString(),
  });
};

export const trackCtaSummaryClicked = (personaType: string) => {
  amplitude.track('cta_summary_clicked', {
    persona_type: personaType,
    screen_name: 'Chat',
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const setUserProperties = (userId: string, properties: Record<string, any>) => {
  amplitude.setUserId(userId);
  const identify = new amplitude.Identify();
  identify.setOnce('initial_properties', properties);
  amplitude.identify(identify);
};

export const updateUserProperties = (properties: Record<string, any>) => {
  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identify.set(key, value);
  });
  amplitude.identify(identify);
};

export const trackCustomEvent = (eventName: string, properties: Record<string, any>) => {
  amplitude.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};


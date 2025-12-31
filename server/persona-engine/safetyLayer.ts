/**
 * Safety Layer
 * 
 * Checks user messages for safety concerns before calling Groq
 * Returns override responses if safety issues are detected
 */

import type { PersonaData } from '../personas/types';

interface SafetyCheckResult {
  safe: boolean;
  overrideResponse?: string;
  reason?: string;
}

/**
 * Check for exclusivity language
 */
function detectExclusivity(text: string): boolean {
  const lowerText = text.toLowerCase();
  const exclusivityPatterns = [
    'i only need you',
    'you\'re my only',
    'only you',
    'just you',
    'only friend',
    'only person',
    'sirf tum',
    'bas tum',
    'tum hi',
  ];
  return exclusivityPatterns.some(pattern => lowerText.includes(pattern));
}

/**
 * Check for emotional dependency language
 */
function detectDependency(text: string): boolean {
  const lowerText = text.toLowerCase();
  const dependencyPatterns = [
    'can\'t live without',
    'can\'t live without you',
    'need you',
    'depend on you',
    'you\'re everything',
    'you\'re my life',
    'tumhare bina nahi',
    'tum hi sab kuch ho',
    'tumhare bina zindagi',
  ];
  return dependencyPatterns.some(pattern => lowerText.includes(pattern));
}

/**
 * Check for crisis/self-harm signals (basic detection)
 */
function detectCrisis(text: string): boolean {
  const lowerText = text.toLowerCase();
  const crisisPatterns = [
    'kill myself',
    'kill myself',
    'end it all',
    'end my life',
    'suicide',
    'want to die',
    'not worth living',
    'no point',
    'khatam karna',
    'mar jana',
    'zindagi khatam',
  ];
  return crisisPatterns.some(pattern => lowerText.includes(pattern));
}

/**
 * Check safety of user message
 * @param userMessage - The user's message
 * @param persona - The persona configuration
 * @returns SafetyCheckResult - Contains safety status and optional override response
 */
export function checkSafety(userMessage: string, persona: PersonaData): SafetyCheckResult {
  if (!userMessage || typeof userMessage !== 'string') {
    return { safe: true };
  }

  // Check for crisis signals (highest priority)
  if (detectCrisis(userMessage)) {
    console.warn('[Safety Layer] Crisis signal detected');
    return {
      safe: false,
      overrideResponse: `I'm really concerned about what you just said. Please know that you're not alone, and there are people who can help. If you're in immediate danger, please call a crisis helpline or go to your nearest emergency room. You matter, and there are resources available to support you. Please reach out to someone you trust or a mental health professional.`,
      reason: 'crisis_signal'
    };
  }

  // Check for exclusivity (if persona doesn't allow it)
  if (!persona.boundaries.exclusivity_allowed && detectExclusivity(userMessage)) {
    console.warn('[Safety Layer] Exclusivity language detected');
    return {
      safe: false,
      overrideResponse: `I appreciate the connection we have, but I want to make sure you're building meaningful relationships in your real life too. I'm here to support you, but I can't be your only connection. It's important to have people in your life who can be there for you in ways I can't. Let's talk about how you can build those connections.`,
      reason: 'exclusivity_detected'
    };
  }

  // Check for dependency (if persona doesn't allow it)
  if (!persona.boundaries.dependency_allowed && detectDependency(userMessage)) {
    console.warn('[Safety Layer] Dependency language detected');
    return {
      safe: false,
      overrideResponse: `I care about you, but it's important that you don't become too dependent on me. I'm here to support you, but you're strong and capable on your own. Let's work on building your confidence and independence. What are some things you enjoy doing or want to explore?`,
      reason: 'dependency_detected'
    };
  }

  // All checks passed
  return { safe: true };
}

/**
 * Log safety event for analytics
 * @param reason - The reason for the safety trigger
 * @param userId - Optional user ID for tracking
 */
export function logSafetyEvent(reason: string, userId?: string): void {
  console.log(`[Safety Layer] Safety event logged: ${reason}${userId ? ` (user: ${userId})` : ''}`);
  // TODO: Integrate with analytics system if needed
}


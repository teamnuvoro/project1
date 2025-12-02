/**
 * Understanding Level Calculator (Frontend)
 * 
 * Calculates the AI's understanding level of a user based on the number
 * of chat sessions they've had. The understanding grows with diminishing
 * returns - early sessions contribute more to understanding than later ones.
 * 
 * This is a frontend mirror of the backend calculator to enable:
 * - Instant progression display without API calls
 * - Consistent calculations across frontend and backend
 * - Timeline visualization in SummaryTrackerPage
 * 
 * Progression Logic:
 * - Base understanding starts at 25% after first session
 * - Early sessions provide larger increments (building foundational understanding)
 * - Later sessions provide smaller increments (refinement and depth)
 * - Maximum understanding capped at 75% (AI can never fully understand a human)
 * 
 * Increment Tiers:
 * - Session 2: +10 (major jump as AI learns basics)
 * - Sessions 3-4: +5 each (solidifying core understanding)
 * - Sessions 5-6: +2.5 each (deepening insights)
 * - Sessions 7-8: +1.5 each (fine-tuning personality model)
 * - Sessions 9-10: +1 each (nuanced understanding)
 * - Sessions 11-14: +0.5 each (subtle refinements)
 * - Sessions 15-20: +0.25 each (micro-adjustments)
 * - Sessions 21+: +0.1 each (approaching asymptotic limit)
 */

/**
 * Represents a single step in the understanding progression
 */
export interface UnderstandingStep {
  session: number;
  level: number;
  increment: number;
}

/**
 * Maximum understanding level the AI can achieve (75%)
 * This represents that AI can never fully understand a human
 */
const MAX_UNDERSTANDING_LEVEL = 75;

/**
 * Base understanding level after the first session
 */
const BASE_UNDERSTANDING_LEVEL = 25;

/**
 * Gets the increment value for a specific session number
 * 
 * @param sessionNumber - The session number (1-indexed)
 * @returns The increment to add for this session
 */
function getIncrementForSession(sessionNumber: number): number {
  if (sessionNumber <= 1) {
    return 0; // First session establishes the base, no increment
  }
  
  if (sessionNumber === 2) {
    return 10; // Major jump - AI learns user's basics
  }
  
  if (sessionNumber <= 4) {
    return 5; // Sessions 3-4: Solidifying core understanding
  }
  
  if (sessionNumber <= 6) {
    return 2.5; // Sessions 5-6: Deepening insights
  }
  
  if (sessionNumber <= 8) {
    return 1.5; // Sessions 7-8: Fine-tuning personality model
  }
  
  if (sessionNumber <= 10) {
    return 1; // Sessions 9-10: Nuanced understanding
  }
  
  if (sessionNumber <= 14) {
    return 0.5; // Sessions 11-14: Subtle refinements
  }
  
  if (sessionNumber <= 20) {
    return 0.25; // Sessions 15-20: Micro-adjustments
  }
  
  // Sessions 21+: Approaching asymptotic limit
  return 0.1;
}

/**
 * Rounds a number to the specified decimal places
 * 
 * @param value - The value to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns The rounded value
 */
function roundToDecimal(value: number, decimals: number = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Calculates the understanding level based on the number of sessions
 * 
 * The understanding grows with diminishing returns:
 * - Session 1: 25% (base understanding)
 * - Session 2: 35% (+10)
 * - Session 3: 40% (+5)
 * - Session 4: 45% (+5)
 * - Session 5: 47.5% (+2.5)
 * - Session 6: 50% (+2.5)
 * - Session 7: 51.5% (+1.5)
 * - Session 8: 53% (+1.5)
 * - Session 9: 54% (+1)
 * - Session 10: 55% (+1)
 * - And continues with decreasing increments...
 * - Maximum: 75% (capped)
 * 
 * @param sessionCount - The total number of sessions the user has had
 * @returns The understanding level as a percentage (0-75), rounded to 1 decimal
 * 
 * @example
 * calculateUnderstandingLevel(1)  // Returns 25
 * calculateUnderstandingLevel(5)  // Returns 47.5
 * calculateUnderstandingLevel(10) // Returns 55
 * calculateUnderstandingLevel(100) // Returns 75 (capped)
 */
export function calculateUnderstandingLevel(sessionCount: number): number {
  // Handle edge cases
  if (sessionCount <= 0) {
    return 0;
  }
  
  // Start with base level for first session
  let level = BASE_UNDERSTANDING_LEVEL;
  
  // Add increments for each subsequent session
  for (let session = 2; session <= sessionCount; session++) {
    const increment = getIncrementForSession(session);
    level += increment;
    
    // Cap at maximum level
    if (level >= MAX_UNDERSTANDING_LEVEL) {
      return MAX_UNDERSTANDING_LEVEL;
    }
  }
  
  return roundToDecimal(level);
}

/**
 * Gets the complete understanding progression from session 1 to the current session
 * 
 * Returns an array showing how understanding grew at each session,
 * including the increment added at each step.
 * 
 * @param sessionCount - The total number of sessions to calculate progression for
 * @returns Array of UnderstandingStep objects showing the progression
 * 
 * @example
 * getUnderstandingProgression(3)
 * // Returns:
 * // [
 * //   { session: 1, level: 25, increment: 0 },
 * //   { session: 2, level: 35, increment: 10 },
 * //   { session: 3, level: 40, increment: 5 }
 * // ]
 */
export function getUnderstandingProgression(sessionCount: number): UnderstandingStep[] {
  const progression: UnderstandingStep[] = [];
  
  // Handle edge cases
  if (sessionCount <= 0) {
    return progression;
  }
  
  let currentLevel = BASE_UNDERSTANDING_LEVEL;
  
  // First session establishes the base
  progression.push({
    session: 1,
    level: roundToDecimal(currentLevel),
    increment: 0 // Base level, no increment
  });
  
  // Calculate each subsequent session
  for (let session = 2; session <= sessionCount; session++) {
    const increment = getIncrementForSession(session);
    currentLevel += increment;
    
    // Cap at maximum level
    const cappedLevel = Math.min(currentLevel, MAX_UNDERSTANDING_LEVEL);
    const actualIncrement = session === 2 
      ? increment 
      : roundToDecimal(cappedLevel - progression[progression.length - 1].level);
    
    progression.push({
      session,
      level: roundToDecimal(cappedLevel),
      increment: roundToDecimal(actualIncrement)
    });
    
    // Stop if we've hit the cap
    if (cappedLevel >= MAX_UNDERSTANDING_LEVEL) {
      break;
    }
  }
  
  return progression;
}

/**
 * Gets the increment that would be added for the next session
 * 
 * @param currentSessionCount - The current number of sessions
 * @returns The increment that will be added for the next session
 * 
 * @example
 * getNextSessionIncrement(1) // Returns 10 (next session is #2)
 * getNextSessionIncrement(4) // Returns 2.5 (next session is #5)
 */
export function getNextSessionIncrement(currentSessionCount: number): number {
  const currentLevel = calculateUnderstandingLevel(currentSessionCount);
  
  // If already at max, no more increments
  if (currentLevel >= MAX_UNDERSTANDING_LEVEL) {
    return 0;
  }
  
  const nextSession = currentSessionCount + 1;
  const increment = getIncrementForSession(nextSession);
  
  // Check if increment would exceed max
  if (currentLevel + increment > MAX_UNDERSTANDING_LEVEL) {
    return roundToDecimal(MAX_UNDERSTANDING_LEVEL - currentLevel);
  }
  
  return increment;
}

/**
 * Gets the number of sessions needed to reach a target understanding level
 * 
 * @param targetLevel - The target understanding level (0-75)
 * @returns The number of sessions needed, or -1 if target exceeds maximum
 * 
 * @example
 * getSessionsToReachLevel(50) // Returns 6
 * getSessionsToReachLevel(75) // Returns the session count to reach max
 * getSessionsToReachLevel(80) // Returns -1 (exceeds maximum)
 */
export function getSessionsToReachLevel(targetLevel: number): number {
  // Target exceeds maximum possible
  if (targetLevel > MAX_UNDERSTANDING_LEVEL) {
    return -1;
  }
  
  // Target is 0 or less
  if (targetLevel <= 0) {
    return 0;
  }
  
  // Target is at or below base level
  if (targetLevel <= BASE_UNDERSTANDING_LEVEL) {
    return 1;
  }
  
  // Calculate sessions needed
  let sessions = 1;
  let currentLevel = BASE_UNDERSTANDING_LEVEL;
  
  while (currentLevel < targetLevel && currentLevel < MAX_UNDERSTANDING_LEVEL) {
    sessions++;
    currentLevel += getIncrementForSession(sessions);
  }
  
  return sessions;
}

/**
 * Formats the understanding level for display
 * 
 * @param level - The understanding level (0-75)
 * @returns Formatted string like "45%" or "45.5%"
 */
export function formatUnderstandingLevel(level: number): string {
  if (Number.isInteger(level)) {
    return `${level}%`;
  }
  return `${level.toFixed(1)}%`;
}

/**
 * Gets a human-readable stage name based on understanding level
 * 
 * @param level - The understanding level (0-75)
 * @returns Stage name like "New", "Getting to know you", "Deep connection"
 */
export function getUnderstandingStage(level: number): string {
  if (level === 0) return "Not started";
  if (level < 30) return "New";
  if (level < 45) return "Getting to know you";
  if (level < 60) return "Building connection";
  if (level < 70) return "Deep understanding";
  return "Deep connection";
}

/**
 * Gets the stage index (0-4) for progress bar visualization
 * 
 * @param level - The understanding level (0-75)
 * @returns Stage index from 0 to 4
 */
export function getStageIndex(level: number): number {
  if (level === 0) return 0;
  if (level < 30) return 1;
  if (level < 45) return 2;
  if (level < 60) return 3;
  if (level < 70) return 4;
  return 5;
}

/**
 * Constants exported for use in other modules
 */
export const UNDERSTANDING_CONSTANTS = {
  MAX_LEVEL: MAX_UNDERSTANDING_LEVEL,
  BASE_LEVEL: BASE_UNDERSTANDING_LEVEL,
  TIER_INCREMENTS: {
    SESSION_2: 10,
    SESSIONS_3_4: 5,
    SESSIONS_5_6: 2.5,
    SESSIONS_7_8: 1.5,
    SESSIONS_9_10: 1,
    SESSIONS_11_14: 0.5,
    SESSIONS_15_20: 0.25,
    SESSIONS_21_PLUS: 0.1
  },
  STAGES: [
    { name: "Not started", minLevel: 0 },
    { name: "New", minLevel: 1 },
    { name: "Getting to know you", minLevel: 30 },
    { name: "Building connection", minLevel: 45 },
    { name: "Deep understanding", minLevel: 60 },
    { name: "Deep connection", minLevel: 70 }
  ]
} as const;

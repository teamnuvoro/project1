/**
 * Understanding Level Calculator (Backend)
 * 
 * Server-side version of the understanding level calculator.
 * This mirrors the frontend calculator for consistency.
 */

export interface UnderstandingStep {
  session: number;
  level: number;
  increment: number;
}

const MAX_UNDERSTANDING_LEVEL = 75;
const BASE_UNDERSTANDING_LEVEL = 25;

function getIncrementForSession(sessionNumber: number): number {
  if (sessionNumber <= 1) return 0;
  if (sessionNumber === 2) return 10;
  if (sessionNumber <= 4) return 5;
  if (sessionNumber <= 6) return 2.5;
  if (sessionNumber <= 8) return 1.5;
  if (sessionNumber <= 10) return 1;
  if (sessionNumber <= 14) return 0.5;
  if (sessionNumber <= 20) return 0.25;
  return 0.1;
}

function roundToDecimal(value: number, decimals: number = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

export function calculateUnderstandingLevel(sessionCount: number): number {
  if (sessionCount <= 0) return 0;
  
  let level = BASE_UNDERSTANDING_LEVEL;
  
  for (let session = 2; session <= sessionCount; session++) {
    const increment = getIncrementForSession(session);
    level += increment;
    
    if (level >= MAX_UNDERSTANDING_LEVEL) {
      return MAX_UNDERSTANDING_LEVEL;
    }
  }
  
  return roundToDecimal(level);
}

export function getUnderstandingProgression(sessionCount: number): UnderstandingStep[] {
  const progression: UnderstandingStep[] = [];
  
  if (sessionCount <= 0) return progression;
  
  let currentLevel = BASE_UNDERSTANDING_LEVEL;
  
  progression.push({
    session: 1,
    level: roundToDecimal(currentLevel),
    increment: 0
  });
  
  for (let session = 2; session <= sessionCount; session++) {
    const increment = getIncrementForSession(session);
    currentLevel += increment;
    
    const cappedLevel = Math.min(currentLevel, MAX_UNDERSTANDING_LEVEL);
    const actualIncrement = session === 2 
      ? increment 
      : roundToDecimal(cappedLevel - progression[progression.length - 1].level);
    
    progression.push({
      session,
      level: roundToDecimal(cappedLevel),
      increment: roundToDecimal(actualIncrement)
    });
    
    if (cappedLevel >= MAX_UNDERSTANDING_LEVEL) {
      break;
    }
  }
  
  return progression;
}

export function getNextSessionIncrement(currentSessionCount: number): number {
  const currentLevel = calculateUnderstandingLevel(currentSessionCount);
  
  if (currentLevel >= MAX_UNDERSTANDING_LEVEL) {
    return 0;
  }
  
  const nextSession = currentSessionCount + 1;
  const increment = getIncrementForSession(nextSession);
  
  if (currentLevel + increment > MAX_UNDERSTANDING_LEVEL) {
    return roundToDecimal(MAX_UNDERSTANDING_LEVEL - currentLevel);
  }
  
  return increment;
}

export const UNDERSTANDING_CONSTANTS = {
  MAX_LEVEL: MAX_UNDERSTANDING_LEVEL,
  BASE_LEVEL: BASE_UNDERSTANDING_LEVEL,
} as const;


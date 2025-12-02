/**
 * Summary Generation Debounce Utility
 * 
 * Prevents excessive summary generation by implementing:
 * - Minimum 5-minute interval between automatic generations
 * - Generation after every 10 messages (instead of 5)
 * - Bypass for manual generation requests
 */

interface UserGenerationState {
  lastGeneratedAt: number;
  messagesSinceLastGeneration: number;
}

const generationState = new Map<string, UserGenerationState>();

const MINIMUM_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MESSAGES_THRESHOLD = 10; // Generate every 10 messages

/**
 * Check if summary generation should be triggered for a user
 * 
 * @param userId - The user ID
 * @param forceGenerate - If true, bypass debounce (for manual requests)
 * @returns boolean - Whether to proceed with generation
 */
export function shouldGenerateSummary(userId: string, forceGenerate: boolean = false): boolean {
  if (forceGenerate) {
    console.log(`[summaryDebounce] Force generation requested for ${userId}`);
    return true;
  }

  const state = generationState.get(userId);
  const now = Date.now();

  if (!state) {
    // First time - allow generation
    console.log(`[summaryDebounce] First generation for ${userId}`);
    return true;
  }

  const timeSinceLastGeneration = now - state.lastGeneratedAt;
  const hasEnoughMessages = state.messagesSinceLastGeneration >= MESSAGES_THRESHOLD;
  const hasEnoughTime = timeSinceLastGeneration >= MINIMUM_INTERVAL_MS;

  if (hasEnoughMessages && hasEnoughTime) {
    console.log(`[summaryDebounce] Allowing generation for ${userId}: ${state.messagesSinceLastGeneration} messages, ${Math.round(timeSinceLastGeneration / 1000)}s elapsed`);
    return true;
  }

  console.log(`[summaryDebounce] Skipping generation for ${userId}: ${state.messagesSinceLastGeneration}/${MESSAGES_THRESHOLD} messages, ${Math.round(timeSinceLastGeneration / 1000)}s/${MINIMUM_INTERVAL_MS / 1000}s elapsed`);
  return false;
}

/**
 * Increment message count for a user
 * 
 * @param userId - The user ID
 * @returns The new message count since last generation
 */
export function incrementMessageCount(userId: string): number {
  const state = generationState.get(userId);
  
  if (!state) {
    generationState.set(userId, {
      lastGeneratedAt: 0,
      messagesSinceLastGeneration: 1
    });
    return 1;
  }

  state.messagesSinceLastGeneration += 1;
  return state.messagesSinceLastGeneration;
}

/**
 * Mark that summary was generated for a user
 * Resets the message counter and updates timestamp
 * 
 * @param userId - The user ID
 */
export function markSummaryGenerated(userId: string): void {
  generationState.set(userId, {
    lastGeneratedAt: Date.now(),
    messagesSinceLastGeneration: 0
  });
  console.log(`[summaryDebounce] Marked summary generated for ${userId}`);
}

/**
 * Get current generation state for a user
 * 
 * @param userId - The user ID
 * @returns The current state or null if not found
 */
export function getGenerationState(userId: string): UserGenerationState | null {
  return generationState.get(userId) || null;
}

/**
 * Check if enough messages have been sent for generation
 * 
 * @param userId - The user ID
 * @returns boolean - Whether message threshold is reached
 */
export function hasEnoughMessages(userId: string): boolean {
  const state = generationState.get(userId);
  if (!state) return true; // First time
  return state.messagesSinceLastGeneration >= MESSAGES_THRESHOLD;
}

/**
 * Check if enough time has passed since last generation
 * 
 * @param userId - The user ID
 * @returns boolean - Whether time threshold is reached
 */
export function hasEnoughTimePassed(userId: string): boolean {
  const state = generationState.get(userId);
  if (!state) return true; // First time
  return (Date.now() - state.lastGeneratedAt) >= MINIMUM_INTERVAL_MS;
}

/**
 * Get time remaining until next allowed generation
 * 
 * @param userId - The user ID
 * @returns Milliseconds until next generation is allowed, 0 if allowed now
 */
export function getTimeUntilNextGeneration(userId: string): number {
  const state = generationState.get(userId);
  if (!state) return 0;
  
  const elapsed = Date.now() - state.lastGeneratedAt;
  const remaining = MINIMUM_INTERVAL_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Get messages remaining until next allowed generation
 * 
 * @param userId - The user ID
 * @returns Messages remaining, 0 if threshold reached
 */
export function getMessagesUntilNextGeneration(userId: string): number {
  const state = generationState.get(userId);
  if (!state) return 0;
  
  const remaining = MESSAGES_THRESHOLD - state.messagesSinceLastGeneration;
  return Math.max(0, remaining);
}

/**
 * Clear state for a user (useful for testing or reset)
 * 
 * @param userId - The user ID
 */
export function clearUserState(userId: string): void {
  generationState.delete(userId);
}

/**
 * Export constants for external use
 */
export const DEBOUNCE_CONFIG = {
  MINIMUM_INTERVAL_MS,
  MESSAGES_THRESHOLD
} as const;

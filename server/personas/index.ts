/**
 * Persona System - Data Structure Definitions
 * 
 * Personas are defined as structured data, not raw prompts.
 * This allows for scalable, measurable, and safe persona management.
 */

// Re-export types from types.ts to avoid circular dependencies
export type { PersonaData, PersonaMetrics, PersonaLanguage, PersonaBoundaries, PersonaMemoryPolicy } from './types';
import type { PersonaData } from './types';

// Import all persona definitions
import { sweet_supportive } from './sweet_supportive';
import { flirtatious } from './flirtatious';
import { playful } from './playful';
import { dominant } from './dominant';
import { calm_mature } from './calm_mature';

// Registry of all personas
const PERSONA_REGISTRY: Record<string, PersonaData> = {
  sweet_supportive,
  flirtatious,
  playful,
  dominant,
  calm_mature,
};

// Default persona (fallback)
const DEFAULT_PERSONA = sweet_supportive;

/**
 * Load a persona by ID
 * @param personaId - The persona identifier
 * @returns PersonaData - Always returns a valid persona (falls back to default)
 */
export function loadPersona(personaId: string): PersonaData {
  const persona = PERSONA_REGISTRY[personaId];
  
  if (!persona) {
    console.warn(`[Persona Loader] Unknown persona ID: ${personaId}, falling back to default`);
    return DEFAULT_PERSONA;
  }
  
  return persona;
}

/**
 * Get all available persona IDs
 */
export function getAvailablePersonas(): string[] {
  return Object.keys(PERSONA_REGISTRY);
}

/**
 * Check if a persona exists
 */
export function personaExists(personaId: string): boolean {
  return personaId in PERSONA_REGISTRY;
}

export { DEFAULT_PERSONA };


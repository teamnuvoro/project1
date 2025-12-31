/**
 * Persona Loader
 * 
 * Loads persona definitions and handles caching/fallbacks
 */

import { loadPersona, DEFAULT_PERSONA } from '../personas';
import type { PersonaData } from '../personas/types';

// In-memory cache for loaded personas
const personaCache: Map<string, PersonaData> = new Map();

/**
 * Load a persona by ID with caching
 * @param personaId - The persona identifier
 * @returns PersonaData - Always returns a valid persona
 */
export function getPersona(personaId: string): PersonaData {
  // Check cache first
  if (personaCache.has(personaId)) {
    return personaCache.get(personaId)!;
  }
  
  // Load persona (will fallback to default if not found)
  const persona = loadPersona(personaId);
  
  // Cache it
  personaCache.set(personaId, persona);
  
  return persona;
}

/**
 * Clear persona cache (useful for testing or hot-reloading)
 */
export function clearPersonaCache(): void {
  personaCache.clear();
}

/**
 * Get default persona
 */
export function getDefaultPersona(): PersonaData {
  return DEFAULT_PERSONA;
}


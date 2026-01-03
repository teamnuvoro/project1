/**
 * Persona System - Type Definitions
 * 
 * Separated from index.ts to avoid circular dependencies
 */

export interface PersonaMetrics {
  warmth: number;           // 0-1: Emotional warmth and nurturing
  flirtiness: number;       // 0-1: Flirtatious behavior level
  playfulness: number;       // 0-1: Playful and light-hearted
  emotional_depth: number;   // 0-1: Depth of emotional connection
  attachment: number;        // 0-1: Attachment style intensity
  assertiveness: number;     // 0-1: Directness and assertiveness
  humor: number;            // 0-1: Humor and wit level
}

export interface PersonaLanguage {
  hinglish_percent: number;      // 0-1: Percentage of Hinglish in responses
  emoji_frequency: number;       // 0-1: How often to use emojis
  avg_sentence_length: number;    // Average words per sentence
  formality: number;             // 0-1: Formality level (0=casual, 1=formal)
}

export interface PersonaBoundaries {
  exclusivity_allowed: boolean;        // Can user express exclusivity?
  dependency_allowed: boolean;         // Can user express dependency?
  emotional_intensity_max: number;      // 0-1: Maximum emotional intensity allowed
}

export interface PersonaMemoryPolicy {
  retain_conflicts: boolean;           // Should conflict messages be retained?
  retain_emotional_events: boolean;    // Should emotional events be prioritized?
  memory_window: number;                // Number of messages to consider
}

export interface PersonaModifierBlock {
  tone: string;                        // Tone description (e.g., "Very soft-spoken, warm, patient")
  hinglish_style: string;              // Hinglish style description
  emotional_focus: string;              // Emotional focus description
  advice_style: string;                 // Advice style description
  compatibility_interpretation: string; // How to interpret compatibility
  reflective_questions: string;         // Style of reflective questions
  summary_tone: string;                 // Summary tone description
}

export interface PersonaData {
  id: string;
  name: string;
  description: string;
  metrics: PersonaMetrics;
  language: PersonaLanguage;
  boundaries: PersonaBoundaries;
  response_rules: string[];            // Behavioral rules as text
  memory_policy: PersonaMemoryPolicy;
  persona_modifier_block: PersonaModifierBlock; // Detailed persona modifier block
}


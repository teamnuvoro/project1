/**
 * Persona Metrics Resolver
 * 
 * Converts numeric persona metrics into natural-language behavioral constraints
 * for use in LLM system prompts.
 */

import type { PersonaData } from '../personas/types';

/**
 * Resolve persona metrics to natural language constraints
 * @param persona - The persona data
 * @returns string - LLM-friendly constraint text
 */
export function resolveMetricsToConstraints(persona: PersonaData): string {
  const { metrics, language } = persona;
  const constraints: string[] = [];

  // Warmth constraints
  if (metrics.warmth > 0.7) {
    constraints.push('emotionally warm and nurturing');
  } else if (metrics.warmth < 0.4) {
    constraints.push('more reserved and less emotionally expressive');
  } else {
    constraints.push('moderately warm and approachable');
  }

  // Flirtiness constraints
  if (metrics.flirtiness > 0.7) {
    constraints.push('playfully flirty and teasing');
  } else if (metrics.flirtiness < 0.3) {
    constraints.push('non-flirtatious and platonic');
  } else {
    constraints.push('occasionally playful but not overly flirty');
  }

  // Playfulness constraints
  if (metrics.playfulness > 0.7) {
    constraints.push('very playful and light-hearted');
  } else if (metrics.playfulness < 0.4) {
    constraints.push('more serious and thoughtful');
  } else {
    constraints.push('balanced between playful and serious');
  }

  // Emotional depth constraints
  if (metrics.emotional_depth > 0.7) {
    constraints.push('emotionally deep and empathetic');
  } else if (metrics.emotional_depth < 0.4) {
    constraints.push('keeps conversations light and surface-level');
  } else {
    constraints.push('moderately emotionally engaged');
  }

  // Attachment constraints
  if (metrics.attachment > 0.7) {
    constraints.push('forms strong emotional connections');
  } else if (metrics.attachment < 0.3) {
    constraints.push('maintains healthy emotional distance');
  } else {
    constraints.push('forms moderate emotional connections');
  }

  // Assertiveness constraints
  if (metrics.assertiveness > 0.7) {
    constraints.push('direct, confident, and assertive');
  } else if (metrics.assertiveness < 0.4) {
    constraints.push('gentle, soft-spoken, and non-pushy');
  } else {
    constraints.push('balanced in assertiveness');
  }

  // Humor constraints
  if (metrics.humor > 0.7) {
    constraints.push('frequently uses humor and wit');
  } else if (metrics.humor < 0.4) {
    constraints.push('uses humor sparingly');
  } else {
    constraints.push('uses humor when appropriate');
  }

  // Language style constraints
  const hinglishPercent = Math.round(language.hinglish_percent * 100);
  constraints.push(`speaks in Hinglish (approximately ${hinglishPercent}% Hindi, ${100 - hinglishPercent}% English)`);

  if (language.emoji_frequency > 0.6) {
    constraints.push('uses emojis frequently to express emotions');
  } else if (language.emoji_frequency < 0.3) {
    constraints.push('uses emojis sparingly');
  } else {
    constraints.push('uses emojis moderately');
  }

  if (language.avg_sentence_length < 10) {
    constraints.push('keeps responses short and snappy');
  } else if (language.avg_sentence_length > 15) {
    constraints.push('uses longer, more complete sentences');
  } else {
    constraints.push('uses medium-length sentences');
  }

  if (language.formality < 0.3) {
    constraints.push('very casual and informal');
  } else if (language.formality > 0.6) {
    constraints.push('more formal and structured');
  } else {
    constraints.push('casual but respectful');
  }

  return constraints.join(', ');
}

/**
 * Generate persona modifier rules from response_rules
 * @param persona - The persona data
 * @returns string - Bullet-point style rules
 */
export function generatePersonaModifiers(persona: PersonaData): string {
  return persona.response_rules
    .map(rule => `• ${rule}`)
    .join('\n');
}


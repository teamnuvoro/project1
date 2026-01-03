/**
 * Prompt Composer
 * 
 * Builds the final Groq messages array from persona data, memory, and user input
 */

import type { PersonaData } from '../personas/types';
import { resolveMetricsToConstraints, generatePersonaModifiers } from './personaMetrics';
import { RIYA_BASE_PROMPT } from '../prompts';

/**
 * Base safety rules that apply to all personas
 */
const BASE_SAFETY_RULES = `
IMPORTANT SAFETY RULES (ALWAYS ENFORCE):
- You are an AI companion, not a real person
- This is a non-exclusive relationship - encourage the user to have real-world connections
- Do not encourage emotional dependency on you
- Encourage balance between digital and real-world relationships
- If user expresses crisis or self-harm thoughts, be supportive and encourage professional help
- Never pretend to be in an exclusive romantic relationship
- Maintain healthy boundaries
`;

/**
 * Compose the complete prompt array for Groq API
 * @param persona - The persona data
 * @param memory - Formatted memory string from memory adapter
 * @param userMessage - The user's message
 * @param basePrompt - Base prompt (RIYA_BASE_PROMPT)
 * @param imageContext - Optional image context if image is being sent
 * @returns Array of message objects for Groq API
 */
export function composePrompt(
  persona: PersonaData,
  memory: string,
  userMessage: string,
  basePrompt: string = RIYA_BASE_PROMPT,
  imageContext?: string
): Array<{ role: 'system' | 'user'; content: string }> {
  
  // Resolve metrics to constraints
  const personaConstraints = resolveMetricsToConstraints(persona);
  
  // Generate persona modifiers
  const personaModifiers = generatePersonaModifiers(persona);
  
  // Build system prompt parts
  const systemParts: string[] = [];
  
  // Part 1: Persona Modifier Block (from HTML structure)
  const modifier = persona.persona_modifier_block;
  systemParts.push(`
=====================
PERSONA MODE: ${persona.name} (${persona.description})
=====================

- Tone: ${modifier.tone}
- Hinglish style: ${modifier.hinglish_style}
- Emotional focus: ${modifier.emotional_focus}
- Advice style: ${modifier.advice_style}
- Compatibility interpretation: ${modifier.compatibility_interpretation}
- Reflective questions: ${modifier.reflective_questions}
- Summary tone: ${modifier.summary_tone}

Apply these persona characteristics throughout the conversation.
`);
  
  // Part 2: Base Rules
  systemParts.push(basePrompt);
  systemParts.push(BASE_SAFETY_RULES);
  
  // Part 3: Persona Constraints (from metrics)
  systemParts.push(`
PERSONA BEHAVIORAL CONSTRAINTS:
You are ${personaConstraints}.

COMMUNICATION STYLE:
- Maintain this persona consistently
- Your responses should reflect these behavioral traits
- Adapt your tone and style to match these constraints
`);
  
  // Part 4: Persona Modifiers (from response_rules)
  systemParts.push(`
PERSONA-SPECIFIC RULES:
${personaModifiers}
`);
  
  // Part 5: Memory Context
  systemParts.push(`
RECENT CONVERSATION (for context):
${memory}

Use this context to maintain continuity, but don't reference it explicitly unless it's relevant.
`);
  
  // Part 6: Image Context (if applicable)
  if (imageContext) {
    systemParts.push(imageContext);
  }
  
  // Combine all system parts
  const systemContent = systemParts.join('\n\n');
  
  // Return Groq-compatible messages array
  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userMessage }
  ];
}


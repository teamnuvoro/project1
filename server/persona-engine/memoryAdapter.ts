/**
 * Persona-Aware Memory Adapter
 * 
 * Filters and adapts conversation memory based on persona's memory policy
 */

import type { PersonaData } from '../personas/types';

interface Message {
  role: 'user' | 'ai';
  text: string;
  created_at?: string;
}

/**
 * Detect if a message contains conflict/argument content
 */
function isConflictMessage(message: Message): boolean {
  const text = message.text.toLowerCase();
  const conflictKeywords = [
    'fight', 'argue', 'disagree', 'wrong', 'stupid', 'hate',
    'angry', 'mad', 'upset with', 'frustrated', 'annoyed',
    'laddai', 'jhagda', 'galat', 'bekar'
  ];
  return conflictKeywords.some(keyword => text.includes(keyword));
}

/**
 * Detect if a message contains emotional content
 */
function isEmotionalMessage(message: Message): boolean {
  const text = message.text.toLowerCase();
  const emotionalKeywords = [
    'love', 'miss', 'care', 'feel', 'emotion', 'sad', 'happy',
    'excited', 'nervous', 'anxious', 'worried', 'scared',
    'pyaar', 'yaad', 'feel', 'dil', 'mann'
  ];
  return emotionalKeywords.some(keyword => text.includes(keyword));
}

/**
 * Adapt memory based on persona's memory policy
 * @param messages - Recent conversation messages
 * @param persona - The persona configuration
 * @returns string - Formatted memory summary
 */
export function adaptMemory(messages: Message[], persona: PersonaData): string {
  const { memory_policy } = persona;
  
  if (!messages || messages.length === 0) {
    return 'No previous messages yet.';
  }

  // Filter messages based on memory policy
  let filteredMessages = [...messages];

  // Remove conflicts if persona doesn't retain them
  if (!memory_policy.retain_conflicts) {
    filteredMessages = filteredMessages.filter(msg => !isConflictMessage(msg));
  }

  // Prioritize emotional events if persona retains them
  if (memory_policy.retain_emotional_events) {
    const emotionalMessages = filteredMessages.filter(isEmotionalMessage);
    const nonEmotionalMessages = filteredMessages.filter(msg => !isEmotionalMessage(msg));
    
    // Put emotional messages first, then others
    filteredMessages = [...emotionalMessages, ...nonEmotionalMessages];
  }

  // Apply memory window
  const windowSize = memory_policy.memory_window || 6;
  filteredMessages = filteredMessages.slice(-windowSize);

  // Format messages for context
  const formattedMessages = filteredMessages.map(msg => {
    const role = msg.role === 'user' ? 'user' : 'ai';
    return `${role}: ${msg.text}`;
  });

  return formattedMessages.join('\n');
}


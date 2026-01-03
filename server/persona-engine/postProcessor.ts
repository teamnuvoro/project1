/**
 * Post Processor
 * 
 * Adjusts final AI response based on persona language rules
 */

import type { PersonaData } from '../personas/types';

/**
 * Add emojis to response based on persona's emoji frequency
 */
function addEmojis(text: string, emojiFrequency: number): string {
  if (emojiFrequency < 0.3) {
    // Low frequency - remove most emojis, keep only essential ones
    // Simple approach: remove common emoji patterns (this is basic, can be enhanced)
    const emojiPattern = /[\u2600-\u27BF]|[\uD83C][\uDF00-\uDFFF]|[\uD83D][\uDC00-\uDE4F]|[\uD83D][\uDE80-\uDEFF]/g;
    return text.replace(emojiPattern, '').trim();
  } else if (emojiFrequency > 0.7) {
    // High frequency - add emojis to emotional words (but don't overdo it)
    // This is a simple implementation - in production, you might want more sophisticated logic
    const emotionalWords: Record<string, string> = {
      'happy': '😊',
      'sad': '😢',
      'love': '💕',
      'miss': '💔',
      'excited': '🎉',
      'good': '👍',
      'great': '✨',
      'thanks': '🙏',
      'thank you': '🙏',
      'night': '🌙',
      'morning': '☀️',
      'sleep': '😴',
    };
    
    let processed = text;
    for (const [word, emoji] of Object.entries(emotionalWords)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(processed) && !processed.includes(emoji)) {
        // Add emoji after the word (but only once per sentence)
        processed = processed.replace(regex, `${word} ${emoji}`);
        break; // Only add one emoji per response to avoid spam
      }
    }
    return processed;
  }
  
  // Moderate frequency - keep as is
  return text;
}

/**
 * Adjust sentence length based on persona preference
 */
function adjustSentenceLength(text: string, avgLength: number): string {
  if (avgLength < 10) {
    // Prefer shorter sentences - split long sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shortened = sentences.map(s => {
      const words = s.trim().split(/\s+/);
      if (words.length > 12) {
        // Split very long sentences
        const mid = Math.floor(words.length / 2);
        return words.slice(0, mid).join(' ') + '. ' + words.slice(mid).join(' ');
      }
      return s.trim();
    });
    return shortened.join('. ').replace(/\.\s*\./g, '.');
  } else if (avgLength > 15) {
    // Prefer longer sentences - combine short ones (but be careful)
    // This is a simple implementation
    return text; // Keep as is for now
  }
  
  return text;
}

/**
 * Adjust formality level
 */
function adjustFormality(text: string, formality: number): string {
  if (formality < 0.3) {
    // Very casual - ensure casual language
    return text
      .replace(/\bI am\b/gi, "I'm")
      .replace(/\byou are\b/gi, "you're")
      .replace(/\bdo not\b/gi, "don't")
      .replace(/\bcannot\b/gi, "can't");
  } else if (formality > 0.6) {
    // More formal - ensure proper grammar
    return text
      .replace(/\bI'm\b/gi, "I am")
      .replace(/\byou're\b/gi, "you are")
      .replace(/\bdon't\b/gi, "do not")
      .replace(/\bcan't\b/gi, "cannot");
  }
  
  return text;
}

/**
 * Post-process AI response based on persona language rules
 * @param response - The raw AI response
 * @param persona - The persona configuration
 * @returns string - Adjusted response
 */
export function postProcess(response: string, persona: PersonaData): string {
  if (!response || typeof response !== 'string') {
    return response;
  }

  let processed = response;

  // Apply emoji frequency rules
  processed = addEmojis(processed, persona.language.emoji_frequency);

  // Apply sentence length rules
  processed = adjustSentenceLength(processed, persona.language.avg_sentence_length);

  // Apply formality rules
  processed = adjustFormality(processed, persona.language.formality);

  return processed.trim();
}


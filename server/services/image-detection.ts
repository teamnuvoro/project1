/**
 * Image Detection Service
 * Detects when users request images/photos/pics in their messages
 */

// Keywords that indicate user wants an image
const IMAGE_KEYWORDS = [
  // English
  'pic', 'pics', 'photo', 'photos', 'image', 'images', 'picture', 'pictures',
  'send pic', 'send photo', 'show pic', 'show photo', 'send image',
  'can i see', 'want to see', 'show me',
  
  // Hindi/Hinglish
  'tasveer', 'tasveeren', 'photo bhejo', 'pic bhejo', 'image bhejo',
  'photo dikhao', 'pic dikhao', 'image dikhao', 'chitra', 'chitra dikhao',
  'photo chahiye', 'pic chahiye', 'image chahiye',
  
  // Variations
  'snap', 'snaps', 'selfie', 'selfies',
];

/**
 * Check if user message contains a request for images
 */
export function detectImageRequest(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase().trim();
  
  // Check for exact keyword matches
  for (const keyword of IMAGE_KEYWORDS) {
    // Match whole words or phrases
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerMessage)) {
      return true;
    }
  }

  // Check for common patterns
  const patterns = [
    /send.*(pic|photo|image|picture)/i,
    /show.*(pic|photo|image|picture)/i,
    /(pic|photo|image|picture).*please/i,
    /(pic|photo|image|picture).*chahiye/i,
    /(pic|photo|image|picture).*bhejo/i,
    /(pic|photo|image|picture).*dikhao/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(lowerMessage)) {
      return true;
    }
  }

  return false;
}

/**
 * Get confidence score for image request (0-1)
 * Higher score = more certain user wants an image
 */
export function getImageRequestConfidence(message: string): number {
  if (!detectImageRequest(message)) {
    return 0;
  }

  const lowerMessage = message.toLowerCase();
  let score = 0.5; // Base score

  // Strong indicators
  if (/send.*(pic|photo|image)/i.test(lowerMessage)) score += 0.3;
  if (/show.*(pic|photo|image)/i.test(lowerMessage)) score += 0.2;
  if (/please.*(pic|photo|image)/i.test(lowerMessage)) score += 0.1;
  if (/chahiye|bhejo|dikhao/i.test(lowerMessage)) score += 0.2;

  // Multiple keywords = higher confidence
  const keywordCount = IMAGE_KEYWORDS.filter(kw => 
    new RegExp(`\\b${kw}\\b`, 'i').test(lowerMessage)
  ).length;
  score += Math.min(keywordCount * 0.1, 0.2);

  return Math.min(score, 1.0);
}



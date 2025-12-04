import WebSocket from 'ws';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_BASE_URL = 'https://api.sarvam.ai';

if (!SARVAM_API_KEY) {
  console.warn('SARVAM_API_KEY not found in environment variables');
}

// Chat completion with Sarvam
export async function chatCompletion(messages: Array<{ role: string; content: string }>, temperature = 0.3) {
  const response = await fetch(`${SARVAM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': SARVAM_API_KEY || '',
    },
    body: JSON.stringify({
      model: 'sarvam-2b',
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sarvam chat API error: ${response.status} ${error}`);
  }

  return response.json();
}

// Create WebSocket connection to Sarvam STT
export function createSTTWebSocket(language = 'hi-IN'): WebSocket {
  // Build WebSocket URL with query parameters
  const params = new URLSearchParams({
    'language-code': language,
    'model': 'saarika:v2.5',
    'vad_signals': 'true',
    'sample_rate': '16000',
  });
  
  const ws = new WebSocket(`wss://api.sarvam.ai/speech-to-text/ws?${params.toString()}`, {
    headers: {
      'Api-Subscription-Key': SARVAM_API_KEY || '',
    },
  });

  ws.on('open', () => {
    console.log('[Sarvam STT] WebSocket connected');
  });

  return ws;
}

// Create WebSocket connection to Sarvam TTS
export function createTTSWebSocket(
  language = 'hi-IN',
  speaker = 'meera',
  model = 'bulbul:v2'
): WebSocket {
  // Build WebSocket URL with query parameters
  const params = new URLSearchParams({
    'model': model,
    'send_completion_event': 'true',
  });
  
  const ws = new WebSocket(`wss://api.sarvam.ai/text-to-speech/ws?${params.toString()}`, {
    headers: {
      'Api-Subscription-Key': SARVAM_API_KEY || '',
    },
  });

  // Send configuration on connection
  ws.on('open', () => {
    console.log('[Sarvam TTS] WebSocket connected');
    ws.send(JSON.stringify({
      action: 'configure',
      target_language_code: language,
      speaker,
    }));
  });

  return ws;
}

// Generate end-of-call summary using Sarvam chat
export async function generateCallSummary(transcript: string): Promise<{
  partnerTypeOneLiner: string;
  top3TraitsYouValue: string[];
  whatYouMightWorkOn: string[];
  nextTimeFocus: string[];
  loveLanguageGuess: string;
  communicationFit: string;
  confidenceScore: number;
}> {
  const summaryPrompt = `Analyze this conversation transcript and provide a relationship profile summary in JSON format.

Transcript:
${transcript}

Provide a JSON response with:
- partnerTypeOneLiner: A one-line description of their ideal partner type
- top3TraitsYouValue: Array of 3 traits they value most in a partner
- whatYouMightWorkOn: Array of 2-3 areas for personal growth
- nextTimeFocus: Array of 2-3 topics to explore in next conversation
- loveLanguageGuess: Their likely love language (words of affirmation, quality time, physical touch, acts of service, or receiving gifts)
- communicationFit: Assessment of their communication style
- confidenceScore: Confidence in this analysis (0-1 scale)

Return only valid JSON, no other text.`;

  const response = await chatCompletion([
    { role: 'system', content: 'You are an expert relationship analyst. Always respond with valid JSON only.' },
    { role: 'user', content: summaryPrompt },
  ], 0.3);

  const content = response.choices[0]?.message?.content || '{}';
  
  try {
    const summary = JSON.parse(content);
    return {
      partnerTypeOneLiner: summary.partnerTypeOneLiner || '',
      top3TraitsYouValue: summary.top3TraitsYouValue || [],
      whatYouMightWorkOn: summary.whatYouMightWorkOn || [],
      nextTimeFocus: summary.nextTimeFocus || [],
      loveLanguageGuess: summary.loveLanguageGuess || '',
      communicationFit: summary.communicationFit || '',
      confidenceScore: summary.confidenceScore || 0.5,
    };
  } catch (error) {
    console.error('Failed to parse summary JSON:', error);
    throw new Error('Failed to generate call summary');
  }
}

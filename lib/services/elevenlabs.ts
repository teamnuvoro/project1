import WebSocket from 'ws';

export function createElevenLabsWebSocket(
    apiKey: string,
    voiceId: string = "21m00Tcm4TlvDq8ikWAM", // Default to Rachel (or use a specific ID for "baby" voice)
    modelId: string = "eleven_turbo_v2"
): WebSocket {
    // Build WebSocket URL
    // ElevenLabs WebSocket URL: wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id={model_id}
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}`;

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('[ElevenLabs TTS] WebSocket connected');
        // Send initial configuration if needed, but ElevenLabs expects the first message to be text
        // We will handle the "bos" (beginning of stream) message in the route handler
        ws.send(JSON.stringify({
            text: " ",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
            },
            xi_api_key: apiKey, // Send API key in the first message payload for security if headers not supported, 
            // but usually it's better in headers. 
            // ElevenLabs WS documentation says API key can be in header 'xi-api-key'
        }));
    });

    return ws;
}

#!/bin/bash

# Script to add Daily.co and ElevenLabs API keys to .env file

ENV_FILE=".env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    touch "$ENV_FILE"
fi

# Add ElevenLabs API key
if grep -q "ELEVENLABS_API_KEY" "$ENV_FILE"; then
    echo "Updating ELEVENLABS_API_KEY in .env..."
    sed -i.bak 's/ELEVENLABS_API_KEY=.*/ELEVENLABS_API_KEY=d778b52595a077a02be618378ec087fffc980a1d57cc45b3cbeb4786869c8a1f/' "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
else
    echo "Adding ELEVENLABS_API_KEY to .env..."
    echo "" >> "$ENV_FILE"
    echo "# ElevenLabs TTS (for Riya's voice)" >> "$ENV_FILE"
    echo "ELEVENLABS_API_KEY=d778b52595a077a02be618378ec087fffc980a1d57cc45b3cbeb4786869c8a1f" >> "$ENV_FILE"
fi

# Add ElevenLabs Voice ID
if grep -q "ELEVENLABS_VOICE_ID" "$ENV_FILE"; then
    echo "Updating ELEVENLABS_VOICE_ID in .env..."
    sed -i.bak 's/ELEVENLABS_VOICE_ID=.*/ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB/' "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
else
    echo "Adding ELEVENLABS_VOICE_ID to .env..."
    echo "ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB" >> "$ENV_FILE"
fi

# Add Pipecat API key (for reference)
if grep -q "PIPECAT_API_KEY" "$ENV_FILE"; then
    echo "Updating PIPECAT_API_KEY in .env..."
    sed -i.bak 's/PIPECAT_API_KEY=.*/PIPECAT_API_KEY=pk_f0552b7a-9a73-4c1b-babe-796702702432/' "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
else
    echo "Adding PIPECAT_API_KEY to .env (for reference, not currently used)..."
    echo "" >> "$ENV_FILE"
    echo "# Pipecat Cloud (available but current code uses direct Daily.co)" >> "$ENV_FILE"
    echo "PIPECAT_API_KEY=pk_f0552b7a-9a73-4c1b-babe-796702702432" >> "$ENV_FILE"
fi

# Add Daily.co placeholder
if ! grep -q "DAILY_API_KEY" "$ENV_FILE"; then
    echo "Adding DAILY_API_KEY placeholder to .env..."
    echo "" >> "$ENV_FILE"
    echo "# Daily.co Configuration (REQUIRED - get from https://www.daily.co/)" >> "$ENV_FILE"
    echo "DAILY_API_KEY=your_daily_api_key_here" >> "$ENV_FILE"
    echo "DAILY_ROOM_DOMAIN=your_domain.daily.co" >> "$ENV_FILE"
fi

echo ""
echo "✅ API keys added to .env file!"
echo ""
echo "⚠️  IMPORTANT: You still need to:"
echo "   1. Get Daily.co API key from https://www.daily.co/"
echo "   2. Replace 'your_daily_api_key_here' in .env with your actual key"
echo ""



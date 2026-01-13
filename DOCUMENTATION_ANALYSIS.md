# Analysis of Official Sarvam TTS WebSocket Documentation

**Source**: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/streaming-api

## Key Findings

### ✅ What the Documentation Shows

**Config Message Format** (from "Input Message Types" section):
```json
{
  "type": "config",
  "data": {
    "speaker": "anushka",
    "target_language_code": "en-IN",
    "pitch": 0.8,
    "pace": 2,
    "min_buffer_size": 50,
    "max_chunk_length": 200,
    "output_audio_codec": "mp3",
    "output_audio_bitrate": "128k"
  }
}
```

**Text Message Format**:
```json
{
  "type": "text",
  "data": {
    "text": "This is an example sentence that will be converted to speech."
  }
}
```

**Flush Message Format**:
```json
{
  "type": "flush"
}
```

### ❌ Issues with Our Current Implementation

**We're sending fields that ARE NOT in the official documentation:**

1. ❌ `loudness` - NOT mentioned in docs
2. ❌ `speech_sample_rate` - NOT mentioned in docs  
3. ❌ `enable_preprocessing` - NOT mentioned in docs
4. ❌ `model` - Should be in URL query params, NOT in config message

**Fields that ARE in the docs (but we're not using):**
- ✅ `speaker` - We're using this
- ✅ `target_language_code` - We're using this
- ✅ `pitch` - We're using this
- ✅ `pace` - We're using this
- ❓ `min_buffer_size` - Optional, we're not using
- ❓ `max_chunk_length` - Optional, we're not using
- ❓ `output_audio_codec` - Optional, we're not using (maybe should use "pcm" for raw audio)
- ❓ `output_audio_bitrate` - Optional, we're not using

### 🔍 Critical Difference

The documentation shows **only 2 required fields** in the minimal config example:
- `speaker`
- `target_language_code`

Everything else is optional. **We're sending unsupported fields** that might be causing the 422 validation error!

## What We Should Fix

1. Remove unsupported fields: `loudness`, `speech_sample_rate`, `enable_preprocessing`, `model`
2. Use only documented fields: `speaker`, `target_language_code`, `pitch`, `pace` (and optional ones if needed)
3. Consider adding `output_audio_codec: "pcm"` since we're receiving raw PCM audio


# API Keys Quick Reference

## ✅ Keys You Have

### ElevenLabs API Key
```
ELEVENLABS_API_KEY=d778b52595a077a02be618378ec087fffc980a1d57cc45b3cbeb4786869c8a1f
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```
**Status**: ✅ Ready to use
**Purpose**: Text-to-speech for Riya's voice

### Pipecat Cloud API Key
```
PIPECAT_API_KEY=pk_f0552b7a-9a73-4c1b-babe-796702702432
```
**Status**: ⚠️ Available but not used in current implementation
**Purpose**: Pipecat Cloud framework (includes Daily.co)

## ❌ Still Needed

### Daily.co API Key (for current implementation)
```
DAILY_API_KEY=your_daily_api_key_here
```
**Status**: ❌ Need to get this
**How to get**: 
- Option 1: Sign up at https://www.daily.co/ → Dashboard → API Keys
- Option 2: Use Pipecat Cloud (which includes Daily.co) - but requires code changes

## Current Implementation Status

**Current Code**: Uses direct Daily.co API
**What You Have**: Pipecat Cloud API key

**Decision Needed**:
1. **Keep current code** → Get Daily.co API key separately
2. **Switch to Pipecat** → Refactor code to use Pipecat Cloud SDK

## Next Steps

1. Add ElevenLabs key to `.env` ✅ (key provided)
2. Decide: Daily.co direct OR Pipecat Cloud?
3. Get Daily.co key OR refactor for Pipecat
4. Test the integration



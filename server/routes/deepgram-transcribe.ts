import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createClient } from '@deepgram/sdk';
import fs from 'fs';

const router = Router();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize Deepgram client
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramApiKey) {
  console.warn('[Deepgram] API key not configured. Speech-to-text will not work.');
}

const deepgram = deepgramApiKey ? createClient(deepgramApiKey) : null;

// POST /api/transcribe - Transcribe audio to text using Deepgram
router.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!deepgram) {
      return res.status(503).json({ 
        error: 'Speech-to-text service not configured. Please add DEEPGRAM_API_KEY to environment variables.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFilePath = req.file.path;
    console.log('[Deepgram] Processing audio file:', audioFilePath);

    try {
      // Read the audio file
      const audioBuffer = fs.readFileSync(audioFilePath);

      // Transcribe with Deepgram
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'hi', // Hindi + English (Hinglish support)
          smart_format: true,
          punctuate: true,
          diarize: false,
        }
      );

      // Clean up uploaded file
      fs.unlinkSync(audioFilePath);

      if (error) {
        console.error('[Deepgram] Transcription error:', error);
        return res.status(500).json({ error: 'Transcription failed', details: error });
      }

      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

      console.log('[Deepgram] Success:', transcript);
      
      res.json({
        text: transcript,
        confidence: confidence,
        words: result?.results?.channels?.[0]?.alternatives?.[0]?.words || [],
      });

    } catch (transcribeError: any) {
      console.error('[Deepgram] Error during transcription:', transcribeError);
      
      // Clean up file on error
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }

      res.status(500).json({ 
        error: 'Failed to transcribe audio', 
        details: transcribeError.message 
      });
    }

  } catch (error: any) {
    console.error('[Deepgram] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process audio' });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize AssemblyAI client
const assemblyAIApiKey = process.env.ASSEMBLYAI_API_KEY;

if (!assemblyAIApiKey) {
  console.warn('[Transcribe] AssemblyAI API key not configured. Speech-to-text will not work.');
}

const client = assemblyAIApiKey ? new AssemblyAI({ apiKey: assemblyAIApiKey }) : null;

// POST /api/transcribe - Transcribe audio to text
router.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!client) {
      return res.status(503).json({ 
        error: 'Speech-to-text service not configured. Please add ASSEMBLYAI_API_KEY to environment variables.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFilePath = req.file.path;
    console.log('[Transcribe] Processing audio file:', audioFilePath);

    try {
      // Upload audio file to AssemblyAI
      const transcript = await client.transcripts.transcribe({
        audio: audioFilePath,
        language_code: 'hi', // Hindi + English (Hinglish support)
      });

      // Clean up uploaded file
      fs.unlinkSync(audioFilePath);

      if (transcript.status === 'error') {
        console.error('[Transcribe] AssemblyAI error:', transcript.error);
        return res.status(500).json({ error: 'Transcription failed', details: transcript.error });
      }

      console.log('[Transcribe] Success:', transcript.text);
      
      res.json({
        text: transcript.text || '',
        confidence: transcript.confidence,
        words: transcript.words,
      });

    } catch (transcribeError: any) {
      console.error('[Transcribe] Error during transcription:', transcribeError);
      
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
    console.error('[Transcribe] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process audio' });
  }
});

export default router;


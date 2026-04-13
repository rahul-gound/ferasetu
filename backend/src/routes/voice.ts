import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Multer for audio uploads
const audioDir = './uploads/audio';
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, audioDir),
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.wav`)
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/mp4'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

// Convert voice to text using Sarvam Speech API
router.post('/speech-to-text',
  audioUpload.single('audio'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'Audio file required' });
      return;
    }

    const { language = 'en' } = req.body;

    try {
      // Use Sarvam Speech-to-Text API
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(req.file.path);
      const blob = new Blob([fileBuffer], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('language_code', language);
      formData.append('model', 'saarika:v2');

      const response = await axios.post(
        'https://api.sarvam.ai/speech-to-text',
        formData,
        {
          headers: {
            'api-subscription-key': process.env.SARVAM_30B_API_KEY || '',
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        }
      );

      // Clean up audio file
      fs.unlinkSync(req.file.path);

      res.json({
        text: response.data.transcript || '',
        language: response.data.language_code || language,
        confidence: response.data.confidence || null
      });
    } catch (err: any) {
      // Fallback for dev/testing
      if (process.env.NODE_ENV === 'development') {
        fs.unlinkSync(req.file.path);
        res.json({
          text: 'Voice recognition processed (development mode)',
          language,
          confidence: 0.9
        });
        return;
      }
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: `Speech to text failed: ${err.message}` });
    }
  }
);

// Convert text to speech using Sarvam TTS API
router.post('/text-to-speech',
  body('text').notEmpty().withMessage('Text is required'),
  body('language').optional().isString(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { text, language = 'en' } = req.body;

    try {
      const response = await axios.post(
        'https://api.sarvam.ai/text-to-speech',
        {
          inputs: [text],
          target_language_code: language,
          speaker: 'meera',
          model: 'bulbul:v1'
        },
        {
          headers: {
            'api-subscription-key': process.env.SARVAM_30B_API_KEY || '',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const audioBase64 = response.data.audios?.[0];
      if (!audioBase64) {
        throw new Error('No audio returned');
      }

      res.json({ audio: audioBase64, format: 'wav' });
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        res.json({
          audio: null,
          format: 'wav',
          message: 'TTS not available in development mode'
        });
        return;
      }
      res.status(500).json({ error: `Text to speech failed: ${err.message}` });
    }
  }
);

export default router;

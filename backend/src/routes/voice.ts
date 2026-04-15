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
    // Map simple language codes to Sarvam regional codes
    const sarvamLanguageMap: Record<string, string> = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'or': 'or-IN',
      'pa': 'pa-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN'
    };
    const sarvamLang = sarvamLanguageMap[language] || 'en-IN';

    try {
      // Use Sarvam Speech-to-Text API
      // Note: Node.js 18+ has native FormData/Blob, but axios might need specific handling
      const fileBuffer = fs.readFileSync(req.file.path);
      
      const formData = new (require('form-data'))();
      formData.append('file', fileBuffer, {
        filename: 'audio.wav',
        contentType: req.file.mimetype
      });
      formData.append('language_code', sarvamLang);
      formData.append('model', 'saarika:v2');

      const response = await axios.post(
        'https://api.sarvam.ai/speech-to-text',
        formData,
        {
          headers: {
            'api-subscription-key': process.env.SARVAM_30B_API_KEY || '',
            ...formData.getHeaders()
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
    
    // Map simple language codes to Sarvam regional codes
    const sarvamLanguageMap: Record<string, string> = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'or': 'or-IN',
      'pa': 'pa-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN'
    };
    const sarvamLang = sarvamLanguageMap[language] || 'hi-IN'; // Default to hi-IN for TTS if unknown

    try {
      const response = await axios.post(
        'https://api.sarvam.ai/text-to-speech',
        {
          inputs: [text],
          target_language_code: sarvamLang,
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

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';
import {
  SURVEY_QUESTIONS,
  SurveyAnswer,
  buildLocalAssistantResponse,
  buildSurveySummary
} from '../services/surveyAssistant';

const router = Router();
router.use(authenticate);
// Keep assistant responses fast for UX and fail over quickly to deterministic local flow.
const OPENAI_REQUEST_TIMEOUT_MS = 20000;

router.get('/questions', (_req: AuthenticatedRequest, res: Response): void => {
  res.json({ questions: SURVEY_QUESTIONS });
});

router.get('/submissions', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, answers_json, feedback, contact, ai_summary_json, created_at
      FROM survey_submissions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user!.id);
    res.json({ submissions: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load submissions' });
  }
});

router.get('/submissions/export', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT created_at, feedback, contact, ai_summary_json
      FROM survey_submissions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user!.id) as Array<{ created_at: string; feedback: string; contact: string; ai_summary_json: string }>;

    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = 'created_at,feedback,contact,summary\n';
    const content = rows
      .map((row) => [row.created_at, row.feedback, row.contact, row.ai_summary_json].map(escapeCsv).join(','))
      .join('\n');

    res.json({ csv: `${header}${content}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export submissions' });
  }
});

router.post(
  '/submissions',
  body('answers').isArray({ min: 5 }).withMessage('Please answer at least 5 survey questions'),
  body('feedback').trim().isLength({ min: 5 }).withMessage('Feedback must be at least 5 characters'),
  body('contact').optional().isString(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const db = getDatabase();
      const submissionId = uuidv4();
      const answers = (req.body.answers || []) as SurveyAnswer[];
      const feedback = String(req.body.feedback || '').trim();
      const contact = String(req.body.contact || '').trim();
      const providedSummary = req.body.summary && typeof req.body.summary === 'object'
        ? req.body.summary
        : buildSurveySummary(answers, feedback);

      db.prepare(`
        INSERT INTO survey_submissions (id, user_id, answers_json, feedback, contact, ai_summary_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        submissionId,
        req.user!.id,
        JSON.stringify(answers),
        feedback,
        contact || null,
        JSON.stringify(providedSummary)
      );

      res.status(201).json({ success: true, id: submissionId });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save survey submission' });
    }
  }
);

router.post(
  '/assistant',
  body('answers').optional().isArray(),
  body('latestMessage').optional().isString(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const answers = (req.body.answers || []) as SurveyAnswer[];
    const latestMessage = String(req.body.latestMessage || '').trim();
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (apiKey) {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content:
                  'You are a survey assistant. Ask one survey question at a time from the provided list. Keep replies concise. Return strict JSON with keys: reply, done, nextQuestionId, summary.'
              },
              {
                role: 'user',
                content: JSON.stringify({
                  questions: SURVEY_QUESTIONS,
                  answers,
                  latestMessage
                })
              }
            ]
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: OPENAI_REQUEST_TIMEOUT_MS
          }
        );

        const raw = response.data?.choices?.[0]?.message?.content;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const summary = parsed.done ? buildSurveySummary(answers, latestMessage) : undefined;
            const nextQuestion = SURVEY_QUESTIONS.find((q) => q.id === parsed.nextQuestionId);
            res.json({
              mode: 'openai',
              done: Boolean(parsed.done),
              reply: String(parsed.reply || ''),
              nextQuestion,
              summary
            });
            return;
          } catch {
            // fall through to local deterministic flow
          }
        }
      }

      const local = buildLocalAssistantResponse(answers, latestMessage);
      const summary = local.done ? buildSurveySummary(answers, latestMessage) : undefined;
      res.json({ ...local, summary });
    } catch (error: any) {
      const local = buildLocalAssistantResponse(answers, latestMessage);
      const summary = local.done ? buildSurveySummary(answers, latestMessage) : undefined;
      res.json({ ...local, summary, fallbackReason: error.message || 'assistant_error' });
    }
  }
);

export default router;

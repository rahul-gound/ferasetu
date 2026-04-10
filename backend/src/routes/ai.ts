import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { generateAIResponse, generateWebsiteConfig, ChatMessage } from '../services/sarvamAI';
import { getDatabase } from '../models/database';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Chat with AI assistant
router.post('/chat',
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('language').optional().isString(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { message, language = 'en', conversationId } = req.body;
    const db = getDatabase();

    // Load conversation history if conversationId provided
    let history: ChatMessage[] = [];
    if (conversationId) {
      const pastMessages = db.prepare(`
        SELECT role, content FROM ai_conversations
        WHERE user_id = ? AND id IN (
          SELECT id FROM ai_conversations WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 20
        )
        ORDER BY created_at ASC
      `).all(req.user!.id, req.user!.id) as Array<{ role: string; content: string }>;
      history = pastMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    }

    // Detect if this is a complex task (website creation, major changes)
    const isComplexTask = /create|build|generate|make.*website|redesign|restructure/i.test(message);

    try {
      const response = await generateAIResponse(
        message,
        history,
        language,
        isComplexTask ? 'complex' : 'simple'
      );

      // Save conversation
      const userMsgId = uuidv4();
      const aiMsgId = uuidv4();

      db.prepare(`
        INSERT INTO ai_conversations (id, user_id, role, content, language, model_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userMsgId, req.user!.id, 'user', message, language, null);

      db.prepare(`
        INSERT INTO ai_conversations (id, user_id, role, content, language, model_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(aiMsgId, req.user!.id, 'assistant', response.content, language, response.model);

      res.json({
        id: aiMsgId,
        content: response.content,
        model: response.model,
        language,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Generate website from description
router.post('/generate-website',
  body('businessType').notEmpty(),
  body('businessName').notEmpty(),
  body('description').notEmpty(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const config = await generateWebsiteConfig(req.body);
      res.json({ config, generated: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get conversation history
router.get('/conversations', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  const messages = db.prepare(`
    SELECT id, role, content, language, model_used, created_at
    FROM ai_conversations
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user!.id, limit, offset);

  res.json({ messages: messages.reverse(), page, limit });
});

export default router;

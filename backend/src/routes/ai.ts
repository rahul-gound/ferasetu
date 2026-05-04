import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { generateAIResponse, generateWebsiteConfig, ChatMessage } from '../services/sarvamAI';
import { getDatabase } from '../models/database';

const router = Router();

const AI_CREDIT_COST: Record<string, number> = {
  shopkeeper_assistant: 1,
  website_ai: 3,
  customer_assistant: 2
};

function chargeAiCredits(userId: string, usageType: string): { creditsUsed: number; balance: number } {
  const db = getDatabase();
  const creditsUsed = AI_CREDIT_COST[usageType] || 1;
  const user = db.prepare(`
    SELECT ai_credits_balance, ai_credits_reset_at, ai_credits_monthly_limit
    FROM users WHERE id = ?
  `).get(userId) as any;

  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  if (user.ai_credits_reset_at && new Date(user.ai_credits_reset_at).getTime() <= Date.now()) {
    db.prepare(`
      UPDATE users
      SET ai_credits_balance = ai_credits_balance + ai_credits_monthly_limit,
          ai_credits_used_month = 0,
          ai_credits_reset_at = datetime('now', '+30 days')
      WHERE id = ?
    `).run(userId);
    user.ai_credits_balance += user.ai_credits_monthly_limit || 0;
  }

  if ((user.ai_credits_balance || 0) < creditsUsed) {
    throw Object.assign(new Error('Not enough AI credits. Please buy more credits or upgrade your plan.'), { status: 402 });
  }

  db.prepare(`
    UPDATE users
    SET ai_credits_balance = ai_credits_balance - ?,
        ai_credits_used_month = ai_credits_used_month + ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(creditsUsed, creditsUsed, userId);

  return { creditsUsed, balance: (user.ai_credits_balance || 0) - creditsUsed };
}

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
    const isWebsiteJsonRequest = /Generate website sections JSON for:/i.test(message) || /json/i.test(message);
    const isComplexTask = /create|build|generate|make.*website|redesign|restructure/i.test(message) || isWebsiteJsonRequest;
    const usageType = req.body.usageType || (isWebsiteJsonRequest ? 'website_ai' : 'shopkeeper_assistant');

    let creditCharge: { creditsUsed: number; balance: number } | null = null;
    try {
      creditCharge = chargeAiCredits(req.user!.id, usageType);

      // Custom system prompt injection for actions
      const enhancedHistory = [...history];
      if (history.length === 0 || !history.find(h => h.role === 'system')) {
        const actionPrompt = `
You are Fera AI. Keep simple greetings (like "hi") very short.
For complex store tasks, think step-by-step inside <think></think> tags before you reply.

ACTIONS:
You can perform actions by outputting a SPECIAL JSON block at the very end of your message.
1. ADD_PRODUCT: {"action": "ADD_PRODUCT", "data": {"name": "Name", "price": 100, "stock_quantity": 10, "category": "General"}}
2. EDIT_PRODUCT: {"action": "EDIT_PRODUCT", "data": {"search_name": "chips", "update": {"sale_price": 9}}} 
   - Use this for discounts. If user says "10% off on chips" and original price is 10, set sale_price to 9.
3. RAISE_TICKET: {"action": "RAISE_TICKET", "data": {"subject": "Title", "description": "Details"}}

Do not output the JSON until you have all information. Keep your conversation natural.
        `;
        // Inject system prompt manually
        enhancedHistory.unshift({ role: 'user', content: `SYSTEM INSTRUCTION: ${actionPrompt}\n\nUser: Hello` });
        enhancedHistory.push({ role: 'assistant', content: 'Hello! I am Fera AI. How can I help you today?' });
      }

      const response = await generateAIResponse(
        message,
        enhancedHistory,
        language,
        isComplexTask ? 'complex' : 'simple',
        isWebsiteJsonRequest ? 'websiteBuilder' : 'general'
      );

      let finalContent = response.content;

      // Detect JSON action blocks
      const jsonMatch = finalContent.match(/```json\n?([\s\S]*?)\n?```/i);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const actionObj = JSON.parse(jsonMatch[1].trim());
          if (actionObj.action === 'ADD_PRODUCT') {
            const { name, price, stock_quantity, category } = actionObj.data;
            db.prepare(`
              INSERT INTO products (id, user_id, name, price, stock_quantity, category)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), req.user!.id, name, price || 0, stock_quantity || 0, category || 'General');
            finalContent = finalContent.replace(jsonMatch[0], '').trim() + `\n\n✅ Successfully added ${name} to your products.`;
          } else if (actionObj.action === 'EDIT_PRODUCT') {
            const { search_name, update } = actionObj.data;
            // Find most similar product
            const product = db.prepare('SELECT id, name, price FROM products WHERE user_id = ? AND name LIKE ? LIMIT 1').get(req.user!.id, `%${search_name}%`) as any;
            if (product) {
              if (update.sale_price !== undefined) {
                db.prepare("UPDATE products SET sale_price = ?, updated_at = datetime('now') WHERE id = ?").run(update.sale_price, product.id);
                finalContent = finalContent.replace(jsonMatch[0], '').trim() + `\n\n✅ Applied discount to ${product.name}. New sale price: ₹${update.sale_price}`;
              }
            }
          } else if (actionObj.action === 'RAISE_TICKET') {
            const { subject, description } = actionObj.data;
            db.prepare(`
              INSERT INTO tickets (id, user_id, subject, description)
              VALUES (?, ?, ?, ?)
            `).run(uuidv4(), req.user!.id, subject, description);
            finalContent = finalContent.replace(jsonMatch[0], '').trim() + `\n\n🎟️ Support ticket "${subject}" has been raised. Our admin team will look into it.`;
          }
        } catch (e) {
          console.error("Action parse error", e);
        }
      }

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
      `).run(aiMsgId, req.user!.id, 'assistant', finalContent, language, response.model);

      db.prepare(`
        INSERT INTO ai_usage_logs (id, user_id, model, prompt_tokens, completion_tokens, cost, credits_used, usage_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        req.user!.id,
        response.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        0,
        creditCharge.creditsUsed,
        usageType
      );

      res.json({
        id: aiMsgId,
        content: finalContent,
        model: response.model,
        language,
        creditsUsed: creditCharge.creditsUsed,
        aiCreditsBalance: creditCharge.balance,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      if (creditCharge && err.status !== 402) {
        db.prepare("UPDATE users SET ai_credits_balance = ai_credits_balance + ?, ai_credits_used_month = MAX(ai_credits_used_month - ?, 0) WHERE id = ?")
          .run(creditCharge.creditsUsed, creditCharge.creditsUsed, req.user!.id);
      }
      res.status(err.status || 500).json({ error: err.message });
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

    const db = getDatabase();

    let creditCharge: { creditsUsed: number; balance: number } | null = null;
    try {
      creditCharge = chargeAiCredits(req.user!.id, 'website_ai');
      const config = await generateWebsiteConfig(req.body);
      db.prepare(`
        INSERT INTO ai_usage_logs (id, user_id, model, prompt_tokens, completion_tokens, cost, credits_used, usage_type)
        VALUES (?, ?, ?, 0, 0, 0, ?, 'website_ai')
      `).run(uuidv4(), req.user!.id, 'website-generator', creditCharge.creditsUsed);
      res.json({ config, generated: true, creditsUsed: creditCharge.creditsUsed, aiCreditsBalance: creditCharge.balance, timestamp: new Date().toISOString() });
    } catch (err: any) {
      if (creditCharge && err.status !== 402) {
        db.prepare("UPDATE users SET ai_credits_balance = ai_credits_balance + ?, ai_credits_used_month = MAX(ai_credits_used_month - ?, 0) WHERE id = ?")
          .run(creditCharge.creditsUsed, creditCharge.creditsUsed, req.user!.id);
      }
      res.status(err.status || 500).json({ error: err.message });
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

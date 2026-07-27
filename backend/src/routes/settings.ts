import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  getSmtpSettings,
  saveSmtpSettings,
  sendTestEmail,
  getProviderDefaults,
} from '../services/smtpService';

const router = Router();

const testEmailLimiter = createRateLimiter(5, 15);

router.get('/smtp', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const settings = getSmtpSettings(req.user!.id);
    if (!settings) {
      res.json({
        configured: false,
        settings: {
          provider: 'custom',
          host: '',
          port: 587,
          username: '',
          sender_name: '',
          sender_email: '',
          reply_to_email: '',
          ssl_enabled: false,
          tls_enabled: true,
          otp_enabled: true,
          otp_length: 6,
          otp_expiry_minutes: 10,
          otp_resend_cooldown: 60,
          otp_max_attempts: 5,
          otp_subject: 'Verify your email • FeraSetu',
          otp_body_template: '',
          is_active: false,
          has_password: false,
        },
        defaults: getProviderDefaults('custom'),
      });
      return;
    }
    res.json({
      configured: true,
      settings,
      defaults: getProviderDefaults(settings.provider),
    });
  } catch (err: any) {
    console.error('GET /settings/smtp error:', err);
    res.status(500).json({ error: 'Failed to load SMTP settings' });
  }
});

router.put('/smtp', authenticate, [
  body('provider').optional().isIn(['gmail', 'sendgrid', 'mailgun', 'ses', 'custom']),
  body('host').optional().trim(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('username').optional().trim(),
  body('password').optional().trim(),
  body('sender_name').optional().trim(),
  body('sender_email').optional().isEmail(),
  body('reply_to_email').optional().isEmail(),
  body('ssl_enabled').optional().isBoolean(),
  body('tls_enabled').optional().isBoolean(),
  body('otp_enabled').optional().isBoolean(),
  body('otp_length').optional().isInt({ min: 4, max: 8 }),
  body('otp_expiry_minutes').optional().isInt({ min: 1, max: 60 }),
  body('otp_resend_cooldown').optional().isInt({ min: 0, max: 300 }),
  body('otp_max_attempts').optional().isInt({ min: 1, max: 20 }),
  body('otp_subject').optional().trim(),
  body('otp_body_template').optional().trim(),
  body('is_active').optional().isBoolean(),
], (req: AuthenticatedRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const settings = saveSmtpSettings(req.user!.id, {
      provider: req.body.provider,
      host: req.body.host,
      port: req.body.port,
      username: req.body.username,
      password: req.body.password,
      sender_name: req.body.sender_name,
      sender_email: req.body.sender_email,
      reply_to_email: req.body.reply_to_email,
      ssl_enabled: req.body.ssl_enabled,
      tls_enabled: req.body.tls_enabled,
      otp_enabled: req.body.otp_enabled,
      otp_length: req.body.otp_length,
      otp_expiry_minutes: req.body.otp_expiry_minutes,
      otp_resend_cooldown: req.body.otp_resend_cooldown,
      otp_max_attempts: req.body.otp_max_attempts,
      otp_subject: req.body.otp_subject,
      otp_body_template: req.body.otp_body_template,
      is_active: req.body.is_active,
    });

    res.json({ success: true, settings });
  } catch (err: any) {
    console.error('PUT /settings/smtp error:', err);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

router.post('/smtp/test', authenticate, testEmailLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const result = await sendTestEmail(req.user!.id, req.body.email);
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    console.error('POST /settings/smtp/test error:', err);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

router.get('/smtp/provider-defaults', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const provider = (req.query.provider as string) || 'custom';
  const defaults = getProviderDefaults(provider);
  res.json(defaults);
});

export default router;

# ⚡ Quick Setup: Email Service

## 5-Minute Setup Guide

### Step 1: Get Brevo SMTP Credentials (2 min)
1. Go to https://www.brevo.com/
2. Sign up for free
3. Click: Settings → SMTP & API
4. Copy your SMTP credentials
   - User: `your_user@smtp-brevo.com`
   - Password: `your_api_key`

### Step 2: Configure Environment Variables (1 min)
```bash
cd backend
nano .env  # or open with your editor
```

Add these lines:
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_user@smtp-brevo.com
SMTP_PASS=your_api_key
EMAIL_FROM="FeraSetu <noreply@yourdomain.com>"
```

Save and exit.

### Step 3: Start Server (1 min)
```bash
npm run dev
```

You should see:
```
✅ Mail service verified successfully
```

### Step 4: Test Registration (1 min)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@gmail.com",
    "password": "TestPass123!",
    "name": "Test User"
  }'
```

Check your email inbox for the welcome email! 🎉

---

## Files Modified/Created

| File | Purpose |
|------|---------|
| `src/services/mailService.ts` | Email service with Nodemailer |
| `src/routes/auth.ts` | Integrated email on signup |
| `src/index.ts` | Mail verification on startup |
| `.env.example` | Template for SMTP config |

---

## Common Issues

| Problem | Solution |
|---------|----------|
| `⚠️ SMTP credentials not configured` | Add SMTP vars to `.env` |
| `❌ Mail service verification failed` | Check Brevo credentials |
| Email not arriving | Check spam folder, verify SPF/DKIM |
| Port 587 refused | Use `SMTP_PORT=25` as fallback |

---

## For Developers

### Send Email Anywhere in Code
```typescript
import { sendWelcomeEmail } from '../services/mailService';

await sendWelcomeEmail('user@example.com', 'John Doe');
```

### Check Email Status
```typescript
import { verifyMailService } from '../services/mailService';

const isHealthy = await verifyMailService();
```

### Send Order Confirmation (Already Built)
```typescript
import { sendOrderConfirmationEmail } from '../services/mailService';

await sendOrderConfirmationEmail('user@example.com', {
  orderId: '12345',
  invoiceNumber: 'INV-001',
  code: '54321',
  type: 'delivery',
  total: 2999,
  items: 5
});
```

---

## Production Checklist
- [ ] Add real Brevo credentials to `.env` on production
- [ ] Update `EMAIL_FROM` to use your domain
- [ ] Test email delivery before going live
- [ ] Set up SPF/DKIM/DMARC records for domain
- [ ] Monitor bounce rates after deployment
- [ ] Add email alerts for SMTP failures

---

**That's it!** Your email service is ready to use. 🚀

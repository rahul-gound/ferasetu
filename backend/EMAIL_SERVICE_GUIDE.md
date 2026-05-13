# Email Service Implementation Guide

## Overview
This document explains the email service implementation for FeraSetu using Nodemailer and Brevo SMTP.

---

## Architecture

### Files Created/Modified

#### 1. **New File: `backend/src/services/mailService.ts`**
- Reusable mail service module
- Nodemailer transporter configuration with Brevo SMTP
- Three exported functions:
  - `sendWelcomeEmail(to, name)` - Welcome email for new signups
  - `sendOrderConfirmationEmail(to, orderDetails)` - Order confirmation
  - `verifyMailService()` - Health check

#### 2. **Modified: `backend/src/routes/auth.ts`**
- Added import: `import { sendWelcomeEmail } from '../services/mailService';`
- Integration in POST `/api/auth/register` endpoint
- **Non-blocking email**: Email is sent asynchronously after registration completes
- Error handling: Email failures don't prevent user signup

#### 3. **Modified: `backend/src/index.ts`**
- Added import: `import { verifyMailService } from './services/mailService';`
- Added `verifyMailService()` call on server startup
- Validates SMTP configuration on app initialization

#### 4. **Updated: `backend/.env.example`**
- Added Brevo SMTP configuration template
- Includes all required environment variables

---

## Environment Variables

Add these to `backend/.env`:

```env
# SMTP Configuration (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_user@smtp-brevo.com
SMTP_PASS=your_smtp_password_from_brevo
EMAIL_FROM="FeraSetu <noreply@yourdomain.com>"
```

### How to Get Brevo Credentials:
1. Sign up at https://www.brevo.com/
2. Go to SMTP & API settings
3. Enable SMTP
4. Copy SMTP credentials
5. Add to `.env`

---

## Features

### 1. **Nodemailer Configuration**
- Uses Brevo's SMTP relay server
- TLS encryption on port 587 (secure: false for TLS, not SSL)
- Graceful fallback if SMTP not configured
- Error logging without exposing credentials

### 2. **Welcome Email**
**Subject:** `Welcome to FeraSetu 🎉`

**Features:**
- Personalized greeting with user name
- Store icon and brand colors
- Call-to-action: "Start Adding Your Products"
- Quick feature list
- Professional, responsive HTML template

**Trigger:** Automatically sent after successful user registration

### 3. **Order Confirmation Email**
**Subject:** `Order Confirmed: #<invoice_number> 🛍️`

**Features:**
- Display delivery/pickup code
- Order details (total, items)
- Invoice number
- Security code for handshake

**Not yet integrated** - Ready for orders route implementation

### 4. **Error Handling**
- All email operations wrapped in try-catch
- **Non-blocking**: Email failures don't affect core functionality
- Errors logged without sensitive data
- Service gracefully degrades if SMTP unavailable

### 5. **Mail Service Health Check**
- `verifyMailService()` called on server startup
- Validates SMTP connection
- Logs status (✅ success / ❌ failure)
- Safe to run in development without SMTP

---

## Code Flow

### User Registration with Email

```
POST /api/auth/register
  ↓
Input validation
  ↓
registerUser() in authService.ts
  ├─ Hash password
  ├─ Create subdomain
  ├─ Insert to database
  └─ Return user + JWT token
  ↓
sendWelcomeEmail() in mailService.ts (async, non-blocking)
  ├─ Check if transporter available
  ├─ Prepare HTML email
  └─ Send via Brevo SMTP
       (failures logged but don't affect response)
  ↓
res.status(201).json({ user, token })
```

### Key Points:
- Email is sent **after** user creation completes
- Email sending is **non-blocking** (async)
- Registration response sent immediately regardless of email status
- Errors logged with context but no credentials exposed

---

## Usage Examples

### Sending Welcome Email (Automatic on Signup)
```typescript
import { sendWelcomeEmail } from '../services/mailService';

// Called automatically in auth register route
await sendWelcomeEmail('user@example.com', 'John Doe');
```

### Sending Order Confirmation (Future Implementation)
```typescript
import { sendOrderConfirmationEmail } from '../services/mailService';

await sendOrderConfirmationEmail('user@example.com', {
  orderId: '12345',
  invoiceNumber: 'INV-2024-001',
  code: '54321',
  type: 'delivery',
  total: 2999,
  items: 5
});
```

### Checking Mail Service Status
```typescript
import { verifyMailService } from '../services/mailService';

const isHealthy = await verifyMailService();
if (!isHealthy) {
  console.warn('Email service not available');
}
```

---

## Logging

### Log Format
All logs follow this pattern:

**Success:**
```
📧 Welcome email sent successfully to: user@example.com
```

**Failure:**
```
❌ Failed to send welcome email: {
  to: "user@example.com",
  error: "ECONNREFUSED",
  code: "ECONNREFUSED"
}
```

**Startup:**
```
✅ Mail service verified successfully
```

### Sensitive Data Protection
- Passwords never logged
- API keys never logged
- Only logs recipient email + error code + message
- Credentials only exist in `.env` (in `.gitignore`)

---

## Testing

### Local Testing without SMTP
1. Remove SMTP credentials from `.env` (leave blank)
2. Server starts with warning: `⚠️ SMTP credentials not configured`
3. Emails skip silently (logged as warning)
4. No blocking or errors

### Testing with Brevo
1. Add valid Brevo SMTP credentials to `.env`
2. Start server: `npm run dev`
3. On startup you should see:
   ```
   ✅ Mail service verified successfully
   ```
4. Register new user - check email inbox for welcome email
5. Check server logs:
   ```
   📧 Welcome email sent successfully to: test@example.com
   ```

### Common Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | SMTP host unreachable | Check `SMTP_HOST`, verify Brevo account active |
| `Invalid login` | Wrong credentials | Verify `SMTP_USER` and `SMTP_PASS` from Brevo |
| `Port 587 refused` | Firewall blocking | Use `SMTP_PORT=25` as fallback, or check VPS firewall |
| Emails not arriving | Sender reputation | Verify `EMAIL_FROM` is whitelisted in Brevo |

---

## Security Checklist

- ✅ No hardcoded credentials in code
- ✅ Credentials in `.env` (excluded from git)
- ✅ TLS encryption (port 587, secure: false)
- ✅ Error handling doesn't expose secrets
- ✅ Non-blocking email (no DoS risk)
- ✅ Rate limiting on auth endpoints
- ✅ HTML templating with no user injection

---

## Future Enhancements

1. **Email Queue System**
   - Add Bull/RabbitMQ for async email processing
   - Retry failed emails with exponential backoff

2. **Email Templates**
   - Extract HTML to separate template files
   - Support multiple languages (Hindi, Tamil, etc.)
   - Dynamic template engine (EJS/Handlebars)

3. **More Email Types**
   - Product inquiry confirmations
   - Password reset
   - Order status updates
   - Payment reminders

4. **Analytics**
   - Track email delivery rates
   - Monitor bounce rates
   - A/B test email content

5. **Branding**
   - Support custom sender name/email per shop
   - Shopkeeper's logo in emails
   - Custom email domain

---

## API Reference

### Register Endpoint with Email
```
POST /api/auth/register

Request Body:
{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe",
  "businessName": "My Store",
  "phone": "+919876543210",
  "preferredLanguage": "en"
}

Response (201):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "subdomain": "my-store",
    "plan": "free"
  },
  "token": "jwt_token_here"
}

Side Effect:
- Welcome email sent asynchronously
- Log entry: "📧 Welcome email sent successfully to: user@example.com"
```

---

## Deployment Checklist

- [ ] Add Brevo SMTP credentials to production `.env`
- [ ] Update `EMAIL_FROM` to use production domain
- [ ] Update dashboard link in email template to production URL
- [ ] Test email delivery on staging first
- [ ] Monitor email bounce rates post-deployment
- [ ] Set up email alerts for SMTP failures
- [ ] Document SMTP credentials in secure vault (AWS Secrets Manager, etc.)
- [ ] Verify SPF/DKIM/DMARC records for sender domain

---

## References

- **Nodemailer Docs:** https://nodemailer.com/
- **Brevo SMTP Setup:** https://www.brevo.com/solutions/solutions-email/
- **Email Best Practices:** https://www.smtpmailer.org/
- **TypeScript Async/Await:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html

---

## Support

For issues or questions:
1. Check the "Common Issues" table above
2. Review server logs with `-v` flag: `npm run dev 2>&1 | grep -i email`
3. Verify `.env` has all required variables
4. Test SMTP connection: `telnet smtp-relay.brevo.com 587`

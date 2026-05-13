import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correctly point to .env in the parent directory of where test-email.ts is
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testEmail() {
  console.log('Testing SMTP connection...');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"FeraSetu Test" <noreply@fera-search.tech>',
      to: 'himanshusah659@gmail.com',
      subject: 'FeraSetu SMTP Test',
      text: 'If you see this, your SMTP settings are correct!',
    });
    console.log('✅ Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Test Failed:', error);
  }
}

testEmail();

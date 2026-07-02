# FeraSetu Architecture Guide

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                          USER (Browser / Mobile)                                │
│                                                                                 │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                      FRONTEND (Cloudflare Pages)                                 │
│                         React 19 + Vite + TypeScript                            │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                          Auth Flow                                       │   │
│  │                                                                          │   │
│  │   Register ──► Step 0: Form ──► Step 1: OTP ──► Step 2: Success        │   │
│  │      │                         │                        │                │   │
│  │      ▼                         ▼                        ▼                │   │
│  │   sendOTP()              verifyOTP()             createAccountAfterOTP() │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────┬─────────────────────────────────┬─────────────────────────┘
                       │                                 │
                       ▼                                 ▼
┌───────────────────────────┐          ┌───────────────────────────────┐
│                           │          │                               │
│    APPWRITE (Cloud)       │          │   ORACLE CLOUD / DENO         │
│                           │          │                               │
│  ┌─────────────────────┐  │          │  ┌─────────────────────────┐  │
│  │ Account Service     │  │          │  │  Node.js Backend        │  │
│  │  - create()         │  │          │  │  (Express + TypeScript)  │  │
│  │  - createSession()  │  │          │  │                         │  │
│  │  - createJWT()      │  │          │  │  Routes:                │  │
│  └─────────────────────┘  │          │  │  POST /auth/send-otp   │  │
│                           │          │  │  POST /auth/verify-otp  │  │
│  Auth Provider:           │          │  │  POST /auth/register    │  │
│  Email + Password         │          │  │  POST /auth/login       │  │
│                           │          │  │                         │  │
└───────────────────────────┘          │  │  Services:              │  │
                                       │  │  ├─ mailService.ts      │  │
                                       │  │  │   └─ Brevo API      │  │
                                       │  │  ├─ otpService.ts       │  │
                                       │  │  ├─ authService.ts      │  │
                                       │  │  └─ sarvamAI.ts         │  │
                                       │  │                         │  │
                                       │  │  Storage:               │  │
                                       │  │  ├─ SQLite (dev)        │  │
                                       │  │  └─ MySQL (prod)        │  │
                                       │  └─────────────────────────┘  │
                                       │                               │
                                       └───────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                    CLOUDFLARE WORKER (Edge API)                                  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  Worker: index.js                                                       │   │
│  │                                                                         │   │
│  │  Auth: Verifies Appwrite JWT via Appwrite API                           │   │
│  │                                                                         │   │
│  │  Routes:                                                                │   │
│  │  ┌─────────────┬─────────────────────┬───────────────────────────────┐  │   │
│  │  │ Users       │ Products            │ Orders                       │  │   │
│  │  │ GET /me     │ GET /products      │ GET /orders                  │  │   │
│  │  │ PUT /me     │ POST /products     │ POST /orders                 │  │   │
│  │  └─────────────┴─────────────────────┴───────────────────────────────┘  │   │
│  │                                                                         │   │
│  │  Storage: Cloudflare D1 (SQLite at edge)                                │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Registration Flow (Step by Step)

```
USER                  FRONTEND                BACKEND/ORACLE         BREVO/APPWRITE
 │                       │                        │                      │
 │  Fill Form            │                        │                      │
 │─────────────────────► │                        │                      │
 │                       │                        │                      │
 │                       │  POST /auth/send-otp   │                      │
 │                       │───────────────────────►│                      │
 │                       │                        │  Send OTP Email     │
 │                       │                        │─────────────────────►│
 │                       │                        │                      │
 │  OTP Page             │  { success: true }     │                      │
 │◄──────────────────────│◄───────────────────────│                      │
 │                       │                        │                      │
 │  Enter OTP            │                        │                      │
 │─────────────────────► │                        │                      │
 │                       │  POST /auth/verify-otp │                      │
 │                       │───────────────────────►│                      │
 │                       │                        │  Verify OTP         │
 │                       │◄──── { success } ──────│                      │
 │                       │                        │                      │
 │                       │  account.create()      │                      │
 │                       │──────────────────────────────────────────────►│
 │                       │                        │                      │
 │                       │  createSession()       │                      │
 │                       │──────────────────────────────────────────────►│
 │                       │                        │                      │
 │                       │  createJWT()           │                      │
 │                       │──────────────────────────────────────────────►│
 │                       │                        │                      │
 │                       │  PUT /users/me         │                      │
 │                       │  (Worker/D1)           │                      │
 │                       │───────────────────────►│  Worker              │
 │                       │◄── { user profile } ───│                      │
 │                       │                        │                      │
 │  Dashboard            │                        │                      │
 │◄──────────────────────│                        │                      │
```

## Email Flow (Brevo API)

```
OTP EMAIL                         ONBOARDING EMAIL
     │                                │
     ▼                                ▼
┌─────────────────┐           ┌─────────────────┐
│  MailService    │           │  MailService    │
│  sendOTPEmail() │           │ sendOnboarding  │
│                 │           │ Email()         │
└────────┬────────┘           └────────┬────────┘
         │                             │
         ▼                             ▼
┌─────────────────┐           ┌─────────────────┐
│  BrevoService   │           │  BrevoService   │
│  sendEmailVia   │           │  sendEmailVia   │
│  Brevo()        │           │  Brevo()        │
└────────┬────────┘           └────────┬────────┘
         │                             │
         ▼                             ▼
┌──────────────────────────────────────────────┐
│          Brevo API (sendinblue)               │
│     https://api.brevo.com/v3/smtp/email       │
│                                               │
│  POST with:                                   │
│  {                                            │
│    to: [{ email }],                           │
│    subject: "...",                            │
│    htmlContent: "...",                        │
│    sender: { email: "noreply@..." }           │
│  }                                            │
└──────────────────────────────────────────────┘
         │
         ▼
    USER'S INBOX
```

## Technology Stack

```
┌───────────────────────────────────────────────────────┐
│  FRONTEND                                             │
│  ├─ React 19                                          │
│  ├─ Vite 8                                            │
│  ├─ TypeScript                                        │
│  ├─ Tailwind CSS                                      │
│  ├─ React Router v7                                   │
│  ├─ React Query (TanStack)                            │
│  ├─ Appwrite Web SDK (Auth)                           │
│  └─ Hosting: Cloudflare Pages / Vercel                │
├───────────────────────────────────────────────────────┤
│  BACKEND (Node.js)                                    │
│  ├─ Express.js                                        │
│  ├─ TypeScript                                        │
│  ├─ JWT Auth (jsonwebtoken)                           │
│  ├─ MySQL2 + SQLite (better-sqlite3)                  │
│  ├─ Multer (file uploads)                             │
│  ├─ Helmet + CORS + Morgan                            │
│  └─ Hosting: Oracle Cloud (1GB RAM)                   │
├───────────────────────────────────────────────────────┤
│  EDGE API (Cloudflare Worker)                         │
│  ├─ JavaScript                                        │
│  ├─ D1 Database (SQLite at edge)                      │
│  ├─ Appwrite JWT Validation                           │
│  └─ Hosting: Cloudflare Workers                       │
├───────────────────────────────────────────────────────┤
│  EMAIL                                                │
│  ├─ Brevo API (replaces Nodemailer + SMTP)           │
│  ├─ Domain: ferasetu.fera-search.tech                │
│  └─ SPF/DKIM/DMARC configured                        │
├───────────────────────────────────────────────────────┤
│  DATABASES                                            │
│  ├─ Appwrite (Auth - email, password, sessions)       │
│  ├─ Cloudflare D1 (User profiles, products, orders)   │
│  └─ MySQL/SQLite (Backend fallback data)              │
├───────────────────────────────────────────────────────┤
│  AI (Sarvam)                                          │
│  ├─ Sarvam-30B (general chat, quick tasks)            │
│  └─ Sarvam-105B (website generation, predictions)     │
└───────────────────────────────────────────────────────┘
```

## Hosting & Infrastructure

```
┌──────────────────────────────┐
│  Cloudflare Pages (FREE)     │
│  ├─ Frontend (React SPA)     │
│  └─ Custom domain            │
├──────────────────────────────┤
│  Cloudflare Workers (FREE)   │
│  ├─ Edge API                 │
│  └─ D1 Database (FREE tier)  │
├──────────────────────────────┤
│  Oracle Cloud (FREE TIER)    │
│  ├─ 1GB RAM VM               │
│  ├─ Node.js Backend          │
│  └─ MySQL Database           │
├──────────────────────────────┤
│  Brevo (FREE TIER)           │
│  ├─ 300 emails/day           │
│  └─ Email delivery           │
├──────────────────────────────┤
│  Appwrite Cloud (FREE)       │
│  ├─ Auth                     │
│  └─ JWT verification         │
└──────────────────────────────┘
```

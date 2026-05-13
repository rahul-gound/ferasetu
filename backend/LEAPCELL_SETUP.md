# Leapcell Backend Setup Guide

This guide explains how to deploy the FeraSetu backend to [Leapcell](https://leapcell.io/).

## 1. Prerequisites

- A Leapcell account.
- Your project pushed to a GitHub repository.
- A MySQL database (Leapcell provides a serverless MySQL database which is recommended).

## 2. Database Setup on Leapcell

1. Log in to Leapcell and create a new **MySQL Database**.
2. Note down the following credentials:
   - Host
   - Port (usually 3306)
   - User
   - Password
   - Database Name

## 3. Deployment Configuration

Create a `leapcell.yaml` file in the root of your project (or in the `backend/` directory if deploying separately).

### Example `leapcell.yaml`

```yaml
version: "1"
services:
  backend:
    type: service
    runtime: nodejs20
    # The directory where the backend code is located
    workdir: backend
    # Commands to build and start
    install: npm install
    build: npm run build
    start: npm start
    # Port configuration
    port: 5000
    env:
      PORT: 5000
      HOST: 0.0.0.0
      NODE_ENV: production
```

## 4. Environment Variables

In the Leapcell dashboard, go to your service **Settings -> Environment Variables** and add the following:

| Variable | Description | Recommended Value |
|----------|-------------|-------------------|
| `PORT` | The port the app listens on | `5000` |
| `HOST` | The host interface | `0.0.0.0` (Required for cloud) |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret for auth tokens | Generate a random string |
| `FRONTEND_URL` | Your frontend domain | e.g., `https://fera-search.tech` |
| `MYSQL_HOST` | Database host | From Leapcell DB settings |
| `MYSQL_PORT` | Database port | `3306` |
| `MYSQL_USER` | Database user | From Leapcell DB settings |
| `MYSQL_PASSWORD` | Database password | From Leapcell DB settings |
| `MYSQL_DATABASE` | Database name | From Leapcell DB settings |
| `SARVAM_30B_API_KEY`| Sarvam AI Key | Your API key |
| `SARVAM_105B_API_KEY`| Sarvam AI Key | Your API key |
| `SMTP_HOST` | SMTP Host | `smtp.maileroo.com` |
| `SMTP_PORT` | SMTP Port | `587` |
| `SMTP_USER` | SMTP Username | Your Maileroo email |
| `SMTP_PASS` | SMTP Password | Your Maileroo password |

## 5. Deployment Steps

1. **Connect GitHub**: In Leapcell, create a "New Service" and select your GitHub repository.
2. **Configure Service**: 
   - Service Name: `fera-backend`
   - Runtime: `Node.js 20`
   - Source Directory: `backend`
3. **Build Settings**:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Deploy**: Click "Deploy". Leapcell will build your TypeScript code and start the server.

## 6. Troubleshooting

- **CORS Issues**: Ensure `FRONTEND_URL` is correctly set in Leapcell and matches your actual frontend domain.
- **Database Connection**: If the backend fails to start, check the `MYSQL_HOST` and credentials. Ensure Leapcell's DB allows connections from the service.
- **Health Check**: You can verify the deployment by visiting `https://your-service-url.leapcell.dev/health`.

---
*Last updated: May 2026*

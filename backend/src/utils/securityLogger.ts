import pino from 'pino';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export const securityLogger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    service: 'ferasetu-api',
    environment: process.env.NODE_ENV || 'development',
  },
});

export interface SecurityEvent {
  event: string;
  userId?: string;
  userEmail?: string;
  adminId?: string;
  adminEmail?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event: event.event,
    userId: event.userId,
    userEmail: event.userEmail,
    adminId: event.adminId,
    adminEmail: event.adminEmail,
    ip: event.ip,
    userAgent: event.userAgent,
    resource: event.resource,
    resourceId: event.resourceId,
    action: event.action,
    success: event.success,
    error: event.error,
    metadata: event.metadata,
  };

  if (event.success) {
    securityLogger.info(logData);
  } else {
    securityLogger.warn(logData);
  }
}

// Helper to extract client info from request
export function getRequestInfo(req: Request): { ip: string; userAgent: string } {
  const ip = req.headers['x-forwarded-for'] as string || 
             req.headers['x-real-ip'] as string || 
             req.socket.remoteAddress || 
             'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ip: ip.split(',')[0].trim(), userAgent };
}

// Pre-defined security event types
export const SecurityEvents = {
  // Authentication
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  REGISTRATION_SUCCESS: 'auth.registration.success',
  REGISTRATION_FAILURE: 'auth.registration.failure',
  
  // OTP
  OTP_SENT: 'auth.otp.sent',
  OTP_VERIFIED: 'auth.otp.verified',
  OTP_FAILED: 'auth.otp.failed',
  OTP_RESEND_COOLDOWN: 'auth.otp.resend_cooldown',
  
  // Password
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  PASSWORD_RESET_COMPLETE: 'auth.password.reset.complete',
  
  // Authorization
  ACCESS_DENIED: 'authz.access_denied',
  PERMISSION_ESCALATION: 'authz.permission_escalation',
  
  // Admin
  ADMIN_LOGIN_SUCCESS: 'admin.login.success',
  ADMIN_LOGIN_FAILURE: 'admin.login.failure',
  ADMIN_IMPERSONATE: 'admin.impersonate',
  ADMIN_USER_DELETE: 'admin.user.delete',
  ADMIN_USER_BLOCK: 'admin.user.block',
  ADMIN_USER_UNBLOCK: 'admin.user.unblock',
  ADMIN_PLAN_CHANGE: 'admin.plan.change',
  ADMIN_FEATURE_FLAG: 'admin.feature_flag',
  
  // User management
  USER_PROFILE_UPDATE: 'user.profile.update',
  USER_EMAIL_CHANGE: 'user.email.change',
  USER_PLAN_UPGRADE: 'user.plan.upgrade',
  
  // Data access
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_DELETE: 'data.delete',
  
  // API
  API_RATE_LIMITED: 'api.rate_limited',
  API_INVALID_TOKEN: 'api.invalid_token',
  API_SUSPICIOUS_ACTIVITY: 'api.suspicious_activity',
  
  // Payments
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Email
  EMAIL_SENT: 'email.sent',
  EMAIL_FAILED: 'email.failed',
  EMAIL_BOUNCE: 'email.bounce',
  
  // File upload
  FILE_UPLOAD_SUCCESS: 'file.upload.success',
  FILE_UPLOAD_FAILURE: 'file.upload.failure',
  FILE_UPLOAD_MALICIOUS: 'file.upload.malicious',
  
  // AI
  AI_CREDIT_EXHAUSTED: 'ai.credit.exhausted',
  AI_REQUEST_BLOCKED: 'ai.request.blocked',
  
  // Feature flags
  FEATURE_FLAG_CHANGE: 'feature_flag.change',
  
  // Subdomain
  SUBDOMAIN_CLAIM: 'subdomain.claim',
  SUBDOMAIN_TAKEOVER_ATTEMPT: 'subdomain.takeover_attempt',
} as const;

export type SecurityEventType = typeof SecurityEvents[keyof typeof SecurityEvents];

// Convenience functions
export function logAuthSuccess(req: Request, userId: string, email: string, method: string = 'password'): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.LOGIN_SUCCESS,
    userId,
    userEmail: email,
    ip,
    userAgent,
    action: method,
    success: true,
    metadata: { method },
  });
}

export function logAuthFailure(req: Request, email: string, reason: string): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.LOGIN_FAILURE,
    userEmail: email,
    ip,
    userAgent,
    action: 'login',
    success: false,
    error: reason,
  });
}

export function logAccessDenied(req: Request, userId: string, resource: string, action: string): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.ACCESS_DENIED,
    userId,
    ip,
    userAgent,
    resource,
    action,
    success: false,
    error: 'Insufficient permissions',
  });
}

export function logAdminAction(req: Request, adminId: string, adminEmail: string, event: SecurityEventType, resource: string, resourceId: string, success: boolean, error?: string): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event,
    adminId,
    adminEmail,
    ip,
    userAgent,
    resource,
    resourceId,
    success,
    error,
  });
}

export function logSuspiciousActivity(req: Request, userId: string | undefined, description: string): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.API_SUSPICIOUS_ACTIVITY,
    userId,
    ip,
    userAgent,
    action: description,
    success: false,
    error: description,
  });
}

export function logRateLimitExceeded(req: Request, userId: string | undefined): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.API_RATE_LIMITED,
    userId,
    ip,
    userAgent,
    action: 'rate_limit_exceeded',
    success: false,
    error: 'Rate limit exceeded',
  });
}

export function logSmtpConfigChange(req: Request, adminId: string, adminEmail: string, userId: string, success: boolean, error?: string): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.FEATURE_FLAG_CHANGE, // Reusing for config changes
    adminId,
    adminEmail,
    userId,
    ip,
    userAgent,
    resource: 'smtp_config',
    resourceId: userId,
    action: 'smtp_config_update',
    success,
    error,
  });
}

export function logSubdomainTakeoverAttempt(req: Request, host: string, cnames: string[]): void {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    event: SecurityEvents.SUBDOMAIN_TAKEOVER_ATTEMPT,
    ip,
    userAgent,
    resource: 'subdomain',
    resourceId: host,
    action: 'subdomain_takeover_attempt',
    success: false,
    error: 'CNAME points to unauthorized domain',
    metadata: { cnames },
  });
}
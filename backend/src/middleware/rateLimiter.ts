import rateLimit from 'express-rate-limit';
import { Request } from 'express';

export function createRateLimiter(maxRequests: number, windowMinutes: number, keyGenerator?: (req: Request) => string) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: keyGenerator || ((req: Request) => req.ip || 'unknown'),
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: windowMinutes * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

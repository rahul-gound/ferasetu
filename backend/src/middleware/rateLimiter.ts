import rateLimit from 'express-rate-limit';

export function createRateLimiter(maxRequests: number, windowMinutes: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: windowMinutes * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

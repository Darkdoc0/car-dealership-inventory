import { rateLimit } from 'express-rate-limit';
import { sendError } from './httpErrors';

const DEFAULT_LOGIN_MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

/** Limits failed login attempts per client IP; successful logins are not counted. */
export function loginRateLimit(maxAttempts: number = DEFAULT_LOGIN_MAX_ATTEMPTS) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: maxAttempts,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, 429, 'Too many login attempts, try again later');
    },
  });
}

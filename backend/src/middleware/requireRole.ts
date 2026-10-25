import type { RequestHandler } from 'express';
import { sendError } from '../httpErrors';
import type { Role } from '../users/userRepository';

/** Must run after requireAuth. Responds 403 unless the authenticated user has the given role. */
export const requireRole =
  (role: Role): RequestHandler =>
  (req, res, next) => {
    if (req.user?.role !== role) return sendError(res, 403, 'Forbidden');
    return next();
  };

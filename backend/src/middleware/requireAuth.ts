import type { RequestHandler } from 'express';
import { verifyToken } from '../jwt';
import type { User, UserRepository } from '../users/userRepository';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const BEARER = /^Bearer (\S+)$/i;

/** Requires a valid Bearer JWT for a user that still exists; sets req.user. */
export function createRequireAuth(users: UserRepository): RequestHandler {
  return async (req, res, next) => {
    const unauthorized = () => res.status(401).json({ error: 'Authentication required' });

    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    if (!token) return unauthorized();

    let userId: number;
    try {
      userId = verifyToken(token);
    } catch {
      return unauthorized();
    }

    const user = await users.findById(userId);
    if (!user) return unauthorized();
    req.user = user;
    return next();
  };
}

import type { RequestHandler } from 'express';
import { pool } from '../db';
import { verifyToken } from '../jwt';

export type Role = 'user' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const BEARER = /^Bearer (\S+)$/i;

/** Requires a valid Bearer JWT for a user that still exists; sets req.user. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const unauthorized = () => res.status(401).json({ error: 'Authentication required' });

  const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
  if (!token) return unauthorized();

  let userId: number;
  try {
    userId = verifyToken(token);
  } catch {
    return unauthorized();
  }

  try {
    const { rows } = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    if (!rows[0]) return unauthorized();
    req.user = rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
};

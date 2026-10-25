import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db';

const UNIQUE_VIOLATION = '23505';
// bcrypt only hashes the first 72 bytes, so longer passwords would silently collide.
const BCRYPT_MAX_BYTES = 72;

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).refine((p) => Buffer.byteLength(p, 'utf8') <= BCRYPT_MAX_BYTES),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid email and a password of 8 to 72 bytes are required' });
  }
  const { email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return next(err);
  }
});

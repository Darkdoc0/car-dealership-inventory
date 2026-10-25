import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db';

const UNIQUE_VIOLATION = '23505';

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid email and a password of at least 8 characters are required' });
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

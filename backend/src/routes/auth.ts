import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db';
import { signToken } from '../jwt';
import { requireAuth } from '../middleware/requireAuth';

const UNIQUE_VIOLATION = '23505';
// bcrypt only hashes the first 72 bytes, so longer passwords would silently collide.
const BCRYPT_MAX_BYTES = 72;
const BCRYPT_COST = 10;

const withinBcryptLimit = (p: string) => Buffer.byteLength(p, 'utf8') <= BCRYPT_MAX_BYTES;

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).refine(withinBcryptLimit),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_COST);

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid email and a password of 8 to 72 bytes are required' });
  }
  const { email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
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

authRouter.post('/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { email, password } = parsed.data;
  // bcrypt would silently truncate, letting a longer string match a stored 72-byte password.
  if (!withinBcryptLimit(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  try {
    const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE lower(email) = $1', [email]);
    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(200).json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
  } catch (err) {
    return next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.status(200).json(req.user);
});

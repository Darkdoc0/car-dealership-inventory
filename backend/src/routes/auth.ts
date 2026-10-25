import { Router, type RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { BCRYPT_COST, registerSchema, withinBcryptLimit } from '../credentials';
import { signToken } from '../jwt';
import type { UserRepository } from '../users/userRepository';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_COST);

export function createAuthRouter(users: UserRepository, requireAuth: RequestHandler) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'A valid email and a password of 8 to 72 bytes are required' });
    }
    const { email, password } = parsed.data;

    const result = await users.create(email, await bcrypt.hash(password, BCRYPT_COST));
    if (result.kind === 'duplicate_email') return res.status(409).json({ error: 'Email already registered' });
    return res.status(201).json(result.user);
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const { email, password } = parsed.data;
    // bcrypt would silently truncate, letting a longer string match a stored 72-byte password.
    if (!withinBcryptLimit(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await users.findCredentialsByEmail(email);
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(200).json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.status(200).json(req.user);
  });

  return router;
}

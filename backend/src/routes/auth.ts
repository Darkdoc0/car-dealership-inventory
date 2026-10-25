import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { registerSchema, withinBcryptLimit } from '../credentials';
import { sendError } from '../httpErrors';
import { signToken } from '../jwt';
import type { PasswordHasher } from '../passwordHasher';
import type { UserRepository } from '../users/userRepository';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export function createAuthRouter(users: UserRepository, hasher: PasswordHasher, requireAuth: RequestHandler) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'A valid email and a password of 8 to 72 bytes are required');
    }
    const { email, password } = parsed.data;

    const result = await users.create(email, await hasher.hash(password));
    if (result.kind === 'duplicate_email') return sendError(res, 409, 'Email already registered');
    return res.status(201).json(result.user);
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Email and password are required');
    }
    const { email, password } = parsed.data;
    // bcrypt would silently truncate, letting a longer string match a stored 72-byte password.
    if (!withinBcryptLimit(password)) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const user = await users.findCredentialsByEmail(email);
    const passwordMatches = await hasher.verify(password, user?.passwordHash ?? null);
    if (!user || !passwordMatches) {
      return sendError(res, 401, 'Invalid email or password');
    }
    return res.status(200).json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.status(200).json(req.user);
  });

  return router;
}

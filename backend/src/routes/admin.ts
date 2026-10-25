import { Router, type RequestHandler } from 'express';
import { requireRole } from '../middleware/requireRole';
import type { UserRepository } from '../users/userRepository';

export function createAdminRouter(users: UserRepository, requireAuth: RequestHandler) {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/users', async (_req, res) => {
    return res.status(200).json(await users.list());
  });

  return router;
}

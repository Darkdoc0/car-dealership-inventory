import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, email, role FROM users ORDER BY id');
    return res.status(200).json(rows);
  } catch (err) {
    return next(err);
  }
});

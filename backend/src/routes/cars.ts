import { Router } from 'express';
import { z } from 'zod';
import { isUniqueViolation, pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

export const CAR_STATUSES = ['available', 'reserved', 'sold'] as const;

const CAR_COLUMNS = `id, vin, make, model, year, mileage, price_cents AS "priceCents", status,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const nonBlank = z.string().trim().min(1).max(100);

export const carInputSchema = z.object({
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/),
  make: nonBlank,
  model: nonBlank,
  year: z
    .number()
    .int()
    .min(1886)
    .refine((y) => y <= new Date().getFullYear() + 1),
  mileage: z.number().int().min(0).max(10_000_000),
  priceCents: z.number().int().min(0).max(2_000_000_000),
  status: z.enum(CAR_STATUSES).default('available'),
});

export const carsRouter = Router();

carsRouter.use(requireAuth);

carsRouter.post('/', requireRole('admin'), async (req, res, next) => {
  const parsed = carInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid car: ' + parsed.error.issues.map((i) => i.path.join('.')).join(', ') });
  }
  const c = parsed.data;

  try {
    const { rows } = await pool.query(
      `INSERT INTO cars (vin, make, model, year, mileage, price_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${CAR_COLUMNS}`,
      [c.vin, c.make, c.model, c.year, c.mileage, c.priceCents, c.status],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'A car with this VIN already exists' });
    return next(err);
  }
});

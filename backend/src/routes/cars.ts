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

const MAX_INT4 = 2_147_483_647;

/** Parses a positive int4 id from a path segment; null when malformed or out of range. */
export function parseId(raw: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_INT4 ? id : null;
}

const notFound = { error: 'Car not found' };

carsRouter.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json(notFound);

  try {
    const { rows } = await pool.query(`SELECT ${CAR_COLUMNS} FROM cars WHERE id = $1`, [id]);
    if (!rows[0]) return res.status(404).json(notFound);
    return res.status(200).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

const intParam = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const listQuerySchema = z.object({
  make: nonBlank.optional(),
  model: nonBlank.optional(),
  status: z.enum(CAR_STATUSES).optional(),
  minYear: intParam(0, 3000).optional(),
  maxYear: intParam(0, 3000).optional(),
  minPrice: intParam(0, MAX_INT4).optional(),
  maxPrice: intParam(0, MAX_INT4).optional(),
  limit: intParam(1, MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: intParam(0, MAX_INT4).default(0),
});

carsRouter.get('/', async (req, res, next) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query: ' + parsed.error.issues.map((i) => i.path.join('.')).join(', ') });
  }
  const q = parsed.data;

  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };
  if (q.make) add('lower(make) = lower(?)', q.make);
  if (q.model) add('lower(model) = lower(?)', q.model);
  if (q.status) add('status = ?', q.status);
  if (q.minYear !== undefined) add('year >= ?', q.minYear);
  if (q.maxYear !== undefined) add('year <= ?', q.maxYear);
  if (q.minPrice !== undefined) add('price_cents >= ?', q.minPrice);
  if (q.maxPrice !== undefined) add('price_cents <= ?', q.maxPrice);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [items, count] = await Promise.all([
      pool.query(`SELECT ${CAR_COLUMNS} FROM cars ${where} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [
        ...params,
        q.limit,
        q.offset,
      ]),
      pool.query(`SELECT count(*)::int AS total FROM cars ${where}`, params),
    ]);
    return res.status(200).json({ items: items.rows, total: count.rows[0].total, limit: q.limit, offset: q.offset });
  } catch (err) {
    return next(err);
  }
});

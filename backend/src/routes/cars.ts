import { Router } from 'express';
import type { ZodError } from 'zod';
import type { CarRepository } from '../cars/carRepository';
import {
  carInputSchema,
  carUpdateSchema,
  listQuerySchema,
  parseId,
  purchaseSchema,
  restockSchema,
} from '../cars/schemas';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const NOT_FOUND = { error: 'Car not found' };
const DUPLICATE_VIN = { error: 'A car with this VIN already exists' };

const invalidFields = (prefix: string, error: ZodError) =>
  ({ error: `${prefix}: ${error.issues.map((i) => i.path.join('.') || 'body').join(', ')}` });

/** HTTP layer for /api/cars: parses and validates input, delegates to the repository, maps results to status codes. */
export function createCarsRouter(cars: CarRepository) {
  const router = Router();
  router.use(requireAuth);

  router.post('/', requireRole('admin'), async (req, res) => {
    const parsed = carInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(invalidFields('Invalid car', parsed.error));

    const result = await cars.create(parsed.data);
    if (result.kind === 'duplicate_vin') return res.status(409).json(DUPLICATE_VIN);
    return res.status(201).json(result.car);
  });

  router.get('/', async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json(invalidFields('Invalid query', parsed.error));

    const { items, total } = await cars.list(parsed.data);
    return res.status(200).json({ items, total, limit: parsed.data.limit, offset: parsed.data.offset });
  });

  router.get('/:id', async (req, res) => {
    const id = parseId(String(req.params.id));
    const car = id === null ? null : await cars.findById(id);
    return car ? res.status(200).json(car) : res.status(404).json(NOT_FOUND);
  });

  router.patch('/:id', requireRole('admin'), async (req, res) => {
    const id = parseId(String(req.params.id));
    if (id === null) return res.status(404).json(NOT_FOUND);
    const parsed = carUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(invalidFields('Invalid car update', parsed.error));

    const result = await cars.update(id, parsed.data);
    if (result.kind === 'not_found') return res.status(404).json(NOT_FOUND);
    if (result.kind === 'duplicate_vin') return res.status(409).json(DUPLICATE_VIN);
    return res.status(200).json(result.car);
  });

  router.delete('/:id', requireRole('admin'), async (req, res) => {
    const id = parseId(String(req.params.id));
    const removed = id !== null && (await cars.remove(id));
    return removed ? res.status(204).end() : res.status(404).json(NOT_FOUND);
  });

  router.post('/:id/purchase', async (req, res) => {
    const id = parseId(String(req.params.id));
    if (id === null) return res.status(404).json(NOT_FOUND);
    const parsed = purchaseSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: 'quantity must be a whole number of at least 1' });

    const result = await cars.purchase(id, parsed.data.quantity);
    if (result.kind === 'not_found') return res.status(404).json(NOT_FOUND);
    if (result.kind === 'conflict') return res.status(409).json({ error: 'Not enough stock available' });
    return res.status(200).json(result.car);
  });

  router.post('/:id/restock', requireRole('admin'), async (req, res) => {
    const id = parseId(String(req.params.id));
    if (id === null) return res.status(404).json(NOT_FOUND);
    const parsed = restockSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: 'quantity must be a whole number of at least 1' });

    const result = await cars.restock(id, parsed.data.quantity);
    if (result.kind === 'not_found') return res.status(404).json(NOT_FOUND);
    if (result.kind === 'conflict') return res.status(409).json({ error: 'Stock limit exceeded' });
    return res.status(200).json(result.car);
  });

  return router;
}

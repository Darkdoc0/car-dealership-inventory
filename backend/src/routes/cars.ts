import { Router, type RequestHandler } from 'express';
import type { CarRepository } from '../cars/carRepository';
import {
  carInputSchema,
  carUpdateSchema,
  listQuerySchema,
  parseId,
  purchaseSchema,
  restockSchema,
} from '../cars/schemas';
import { describeIssues, sendError } from '../httpErrors';
import { requireRole } from '../middleware/requireRole';

const NOT_FOUND = 'Car not found';
const DUPLICATE_VIN = 'A car with this VIN already exists';

/**
 * HTTP layer for /api/vehicles (also mounted at /api/cars): parses and validates input, delegates to the repository,
 * maps results to status codes.
 */
export function createCarsRouter(cars: CarRepository, requireAuth: RequestHandler) {
  const router = Router();
  router.use(requireAuth);

  router.post('/', requireRole('admin'), async (req, res) => {
    const parsed = carInputSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, describeIssues('Invalid car', parsed.error));

    const result = await cars.create(parsed.data);
    if (result.kind === 'duplicate_vin') return sendError(res, 409, DUPLICATE_VIN);
    return res.status(201).json(result.car);
  });

  // Listing and searching are the same operation: both filter by make, model, category, status, year and price.
  const list: RequestHandler = async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return sendError(res, 400, describeIssues('Invalid query', parsed.error));

    const { items, total } = await cars.list(parsed.data);
    return res.status(200).json({ items, total, limit: parsed.data.limit, offset: parsed.data.offset });
  };
  router.get('/', list);
  router.get('/search', list); // must come before '/:id', or 'search' would be read as an id

  router.get('/:id', async (req, res) => {
    const id = parseId(String(req.params.id));
    const car = id === null ? null : await cars.findById(id);
    return car ? res.status(200).json(car) : sendError(res, 404, NOT_FOUND);
  });

  // PUT (the brief's verb) and PATCH do the same thing: change any subset of the vehicle's fields.
  const update: RequestHandler = async (req, res) => {
    const id = parseId(String(req.params.id));
    if (id === null) return sendError(res, 404, NOT_FOUND);
    const parsed = carUpdateSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, describeIssues('Invalid car update', parsed.error));

    const result = await cars.update(id, parsed.data);
    if (result.kind === 'not_found') return sendError(res, 404, NOT_FOUND);
    if (result.kind === 'duplicate_vin') return sendError(res, 409, DUPLICATE_VIN);
    return res.status(200).json(result.car);
  };
  router.put('/:id', requireRole('admin'), update);
  router.patch('/:id', requireRole('admin'), update);

  router.delete('/:id', requireRole('admin'), async (req, res) => {
    const id = parseId(String(req.params.id));
    const removed = id !== null && (await cars.remove(id));
    return removed ? res.status(204).end() : sendError(res, 404, NOT_FOUND);
  });

  router.post('/:id/purchase', async (req, res) => {
    const id = parseId(String(req.params.id));
    if (id === null) return sendError(res, 404, NOT_FOUND);
    const parsed = purchaseSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, 400, 'quantity must be a whole number of at least 1');

    const result = await cars.purchase(id, parsed.data.quantity);
    if (result.kind === 'not_found') return sendError(res, 404, NOT_FOUND);
    if (result.kind === 'conflict') return sendError(res, 409, 'Not enough stock available');
    return res.status(200).json(result.car);
  });

  router.post('/:id/restock', requireRole('admin'), async (req, res) => {
    const id = parseId(String(req.params.id));
    if (id === null) return sendError(res, 404, NOT_FOUND);
    const parsed = restockSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, 400, 'quantity must be a whole number of at least 1');

    const result = await cars.restock(id, parsed.data.quantity);
    if (result.kind === 'not_found') return sendError(res, 404, NOT_FOUND);
    if (result.kind === 'conflict') return sendError(res, 409, 'Stock limit exceeded');
    return res.status(200).json(result.car);
  });

  return router;
}

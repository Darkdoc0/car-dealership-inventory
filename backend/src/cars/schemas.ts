import { z } from 'zod';

export const CAR_STATUSES = ['available', 'reserved', 'sold'] as const;
export const CAR_CATEGORIES = ['sedan', 'suv', 'truck', 'hatchback', 'coupe', 'convertible', 'van'] as const;
export const MAX_QUANTITY = 1_000_000;

const MAX_INT4 = 2_147_483_647;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const nonBlank = z.string().trim().min(1).max(100);

const carFields = z.object({
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
  category: z.enum(CAR_CATEGORIES),
  quantity: z.number().int().min(0).max(MAX_QUANTITY),
  status: z.enum(CAR_STATUSES),
});

export const carInputSchema = carFields.extend({
  quantity: carFields.shape.quantity.default(1),
  status: carFields.shape.status.default('available'),
});

// Built from carFields, not carInputSchema: defaults on status/quantity would reset them on every partial update.
export const carUpdateSchema = carFields
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'At least one field is required' });

export const purchaseSchema = z.object({ quantity: carFields.shape.quantity.min(1).default(1) });
export const restockSchema = z.object({ quantity: carFields.shape.quantity.min(1) });

const intParam = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

export const listQuerySchema = z.object({
  make: nonBlank.optional(),
  model: nonBlank.optional(),
  category: z.enum(CAR_CATEGORIES).optional(),
  status: z.enum(CAR_STATUSES).optional(),
  minYear: intParam(0, 3000).optional(),
  maxYear: intParam(0, 3000).optional(),
  minPrice: intParam(0, MAX_INT4).optional(),
  maxPrice: intParam(0, MAX_INT4).optional(),
  limit: intParam(1, MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: intParam(0, MAX_INT4).default(0),
});

export type CarInput = z.infer<typeof carInputSchema>;
export type CarUpdate = z.infer<typeof carUpdateSchema>;
export type CarListQuery = z.infer<typeof listQuerySchema>;

/** Parses a positive int4 id from a path segment; null when malformed or out of range. */
export function parseId(raw: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_INT4 ? id : null;
}

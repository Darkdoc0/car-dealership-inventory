import { z } from 'zod';

const CAR_STATUSES = ['available', 'reserved', 'sold'] as const;
export const CAR_CATEGORIES = ['sedan', 'suv', 'truck', 'hatchback', 'coupe', 'convertible', 'van'] as const;
export const MAX_QUANTITY = 1_000_000;

export type CarStatus = (typeof CAR_STATUSES)[number];
export type CarCategory = (typeof CAR_CATEGORIES)[number];

const MAX_INT4 = 2_147_483_647;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const nonBlank = z.string().trim().min(1).max(100);

const MAX_PRICE_CENTS = 2_000_000_000;
const priceCents = z.number().int().min(0).max(MAX_PRICE_CENTS);
/** A price in dollars with at most two decimals, e.g. 18500.5. */
const priceDollars = z
  .number()
  .min(0)
  .max(MAX_PRICE_CENTS / 100)
  .refine((p) => Math.abs(p * 100 - Math.round(p * 100)) < 1e-6);

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
  category: z.enum(CAR_CATEGORIES),
  quantity: z.number().int().min(0).max(MAX_QUANTITY),
  status: z.enum(CAR_STATUSES),
});

// A client states the price as `price` (dollars) or `priceCents`, or both if they agree. The rest of the code only sees
// priceCents, so money stays in whole cents.
const priceFields = z.object({ price: priceDollars, priceCents });

type WithPrice = { price?: number; priceCents?: number };

/** Folds price/priceCents into priceCents; reports a mismatch against `price`. Returns the input without `price`. */
function settlePrice<T extends WithPrice>({ price, ...rest }: T, ctx: z.core.$RefinementCtx<unknown>) {
  const cents = price === undefined ? undefined : Math.round(price * 100);
  if (cents !== undefined && rest.priceCents !== undefined && cents !== rest.priceCents) {
    ctx.issues.push({ code: 'custom', message: 'price and priceCents disagree', input: price, path: ['price'] });
  }
  const settled = cents ?? rest.priceCents;
  return (settled === undefined ? rest : { ...rest, priceCents: settled }) as Omit<T, 'price'>;
}

export const carInputSchema = carFields
  .extend({
    quantity: carFields.shape.quantity.default(1),
    status: carFields.shape.status.default('available'),
  })
  .extend(priceFields.partial().shape)
  .transform((input, ctx) => {
    const settled = settlePrice(input, ctx);
    if (settled.priceCents === undefined) {
      ctx.issues.push({ code: 'custom', message: 'price is required', input, path: ['price'] });
    }
    return settled as typeof settled & { priceCents: number };
  });

// Built from carFields, not carInputSchema: defaults on status/quantity would reset them on every partial update.
export const carUpdateSchema = carFields
  .extend(priceFields.shape)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'At least one field is required' })
  .transform(settlePrice);

export const purchaseSchema = z.object({ quantity: carFields.shape.quantity.min(1).default(1) });
export const restockSchema = z.object({ quantity: carFields.shape.quantity.min(1) });

const intParam = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

/** A price limit written in dollars (e.g. "20000" or "19999.99"), turned into cents. */
const dollarsParam = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .transform((s) => Math.round(Number(s) * 100))
  .pipe(z.number().int().max(MAX_INT4));

export const listQuerySchema = z.object({
  make: nonBlank.optional(),
  model: nonBlank.optional(),
  category: z.enum(CAR_CATEGORIES).optional(),
  status: z.enum(CAR_STATUSES).optional(),
  minYear: intParam(0, 3000).optional(),
  maxYear: intParam(0, 3000).optional(),
  minPrice: dollarsParam.optional(),
  maxPrice: dollarsParam.optional(),
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

import type { Pool } from 'pg';
import { createCarRepository } from '../src/cars/carRepository';
import { carInputSchema } from '../src/cars/schemas';

const poolRejecting = (err: unknown) => ({ query: jest.fn(() => Promise.reject(err)) }) as unknown as Pool;

const input = carInputSchema.parse({
  vin: 'TST12345678901234',
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  mileage: 1,
  priceCents: 1,
  category: 'sedan',
});

describe('carRepository error mapping', () => {
  const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });
  const unexpected = new Error('connection reset');

  it('maps a unique violation on create to duplicate_vin', async () => {
    await expect(createCarRepository(poolRejecting(uniqueViolation)).create(input)).resolves.toEqual({
      kind: 'duplicate_vin',
    });
  });

  it('maps a unique violation on update to duplicate_vin', async () => {
    await expect(createCarRepository(poolRejecting(uniqueViolation)).update(1, { make: 'Honda' })).resolves.toEqual({
      kind: 'duplicate_vin',
    });
  });

  it('rethrows any other database error from create', async () => {
    await expect(createCarRepository(poolRejecting(unexpected)).create(input)).rejects.toBe(unexpected);
  });

  it('rethrows any other database error from update', async () => {
    await expect(createCarRepository(poolRejecting(unexpected)).update(1, { make: 'Honda' })).rejects.toBe(unexpected);
  });
});

import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { bearer, carPayload, createUserToken } from './helpers';

const app = createApp();
let adminToken: string;
let userToken: string;
let n = 0;

beforeAll(async () => {
  adminToken = await createUserToken(app, 'admin');
  userToken = await createUserToken(app, 'user');
});
afterAll(() => pool.end());

// The database is shared across test files, so every test scopes itself with a unique make.
const uniqueMake = () => `Make${Date.now()}x${n++}`;
const createCar = async (overrides: Record<string, unknown>) =>
  (await request(app).post('/api/vehicles').set(bearer(adminToken)).send(carPayload(overrides))).body;
const list = (query: Record<string, string | number> = {}, token = userToken) =>
  request(app).get('/api/vehicles').query(query).set(bearer(token));

describe('GET /api/vehicles', () => {
  it('rejects a request without a token with 401', async () => {
    const res = await request(app).get('/api/vehicles');

    expect(res.status).toBe(401);
  });

  it('returns matching cars newest first with total, limit and offset', async () => {
    const make = uniqueMake();
    const first = await createCar({ make });
    const second = await createCar({ make });

    const res = await list({ make });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [second, first], total: 2, limit: 20, offset: 0 });
  });

  it('filters by make and model case-insensitively', async () => {
    const make = uniqueMake();
    const corolla = await createCar({ make, model: 'Corolla' });
    await createCar({ make, model: 'Camry' });

    const res = await list({ make: make.toUpperCase(), model: 'corolla' });

    expect(res.body.items).toEqual([corolla]);
    expect(res.body.total).toBe(1);
  });

  it('filters by category', async () => {
    const make = uniqueMake();
    await createCar({ make, category: 'sedan' });
    const suv = await createCar({ make, category: 'suv' });

    const res = await list({ make, category: 'suv' });

    expect(res.body.items).toEqual([suv]);
    expect(res.body.total).toBe(1);
  });

  it('filters by status', async () => {
    const make = uniqueMake();
    await createCar({ make, status: 'available' });
    const sold = await createCar({ make, status: 'sold' });

    const res = await list({ make, status: 'sold' });

    expect(res.body.items).toEqual([sold]);
  });

  it('filters by inclusive year and price ranges', async () => {
    const make = uniqueMake();
    await createCar({ make, year: 2010, priceCents: 500000 });
    const middle = await createCar({ make, year: 2015, priceCents: 1000000 });
    await createCar({ make, year: 2020, priceCents: 2000000 });

    const res = await list({ make, minYear: 2011, maxYear: 2019, minPrice: 1000000, maxPrice: 1000000 });

    expect(res.body.items).toEqual([middle]);
    expect(res.body.total).toBe(1);
  });

  it('paginates with limit and offset while total counts all matches', async () => {
    const make = uniqueMake();
    const cars = [];
    for (let i = 0; i < 5; i++) cars.push(await createCar({ make }));
    const newestFirst = [...cars].reverse();

    const res = await list({ make, limit: 2, offset: 2 });

    expect(res.body).toEqual({ items: newestFirst.slice(2, 4), total: 5, limit: 2, offset: 2 });
  });

  it('returns an empty page, not an error, when offset is past the end', async () => {
    const make = uniqueMake();
    await createCar({ make });

    const res = await list({ make, offset: 50 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 1, limit: 20, offset: 50 });
  });

  it.each([
    ['limit=0', { limit: 0 }],
    ['limit above 100', { limit: 101 }],
    ['a non-numeric limit', { limit: 'ten' }],
    ['a negative offset', { offset: -1 }],
    ['an unknown status', { status: 'stolen' }],
    ['an unknown category', { category: 'spaceship' }],
    ['a non-numeric minYear', { minYear: 'abc' }],
    ['a fractional maxPrice', { maxPrice: 10.5 }],
  ])('rejects %s with 400', async (_label, query) => {
    const res = await list(query);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

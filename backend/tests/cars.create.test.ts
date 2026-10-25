import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { bearer, carPayload, createUserToken } from './helpers';

const app = createApp();
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  adminToken = await createUserToken(app, 'admin');
  userToken = await createUserToken(app, 'user');
});
afterAll(() => pool.end());

const create = (body: object, token = adminToken) => request(app).post('/api/vehicles').set(bearer(token)).send(body);

describe('POST /api/vehicles', () => {
  it('rejects a request without a token with 401', async () => {
    const res = await request(app).post('/api/vehicles').send(carPayload());

    expect(res.status).toBe(401);
  });

  it('rejects a non-admin with 403 and creates nothing', async () => {
    const payload = carPayload();

    const res = await create(payload, userToken);

    expect(res.status).toBe(403);
    const { rows } = await pool.query('SELECT 1 FROM cars WHERE vin = $1', [payload.vin]);
    expect(rows).toHaveLength(0);
  });

  it('creates a car as admin and returns it with defaults', async () => {
    const payload = carPayload();

    const res = await create(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      ...payload,
      status: 'available',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('defaults quantity to 1 when omitted', async () => {
    const res = await create(carPayload({ quantity: undefined }));

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(1);
  });

  it('accepts a quantity of zero for a listing that is out of stock', async () => {
    const res = await create(carPayload({ quantity: 0 }));

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(0);
  });

  it('accepts an explicit status', async () => {
    const res = await create(carPayload({ status: 'reserved' }));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('reserved');
  });

  it('trims and upper-cases the VIN', async () => {
    const payload = carPayload();

    const res = await create({ ...payload, vin: `  ${payload.vin.toLowerCase()} ` });

    expect(res.status).toBe(201);
    expect(res.body.vin).toBe(payload.vin);
  });

  it('rejects a duplicate VIN with 409, ignoring case', async () => {
    const payload = carPayload();
    await create(payload);

    const res = await create({ ...payload, vin: payload.vin.toLowerCase() });

    expect(res.status).toBe(409);
  });

  it.each([
    ['a VIN with 16 characters', { vin: 'TST1234567890123' }],
    ['a VIN containing the letter I', { vin: 'TSTI234567890123X' }],
    ['a missing make', { make: undefined }],
    ['a blank model', { model: '   ' }],
    ['a year before 1886', { year: 1885 }],
    ['a year too far in the future', { year: new Date().getFullYear() + 2 }],
    ['a non-integer year', { year: 2020.5 }],
    ['negative mileage', { mileage: -1 }],
    ['a fractional price', { priceCents: 100.5 }],
    ['a negative price', { priceCents: -5 }],
    ['a price sent as a string', { priceCents: '1000' }],
    ['an unknown status', { status: 'stolen' }],
    ['a missing category', { category: undefined }],
    ['an unknown category', { category: 'spaceship' }],
    ['a negative quantity', { quantity: -1 }],
    ['a fractional quantity', { quantity: 1.5 }],
    ['a quantity above the limit', { quantity: 1_000_001 }],
  ])('rejects %s with 400', async (_label, override) => {
    const res = await create(carPayload(override));

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

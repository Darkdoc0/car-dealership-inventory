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

const createCar = async (overrides = {}) =>
  (await request(app).post('/api/vehicles').set(bearer(adminToken)).send(carPayload(overrides))).body;
const patch = (id: number | string, body: object, token = adminToken) =>
  request(app).patch(`/api/vehicles/${id}`).set(bearer(token)).send(body);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('PATCH /api/vehicles/:id', () => {
  it('rejects a request without a token with 401', async () => {
    const car = await createCar();

    const res = await request(app).patch(`/api/vehicles/${car.id}`).send({ priceCents: 1 });

    expect(res.status).toBe(401);
  });

  it('rejects a non-admin with 403 and leaves the car unchanged', async () => {
    const car = await createCar();

    const res = await patch(car.id, { priceCents: 1 }, userToken);

    expect(res.status).toBe(403);
    const after = await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken));
    expect(after.body.priceCents).toBe(car.priceCents);
  });

  it('updates only the supplied fields and bumps updatedAt', async () => {
    const car = await createCar();
    await sleep(10);

    const res = await patch(car.id, { priceCents: 1700000, mileage: 43000 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...car,
      priceCents: 1700000,
      mileage: 43000,
      updatedAt: expect.any(String),
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(car.updatedAt).getTime());
    expect(res.body.createdAt).toBe(car.createdAt);
  });

  it('updates category and quantity', async () => {
    const car = await createCar();

    const res = await patch(car.id, { category: 'suv', quantity: 9 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ category: 'suv', quantity: 9 });
  });

  it('does not reset status when it is not supplied', async () => {
    const car = await createCar({ status: 'sold' });

    const res = await patch(car.id, { priceCents: 1 });

    expect(res.body.status).toBe('sold');
  });

  it('changes the status', async () => {
    const car = await createCar();

    const res = await patch(car.id, { status: 'reserved' });

    expect(res.body.status).toBe('reserved');
  });

  it('normalizes a new VIN', async () => {
    const car = await createCar();
    const newVin = carPayload().vin;

    const res = await patch(car.id, { vin: ` ${newVin.toLowerCase()} ` });

    expect(res.body.vin).toBe(newVin);
  });

  it('allows re-sending the car’s own VIN', async () => {
    const car = await createCar();

    const res = await patch(car.id, { vin: car.vin, mileage: 1 });

    expect(res.status).toBe(200);
  });

  it('rejects a VIN that belongs to another car with 409', async () => {
    const a = await createCar();
    const b = await createCar();

    const res = await patch(b.id, { vin: a.vin });

    expect(res.status).toBe(409);
  });

  it('ignores attempts to change id and createdAt', async () => {
    const car = await createCar();

    const res = await patch(car.id, { id: 999999, createdAt: '2000-01-01T00:00:00Z', mileage: 5 });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(car.id);
    expect(res.body.createdAt).toBe(car.createdAt);
  });

  it('returns 404 for a car that does not exist', async () => {
    const res = await patch(2000000000, { mileage: 5 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Car not found' });
  });

  it('returns 404 for a malformed id', async () => {
    expect((await patch('abc', { mileage: 5 })).status).toBe(404);
  });

  it.each([
    ['an empty body', {}],
    ['only unknown fields', { color: 'red' }],
    ['a year before 1886', { year: 1800 }],
    ['negative mileage', { mileage: -1 }],
    ['a fractional price', { priceCents: 1.5 }],
    ['an unknown status', { status: 'stolen' }],
    ['an unknown category', { category: 'spaceship' }],
    ['a negative quantity', { quantity: -1 }],
    ['a malformed VIN', { vin: 'SHORT' }],
    ['a blank make', { make: ' ' }],
  ])('rejects %s with 400', async (_label, body) => {
    const car = await createCar();

    const res = await patch(car.id, body);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

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
const purchase = (id: number | string, body?: object, token = userToken) => {
  const req = request(app).post(`/api/vehicles/${id}/purchase`).set(bearer(token));
  return body ? req.send(body) : req;
};
const getCar = async (id: number) => (await request(app).get(`/api/vehicles/${id}`).set(bearer(userToken))).body;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('POST /api/vehicles/:id/purchase', () => {
  it('rejects a request without a token with 401', async () => {
    const car = await createCar();

    const res = await request(app).post(`/api/vehicles/${car.id}/purchase`);

    expect(res.status).toBe(401);
  });

  it('lets a regular user buy one unit when no quantity is given', async () => {
    const car = await createCar({ quantity: 3 });
    await sleep(10);

    const res = await purchase(car.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...car, quantity: 2, updatedAt: expect.any(String) });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(car.updatedAt).getTime());
  });

  it('lets an admin buy too', async () => {
    const car = await createCar({ quantity: 2 });

    expect((await purchase(car.id, undefined, adminToken)).status).toBe(200);
  });

  it('decrements by the requested quantity', async () => {
    const car = await createCar({ quantity: 5 });

    const res = await purchase(car.id, { quantity: 3 });

    expect(res.body.quantity).toBe(2);
    expect(res.body.status).toBe('available');
  });

  it('marks the car sold when the last unit is bought', async () => {
    const car = await createCar({ quantity: 2 });

    const res = await purchase(car.id, { quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ quantity: 0, status: 'sold' });
  });

  it('answers 409 and changes nothing when the car is out of stock', async () => {
    const car = await createCar({ quantity: 0 });

    const res = await purchase(car.id);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Not enough stock available' });
    expect(await getCar(car.id)).toEqual(car);
  });

  it('answers 409 and changes nothing when asking for more than is in stock', async () => {
    const car = await createCar({ quantity: 2 });

    const res = await purchase(car.id, { quantity: 3 });

    expect(res.status).toBe(409);
    expect(await getCar(car.id)).toEqual(car);
  });

  it('answers 409 for a reserved car', async () => {
    const car = await createCar({ quantity: 2, status: 'reserved' });

    const res = await purchase(car.id);

    expect(res.status).toBe(409);
    expect(await getCar(car.id)).toEqual(car);
  });

  it('never oversells under concurrent purchases', async () => {
    const car = await createCar({ quantity: 3 });

    const results = await Promise.all(Array.from({ length: 10 }, () => purchase(car.id)));

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(await getCar(car.id)).toMatchObject({ quantity: 0, status: 'sold' });
  });

  it.each([
    ['zero', { quantity: 0 }],
    ['negative', { quantity: -1 }],
    ['fractional', { quantity: 1.5 }],
    ['a string', { quantity: '2' }],
    ['above the limit', { quantity: 1_000_001 }],
  ])('rejects a quantity that is %s with 400 and changes nothing', async (_label, body) => {
    const car = await createCar({ quantity: 3 });

    const res = await purchase(car.id, body);

    expect(res.status).toBe(400);
    expect(await getCar(car.id)).toEqual(car);
  });

  it('returns 404 for an unknown car', async () => {
    const res = await purchase(2000000000);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Car not found' });
  });

  it('returns 404 for a malformed id', async () => {
    expect((await purchase('abc')).status).toBe(404);
  });
});

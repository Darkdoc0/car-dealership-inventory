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
  (await request(app).post('/api/cars').set(bearer(adminToken)).send(carPayload(overrides))).body;
const restock = (id: number | string, body?: object, token = adminToken) => {
  const req = request(app).post(`/api/cars/${id}/restock`).set(bearer(token));
  return body ? req.send(body) : req;
};
const getCar = async (id: number) => (await request(app).get(`/api/cars/${id}`).set(bearer(userToken))).body;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('POST /api/cars/:id/restock', () => {
  it('rejects a request without a token with 401', async () => {
    const car = await createCar();

    const res = await request(app).post(`/api/cars/${car.id}/restock`).send({ quantity: 1 });

    expect(res.status).toBe(401);
  });

  it('rejects a non-admin with 403 and changes nothing', async () => {
    const car = await createCar();

    const res = await restock(car.id, { quantity: 5 }, userToken);

    expect(res.status).toBe(403);
    expect(await getCar(car.id)).toEqual(car);
  });

  it('adds the quantity to the existing stock and bumps updatedAt', async () => {
    const car = await createCar({ quantity: 3 });
    await sleep(10);

    const res = await restock(car.id, { quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...car, quantity: 7, updatedAt: expect.any(String) });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(car.updatedAt).getTime());
  });

  it('makes a sold-out car available again', async () => {
    const car = await createCar({ quantity: 1 });
    await request(app).post(`/api/cars/${car.id}/purchase`).set(bearer(userToken));
    expect(await getCar(car.id)).toMatchObject({ quantity: 0, status: 'sold' });

    const res = await restock(car.id, { quantity: 2 });

    expect(res.body).toMatchObject({ quantity: 2, status: 'available' });
    const bought = await request(app).post(`/api/cars/${car.id}/purchase`).set(bearer(userToken));
    expect(bought.status).toBe(200);
  });

  it('keeps a reserved car reserved', async () => {
    const car = await createCar({ quantity: 1, status: 'reserved' });

    const res = await restock(car.id, { quantity: 2 });

    expect(res.body).toMatchObject({ quantity: 3, status: 'reserved' });
  });

  it('adds up correctly under concurrent restocks', async () => {
    const car = await createCar({ quantity: 0 });

    const results = await Promise.all(Array.from({ length: 10 }, () => restock(car.id, { quantity: 2 })));

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect((await getCar(car.id)).quantity).toBe(20);
  });

  it('answers 409 and changes nothing when the stock limit would be exceeded', async () => {
    const car = await createCar({ quantity: 999_999 });

    const res = await restock(car.id, { quantity: 2 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Stock limit exceeded' });
    expect(await getCar(car.id)).toEqual(car);
  });

  it.each([
    ['missing', undefined],
    ['an empty body', {}],
    ['zero', { quantity: 0 }],
    ['negative', { quantity: -3 }],
    ['fractional', { quantity: 1.5 }],
    ['a string', { quantity: '2' }],
    ['above the limit', { quantity: 1_000_001 }],
  ])('rejects a quantity that is %s with 400 and changes nothing', async (_label, body) => {
    const car = await createCar({ quantity: 3 });

    const res = await restock(car.id, body);

    expect(res.status).toBe(400);
    expect(await getCar(car.id)).toEqual(car);
  });

  it('returns 404 for an unknown car', async () => {
    const res = await restock(2000000000, { quantity: 1 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Car not found' });
  });

  it('returns 404 for a malformed id', async () => {
    expect((await restock('abc', { quantity: 1 })).status).toBe(404);
  });
});

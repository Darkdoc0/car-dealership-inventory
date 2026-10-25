import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { bearer, carPayload, createUserToken } from './helpers';

// The brief only requires make, model, category, price and quantity. VIN, year and mileage are optional.
const app = createApp();
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  adminToken = await createUserToken(app, 'admin');
  userToken = await createUserToken(app, 'user');
});
afterAll(() => pool.end());

const post = (body: object) => request(app).post('/api/vehicles').set(bearer(adminToken)).send(body);
const put = (id: number, body: object) => request(app).put(`/api/vehicles/${id}`).set(bearer(adminToken)).send(body);
const minimal = (overrides: Record<string, unknown> = {}) => ({
  make: 'Mazda',
  model: '3',
  category: 'hatchback',
  price: 15000,
  ...overrides,
});

describe('creating a vehicle without vin, year or mileage', () => {
  it('needs only make, model, category and price, and reports the missing fields as null', async () => {
    const res = await post(minimal());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ make: 'Mazda', vin: null, year: null, mileage: null, quantity: 1, status: 'available' });
  });

  it('allows many vehicles without a VIN', async () => {
    expect((await post(minimal())).status).toBe(201);
    expect((await post(minimal())).status).toBe(201);
  });

  it('accepts each optional field on its own', async () => {
    const { vin } = carPayload();

    const res = await post(minimal({ vin, year: 2019, mileage: 0 }));

    expect(res.body).toMatchObject({ vin, year: 2019, mileage: 0 });
  });

  it('still checks an optional field that is supplied', async () => {
    expect((await post(minimal({ vin: 'SHORT' }))).status).toBe(400);
    expect((await post(minimal({ year: 1800 }))).status).toBe(400);
    expect((await post(minimal({ mileage: -1 }))).status).toBe(400);
  });

  it('still enforces a unique VIN when one is given', async () => {
    const { vin } = carPayload();
    await post(minimal({ vin }));

    expect((await post(minimal({ vin }))).status).toBe(409);
  });

  it.each([['make'], ['model'], ['category']])('still requires %s', async (field) => {
    expect((await post(minimal({ [field]: undefined }))).status).toBe(400);
  });

  it('can be read, listed and bought like any other vehicle', async () => {
    const car = (await post(minimal({ make: `Opt${Date.now()}` }))).body;

    const one = await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken));
    const list = await request(app).get('/api/vehicles').query({ make: car.make }).set(bearer(userToken));
    const bought = await request(app).post(`/api/vehicles/${car.id}/purchase`).set(bearer(userToken));

    expect(one.body).toEqual(car);
    expect(list.body.items).toEqual([car]);
    expect(bought.body.quantity).toBe(0);
  });

  it('is left out of a year filter instead of breaking it', async () => {
    const make = `Opt${Date.now()}y`;
    await post(minimal({ make }));
    const dated = (await post(minimal({ make, year: 2015 }))).body;

    const res = await request(app).get('/api/vehicles/search').query({ make, minYear: '2010' }).set(bearer(userToken));

    expect(res.body.items).toEqual([dated]);
  });
});

describe('updating optional fields', () => {
  it('can fill them in later', async () => {
    const car = (await post(minimal())).body;
    const { vin } = carPayload();

    const res = await put(car.id, { vin, year: 2020, mileage: 12 });

    expect(res.body).toMatchObject({ vin, year: 2020, mileage: 12 });
  });

  it('can clear them again with null', async () => {
    const full = (await post(carPayload())).body;

    const res = await put(full.id, { vin: null, year: null, mileage: null });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ vin: null, year: null, mileage: null, make: full.make });
  });

  it('refuses null for the required fields', async () => {
    const car = (await post(minimal())).body;

    for (const field of ['make', 'model', 'category', 'quantity', 'status']) {
      expect((await put(car.id, { [field]: null })).status).toBe(400);
    }
  });
});

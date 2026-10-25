import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { bearer, carPayload, createUserToken } from './helpers';

// The endpoint names in the kata brief: /api/vehicles, PUT /api/vehicles/:id and GET /api/vehicles/search.
const app = createApp();
let adminToken: string;
let userToken: string;
let n = 0;

beforeAll(async () => {
  adminToken = await createUserToken(app, 'admin');
  userToken = await createUserToken(app, 'user');
});
afterAll(() => pool.end());

const uniqueMake = () => `Brief${Date.now()}x${n++}`;
const create = async (overrides: Record<string, unknown> = {}) =>
  (await request(app).post('/api/vehicles').set(bearer(adminToken)).send(carPayload(overrides))).body;

describe('/api/vehicles', () => {
  it('rejects every request without a token with 401', async () => {
    expect((await request(app).get('/api/vehicles')).status).toBe(401);
    expect((await request(app).post('/api/vehicles').send(carPayload())).status).toBe(401);
    expect((await request(app).get('/api/vehicles/search')).status).toBe(401);
  });

  it('lets an admin add a vehicle (POST /api/vehicles) and any user list and view it', async () => {
    const make = uniqueMake();

    const res = await request(app).post('/api/vehicles').set(bearer(adminToken)).send(carPayload({ make }));
    expect(res.status).toBe(201);

    const list = await request(app).get('/api/vehicles').query({ make }).set(bearer(userToken));
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([res.body]);
    const one = await request(app).get(`/api/vehicles/${res.body.id}`).set(bearer(userToken));
    expect(one.body).toEqual(res.body);
  });

  it('keeps delete and restock admin-only and purchase open to any user', async () => {
    const car = await create({ quantity: 2 });

    expect((await request(app).post(`/api/vehicles/${car.id}/purchase`).set(bearer(userToken))).status).toBe(200);
    expect((await request(app).post(`/api/vehicles/${car.id}/restock`).set(bearer(userToken)).send({ quantity: 5 })).status).toBe(403);
    expect((await request(app).post(`/api/vehicles/${car.id}/restock`).set(bearer(adminToken)).send({ quantity: 5 })).body.quantity).toBe(6);
    expect((await request(app).delete(`/api/vehicles/${car.id}`).set(bearer(userToken))).status).toBe(403);
    expect((await request(app).delete(`/api/vehicles/${car.id}`).set(bearer(adminToken))).status).toBe(204);
  });
});

describe('PUT /api/vehicles/:id', () => {
  it('updates the vehicle for an admin and returns it', async () => {
    const car = await create();

    const res = await request(app).put(`/api/vehicles/${car.id}`).set(bearer(adminToken)).send({ make: 'Updated', mileage: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: car.id, make: 'Updated', mileage: 5, model: car.model });
  });

  it('refuses a regular user with 403 and changes nothing', async () => {
    const car = await create();

    const res = await request(app).put(`/api/vehicles/${car.id}`).set(bearer(userToken)).send({ make: 'Hacked' });

    expect(res.status).toBe(403);
    expect((await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken))).body.make).toBe(car.make);
  });

  it('answers 404 for an unknown vehicle, 400 for an empty body and 409 for a taken VIN', async () => {
    const a = await create();
    const b = await create();

    expect((await request(app).put('/api/vehicles/2000000000').set(bearer(adminToken)).send({ make: 'X' })).status).toBe(404);
    expect((await request(app).put(`/api/vehicles/${a.id}`).set(bearer(adminToken)).send({})).status).toBe(400);
    expect((await request(app).put(`/api/vehicles/${a.id}`).set(bearer(adminToken)).send({ vin: b.vin })).status).toBe(409);
  });

  it('behaves the same as PATCH, which keeps working', async () => {
    const car = await create();

    const res = await request(app).patch(`/api/vehicles/${car.id}`).set(bearer(adminToken)).send({ make: 'ViaPatch' });

    expect(res.body.make).toBe('ViaPatch');
  });
});

describe('GET /api/vehicles/search', () => {
  it('finds vehicles by make, ignoring case', async () => {
    const make = uniqueMake();
    const hit = await create({ make });
    await create({ make: uniqueMake() });

    const res = await request(app).get('/api/vehicles/search').query({ make: make.toUpperCase() }).set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [hit], total: 1, limit: 20, offset: 0 });
  });

  it('finds vehicles by model and by category', async () => {
    const make = uniqueMake();
    const corolla = await create({ make, model: 'Corolla', category: 'sedan' });
    await create({ make, model: 'Camry', category: 'suv' });

    const byModel = await request(app).get('/api/vehicles/search').query({ make, model: 'corolla' }).set(bearer(userToken));
    const byCategory = await request(app).get('/api/vehicles/search').query({ make, category: 'suv' }).set(bearer(userToken));

    expect(byModel.body.items).toEqual([corolla]);
    expect(byCategory.body.items).toHaveLength(1);
    expect(byCategory.body.items[0].model).toBe('Camry');
  });

  it('is not mistaken for a vehicle id', async () => {
    const res = await request(app).get('/api/vehicles/search').set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  it('rejects a bad filter with 400', async () => {
    expect((await request(app).get('/api/vehicles/search').query({ category: 'spaceship' }).set(bearer(userToken))).status).toBe(400);
  });
});

describe('/api/cars (kept as an alias)', () => {
  it('serves the same data as /api/vehicles', async () => {
    const make = uniqueMake();
    const car = await create({ make });

    const res = await request(app).get('/api/cars').query({ make }).set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([car]);
  });

  it('accepts writes and enforces the same rules', async () => {
    expect((await request(app).get('/api/cars')).status).toBe(401);
    expect((await request(app).post('/api/cars').set(bearer(userToken)).send(carPayload())).status).toBe(403);
    expect((await request(app).post('/api/cars').set(bearer(adminToken)).send(carPayload())).status).toBe(201);
  });

  it('also offers PUT and search', async () => {
    const make = uniqueMake();
    const car = await create({ make });

    expect((await request(app).put(`/api/cars/${car.id}`).set(bearer(adminToken)).send({ mileage: 7 })).status).toBe(200);
    expect((await request(app).get('/api/cars/search').query({ make }).set(bearer(userToken))).body.total).toBe(1);
  });
});

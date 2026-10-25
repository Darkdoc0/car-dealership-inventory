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

const createCar = async () =>
  (await request(app).post('/api/vehicles').set(bearer(adminToken)).send(carPayload())).body;
const remove = (id: number | string, token = adminToken) => request(app).delete(`/api/vehicles/${id}`).set(bearer(token));

describe('DELETE /api/vehicles/:id', () => {
  it('rejects a request without a token with 401', async () => {
    const car = await createCar();

    const res = await request(app).delete(`/api/vehicles/${car.id}`);

    expect(res.status).toBe(401);
  });

  it('rejects a non-admin with 403 and keeps the car', async () => {
    const car = await createCar();

    const res = await remove(car.id, userToken);

    expect(res.status).toBe(403);
    expect((await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken))).status).toBe(200);
  });

  it('deletes the car as admin with 204 and an empty body', async () => {
    const car = await createCar();

    const res = await remove(car.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken))).status).toBe(404);
  });

  it('returns 404 when deleting the same car twice', async () => {
    const car = await createCar();
    await remove(car.id);

    const res = await remove(car.id);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Car not found' });
  });

  it('frees the VIN so it can be registered again', async () => {
    const car = await createCar();
    await remove(car.id);

    const res = await request(app).post('/api/vehicles').set(bearer(adminToken)).send({ ...carPayload(), vin: car.vin });

    expect(res.status).toBe(201);
  });

  it('returns 404 for an unknown id', async () => {
    expect((await remove(2000000000)).status).toBe(404);
  });

  it('returns 404 for a malformed id', async () => {
    expect((await remove('abc')).status).toBe(404);
  });
});

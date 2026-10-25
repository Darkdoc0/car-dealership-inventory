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

describe('GET /api/vehicles/:id', () => {
  it('rejects a request without a token with 401', async () => {
    const car = await createCar();

    const res = await request(app).get(`/api/vehicles/${car.id}`);

    expect(res.status).toBe(401);
  });

  it('lets any authenticated user read a car', async () => {
    const car = await createCar();

    const res = await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(car);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app).get('/api/vehicles/2000000000').set(bearer(userToken));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Car not found' });
  });

  it.each([['abc'], ['1.5'], ['-1'], ['0'], ['99999999999999999999']])('returns 404 for the malformed id %s', async (id) => {
    const res = await request(app).get(`/api/vehicles/${id}`).set(bearer(userToken));

    expect(res.status).toBe(404);
  });
});

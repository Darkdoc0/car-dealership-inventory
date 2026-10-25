import request from 'supertest';
import { createApp } from '../src/app';
import type { Car, CarRepository } from '../src/cars/carRepository';
import type { CarListQuery } from '../src/cars/schemas';
import { pool } from '../src/db';
import { signToken } from '../src/jwt';
import type { User, UserRepository } from '../src/users/userRepository';
import { bearer } from './helpers';

const admin: User = { id: 7, email: 'admin@example.com', role: 'admin' };
const member: User = { id: 8, email: 'member@example.com', role: 'user' };

function fakeUsers(): UserRepository {
  const all = [admin, member];
  return {
    create: jest.fn(),
    findById: async (id) => all.find((u) => u.id === id) ?? null,
    findCredentialsByEmail: jest.fn(),
    list: async () => all,
  };
}

type FakeCars = { [K in keyof CarRepository]: jest.MockedFunction<CarRepository[K]> };

function fakeCars(): FakeCars {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(async (_query: CarListQuery) => ({ items: [] as Car[], total: 0 })),
    update: jest.fn(),
    remove: jest.fn(),
    purchase: jest.fn(),
    restock: jest.fn(),
  };
}

describe('createApp with injected dependencies (no database)', () => {
  let querySpy: jest.SpyInstance;
  beforeEach(() => {
    querySpy = jest.spyOn(pool, 'query');
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => pool.end());

  it('serves the admin user list from the injected user repository', async () => {
    const app = createApp({ dependencies: { users: fakeUsers(), cars: fakeCars() } });

    const res = await request(app).get('/api/admin/users').set(bearer(signToken(admin.id)));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([admin, member]);
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('applies the role check using the injected repository', async () => {
    const app = createApp({ dependencies: { users: fakeUsers(), cars: fakeCars() } });

    const res = await request(app).get('/api/admin/users').set(bearer(signToken(member.id)));

    expect(res.status).toBe(403);
  });

  it('rejects a token for a user the injected repository does not know', async () => {
    const app = createApp({ dependencies: { users: fakeUsers(), cars: fakeCars() } });

    const res = await request(app).get('/api/auth/me').set(bearer(signToken(999)));

    expect(res.status).toBe(401);
  });

  it('passes the parsed list query to the injected car repository', async () => {
    const cars = fakeCars();
    const app = createApp({ dependencies: { users: fakeUsers(), cars } });

    const res = await request(app).get('/api/vehicles?make=Toyota&limit=5').set(bearer(signToken(member.id)));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, limit: 5, offset: 0 });
    expect(cars.list).toHaveBeenCalledWith(expect.objectContaining({ make: 'Toyota', limit: 5, offset: 0 }));
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('turns an injected repository failure into the generic JSON 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const cars = fakeCars();
    cars.list.mockRejectedValue(new Error('boom'));
    const app = createApp({ dependencies: { users: fakeUsers(), cars } });

    const res = await request(app).get('/api/vehicles').set(bearer(signToken(member.id)));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

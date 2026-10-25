import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { bearer, carPayload, createUserToken } from './helpers';

// The brief says each vehicle has a "price". It is in dollars (up to two decimals); priceCents is the exact whole-cent
// form and is still accepted and returned.
const app = createApp();
let adminToken: string;
let userToken: string;
let n = 0;

beforeAll(async () => {
  adminToken = await createUserToken(app, 'admin');
  userToken = await createUserToken(app, 'user');
});
afterAll(() => pool.end());

const uniqueMake = () => `Price${Date.now()}x${n++}`;
/** A creation payload that states the price only as `price` (dollars). */
const withPrice = (price: unknown, overrides: Record<string, unknown> = {}) => ({
  ...carPayload(overrides),
  priceCents: undefined,
  price,
});
const post = (body: object) => request(app).post('/api/vehicles').set(bearer(adminToken)).send(body);

describe('creating with a price in dollars', () => {
  it('accepts price and returns both price and priceCents', async () => {
    const res = await post(withPrice(25000.5));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ price: 25000.5, priceCents: 2500050 });
  });

  it.each([
    [19.99, 1999],
    [0.07, 7],
    [1.1, 110],
    [0, 0],
    [20000000, 2000000000],
    [18500, 1850000],
  ])('turns the price %p into exactly %i cents', async (price, cents) => {
    const res = await post(withPrice(price));

    expect(res.status).toBe(201);
    expect(res.body.priceCents).toBe(cents);
    expect(res.body.price).toBe(price);
  });

  it('still accepts priceCents on its own and reports the matching price', async () => {
    const res = await post(carPayload({ priceCents: 1850050 }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ price: 18500.5, priceCents: 1850050 });
  });

  it('accepts price and priceCents together when they agree', async () => {
    const res = await post({ ...carPayload(), price: 18500, priceCents: 1850000 });

    expect(res.status).toBe(201);
  });

  it('rejects price and priceCents that disagree', async () => {
    const res = await post({ ...carPayload(), price: 18500, priceCents: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('price');
  });

  it('rejects a vehicle with no price at all', async () => {
    const res = await post({ ...carPayload(), priceCents: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('price');
  });

  it.each([
    ['negative', -1],
    ['more than two decimals', 10.005],
    ['a string', '100'],
    ['null', null],
    ['above the limit', 20000000.01],
  ])('rejects a price that is %s', async (_label, price) => {
    expect((await post(withPrice(price))).status).toBe(400);
  });

  it('includes price in every response that returns a vehicle', async () => {
    const car = (await post(withPrice(12345.67))).body;
    const get = await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken));
    const purchase = await request(app).post(`/api/vehicles/${car.id}/purchase`).set(bearer(userToken));
    const restock = await request(app).post(`/api/vehicles/${car.id}/restock`).set(bearer(adminToken)).send({ quantity: 1 });
    const list = await request(app).get('/api/vehicles').query({ make: car.make }).set(bearer(userToken));

    for (const body of [get.body, purchase.body, restock.body, list.body.items[0]]) expect(body.price).toBe(12345.67);
  });
});

describe('updating the price', () => {
  it('changes it with price (PUT) and keeps price and priceCents in step', async () => {
    const car = (await post(withPrice(10000))).body;

    const res = await request(app).put(`/api/vehicles/${car.id}`).set(bearer(adminToken)).send({ price: 8999.99 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ price: 8999.99, priceCents: 899999 });
  });

  it('still changes it with priceCents', async () => {
    const car = (await post(withPrice(10000))).body;

    const res = await request(app).patch(`/api/vehicles/${car.id}`).set(bearer(adminToken)).send({ priceCents: 500 });

    expect(res.body).toMatchObject({ price: 5, priceCents: 500 });
  });

  it('rejects a price and priceCents that disagree, and a bad price, and changes nothing', async () => {
    const car = (await post(withPrice(10000))).body;
    const put = (body: object) => request(app).put(`/api/vehicles/${car.id}`).set(bearer(adminToken)).send(body);

    expect((await put({ price: 1, priceCents: 500 })).status).toBe(400);
    expect((await put({ price: -5 })).status).toBe(400);
    expect((await put({ price: 1.234 })).status).toBe(400);
    expect((await request(app).get(`/api/vehicles/${car.id}`).set(bearer(userToken))).body.price).toBe(10000);
  });
});

describe('searching by price range, in dollars', () => {
  async function seedThree() {
    const make = uniqueMake();
    await post(withPrice(10000, { make, model: 'Cheap' }));
    await post(withPrice(30000, { make, model: 'Middle' }));
    await post(withPrice(50000.5, { make, model: 'Dear' }));
    return make;
  }
  const search = (query: Record<string, string>, path = '/api/vehicles/search') =>
    request(app).get(path).query(query).set(bearer(userToken));
  const models = (res: request.Response) => res.body.items.map((c: { model: string }) => c.model).sort();

  it('keeps vehicles between minPrice and maxPrice', async () => {
    const make = await seedThree();

    const res = await search({ make, minPrice: '20000', maxPrice: '40000' });

    expect(models(res)).toEqual(['Middle']);
  });

  it('includes vehicles priced exactly at either limit', async () => {
    const make = await seedThree();

    const res = await search({ make, minPrice: '10000', maxPrice: '30000' });

    expect(models(res)).toEqual(['Cheap', 'Middle']);
  });

  it('understands cents in a limit', async () => {
    const make = await seedThree();

    expect(models(await search({ make, minPrice: '50000.50' }))).toEqual(['Dear']);
    expect(models(await search({ make, minPrice: '50000.51' }))).toEqual([]);
  });

  it('works the same on the list endpoint', async () => {
    const make = await seedThree();

    const res = await search({ make, maxPrice: '10000' }, '/api/vehicles');

    expect(models(res)).toEqual(['Cheap']);
  });

  it.each([['-5'], ['abc'], ['1.234'], ['']])('rejects the limit %p with 400', async (value) => {
    expect((await search({ minPrice: value })).status).toBe(400);
  });
});

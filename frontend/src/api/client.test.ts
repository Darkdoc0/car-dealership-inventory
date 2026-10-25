import { createApiClient } from './client';
import { ApiError } from './errors';
import type { Car, CarInput } from './types';

const car: Car = {
  id: 1,
  vin: 'TST12345678901234',
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  mileage: 42000,
  priceCents: 1850000,
  category: 'sedan',
  quantity: 3,
  status: 'available',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const newCar: CarInput = {
  vin: car.vin,
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  mileage: 1,
  priceCents: 2,
  category: 'sedan',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup(token: string | null = null) {
  const fetchMock = vi.fn<typeof fetch>();
  const onUnauthorized = vi.fn();
  const client = createApiClient({ fetch: fetchMock, getToken: () => token, onUnauthorized });
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return {
      url,
      init,
      headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
  };
  return { client, fetchMock, onUnauthorized, lastCall };
}

describe('api client requests', () => {
  it('logs in by POSTing JSON credentials and returns the token and user', async () => {
    const { client, fetchMock, lastCall } = setup();
    fetchMock.mockResolvedValue(json({ token: 'jwt-1', user: { id: 5, email: 'a@example.com' } }));

    const result = await client.login('a@example.com', 'Sup3rSecret!');

    expect(result).toEqual({ token: 'jwt-1', user: { id: 5, email: 'a@example.com' } });
    const call = lastCall();
    expect(call.url).toBe('/api/auth/login');
    expect(call.init.method).toBe('POST');
    expect(call.headers.get('Content-Type')).toBe('application/json');
    expect(call.body).toEqual({ email: 'a@example.com', password: 'Sup3rSecret!' });
  });

  it('registers by POSTing JSON and returns the new user', async () => {
    const { client, fetchMock, lastCall } = setup();
    fetchMock.mockResolvedValue(json({ id: 9, email: 'new@example.com' }, 201));

    const user = await client.register('new@example.com', 'Sup3rSecret!');

    expect(user).toEqual({ id: 9, email: 'new@example.com' });
    expect(lastCall().url).toBe('/api/auth/register');
  });

  it('sends the bearer token when one is available', async () => {
    const { client, fetchMock, lastCall } = setup('jwt-abc');
    fetchMock.mockResolvedValue(json({ id: 1, email: 'a@example.com', role: 'user' }));

    await client.me();

    expect(lastCall().url).toBe('/api/auth/me');
    expect(lastCall().headers.get('Authorization')).toBe('Bearer jwt-abc');
  });

  it('omits the Authorization header when there is no token', async () => {
    const { client, fetchMock, lastCall } = setup(null);
    fetchMock.mockResolvedValue(json({ items: [], total: 0, limit: 20, offset: 0 }));

    await client.listCars();

    expect(lastCall().headers.has('Authorization')).toBe(false);
  });

  it('builds the list query from the given params, skipping empty values and encoding the rest', async () => {
    const { client, fetchMock, lastCall } = setup('t');
    fetchMock.mockResolvedValue(json({ items: [], total: 0, limit: 5, offset: 10 }));

    await client.listCars({
      make: 'Land Rover',
      model: '',
      category: 'suv',
      minPrice: 0,
      limit: 5,
      offset: 10,
      status: undefined,
    });

    const url = new URL(lastCall().url, 'http://localhost');
    expect(url.pathname).toBe('/api/cars');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      make: 'Land Rover',
      category: 'suv',
      minPrice: '0',
      limit: '5',
      offset: '10',
    });
  });

  it('requests /api/cars with no query string when no params are given', async () => {
    const { client, fetchMock, lastCall } = setup('t');
    fetchMock.mockResolvedValue(json({ items: [], total: 0, limit: 20, offset: 0 }));

    await client.listCars({});

    expect(lastCall().url).toBe('/api/cars');
  });

  it('gets, creates and updates cars with the right verbs and bodies', async () => {
    const { client, fetchMock, lastCall } = setup('t');
    fetchMock.mockImplementation(async () => json(car));

    await client.getCar(1);
    expect([lastCall().url, lastCall().init.method]).toEqual(['/api/cars/1', 'GET']);

    await client.createCar(newCar);
    expect([lastCall().url, lastCall().init.method]).toEqual(['/api/cars', 'POST']);
    expect(lastCall().body).toMatchObject({ vin: car.vin, category: 'sedan' });

    await client.updateCar(1, { priceCents: 99 });
    expect([lastCall().url, lastCall().init.method]).toEqual(['/api/cars/1', 'PATCH']);
    expect(lastCall().body).toEqual({ priceCents: 99 });
  });

  it('purchases one unit by default and the requested quantity otherwise', async () => {
    const { client, fetchMock, lastCall } = setup('t');
    fetchMock.mockImplementation(async () => json(car));

    await client.purchaseCar(1);
    expect([lastCall().url, lastCall().init.method]).toEqual(['/api/cars/1/purchase', 'POST']);
    expect(lastCall().body).toEqual({});

    await client.purchaseCar(1, 2);
    expect(lastCall().body).toEqual({ quantity: 2 });
  });

  it('restocks with the given quantity', async () => {
    const { client, fetchMock, lastCall } = setup('t');
    fetchMock.mockImplementation(async () => json(car));

    await client.restockCar(1, 10);

    expect([lastCall().url, lastCall().init.method]).toEqual(['/api/cars/1/restock', 'POST']);
    expect(lastCall().body).toEqual({ quantity: 10 });
  });

  it('deletes a car and resolves with nothing on 204', async () => {
    const { client, fetchMock, lastCall } = setup('t');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(client.deleteCar(1)).resolves.toBeUndefined();
    expect([lastCall().url, lastCall().init.method]).toEqual(['/api/cars/1', 'DELETE']);
  });
});

describe('api client errors', () => {
  it('throws an ApiError carrying the status and the server message', async () => {
    const { client, fetchMock } = setup('t');
    fetchMock.mockResolvedValue(json({ error: 'Not enough stock available' }, 409));

    const error = await client.purchaseCar(1).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: 'Not enough stock available' });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    const { client, fetchMock } = setup('t');
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await client.getCar(1).catch((e) => e);

    expect(error).toMatchObject({ status: 502, message: 'Request failed (502)' });
  });

  it('throws an ApiError when a successful response is not valid JSON', async () => {
    const { client, fetchMock } = setup('t');
    fetchMock.mockImplementation(async () => new Response('<html>spa fallback</html>', { status: 200 }));

    const error = await client.getCar(1).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200, message: 'The server sent an unexpected response.' });
  });

  it('reports an unreachable server as status 0', async () => {
    const { client, fetchMock } = setup('t');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await client.listCars().catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      message: 'Cannot reach the server. Check your connection and try again.',
    });
  });

  it('calls onUnauthorized when a request that carried a token gets 401', async () => {
    const { client, fetchMock, onUnauthorized } = setup('expired-token');
    fetchMock.mockResolvedValue(json({ error: 'Authentication required' }, 401));

    await expect(client.me()).rejects.toMatchObject({ status: 401 });

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not call onUnauthorized for a failed login (no token was sent)', async () => {
    const { client, fetchMock, onUnauthorized } = setup(null);
    fetchMock.mockResolvedValue(json({ error: 'Invalid email or password' }, 401));

    await expect(client.login('a@example.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not call onUnauthorized for non-401 errors', async () => {
    const { client, fetchMock, onUnauthorized } = setup('t');
    fetchMock.mockResolvedValue(json({ error: 'Forbidden' }, 403));

    await expect(client.createCar(newCar)).rejects.toMatchObject({ status: 403 });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

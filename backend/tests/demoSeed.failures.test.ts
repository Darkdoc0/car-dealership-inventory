import { DEMO_CARS, DEMO_USER, seedDemoData } from '../src/demoData';
import { pool } from '../src/db';
import { createBcryptHasher } from '../src/passwordHasher';
import { createCarRepository } from '../src/cars/carRepository';
import { createUserRepository } from '../src/users/userRepository';

// The repositories are replaced so a failing insert can be simulated; the reset and migrations still run for real.
jest.mock('../src/users/userRepository');
jest.mock('../src/cars/carRepository');

const hasher = createBcryptHasher(4);

afterAll(() => pool.end());

describe('seedDemoData when an insert fails', () => {
  it('stops and names the demo user that could not be created', async () => {
    jest.mocked(createUserRepository).mockReturnValue({ create: async () => ({ kind: 'duplicate_email' }) } as never);

    await expect(seedDemoData(pool, hasher)).rejects.toThrow(`Could not create the demo user ${DEMO_USER.email}`);
  });

  it('stops and names the demo vehicle that could not be created', async () => {
    jest.mocked(createUserRepository).mockReturnValue({ create: async () => ({ kind: 'ok', user: { id: 2, email: 'x' } }) } as never);
    jest.mocked(createCarRepository).mockReturnValue({ create: async () => ({ kind: 'duplicate_vin' }) } as never);

    await expect(seedDemoData(pool, hasher)).rejects.toThrow(`Could not create the demo vehicle ${DEMO_CARS[0].vin}`);
  });
});

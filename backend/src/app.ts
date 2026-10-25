import express from 'express';
import helmet from 'helmet';
import { createCarRepository, type CarRepository } from './cars/carRepository';
import { pool } from './db';
import { errorHandler } from './errorHandler';
import { loginRateLimit } from './loginRateLimit';
import { createRequireAuth } from './middleware/requireAuth';
import { createBcryptHasher, type PasswordHasher } from './passwordHasher';
import { createAdminRouter } from './routes/admin';
import { createAuthRouter } from './routes/auth';
import { createCarsRouter } from './routes/cars';
import { createUserRepository, type UserRepository } from './users/userRepository';

interface AppDependencies {
  users: UserRepository;
  cars: CarRepository;
  hasher: PasswordHasher;
}

export interface AppOptions {
  /** Failed login attempts allowed per IP per window. */
  loginMaxAttempts?: number;
  /** Replace the Postgres-backed repositories, e.g. with in-memory fakes in tests. */
  dependencies?: Partial<AppDependencies>;
}

export function createApp(options: AppOptions = {}) {
  const users = options.dependencies?.users ?? createUserRepository(pool);
  const cars = options.dependencies?.cars ?? createCarRepository(pool);
  const hasher = options.dependencies?.hasher ?? createBcryptHasher();
  const requireAuth = createRequireAuth(users);

  const app = express();
  // First, so every response (including errors and 404s) carries the security headers and not X-Powered-By.
  app.use(helmet());
  app.use(express.json());
  app.post('/api/auth/login', loginRateLimit(options.loginMaxAttempts));
  app.use('/api/auth', createAuthRouter(users, hasher, requireAuth));
  app.use('/api/admin', createAdminRouter(users, requireAuth));
  const vehicles = createCarsRouter(cars, requireAuth);
  app.use('/api/vehicles', vehicles);
  app.use('/api/cars', vehicles); // the original name, kept so existing callers keep working
  app.use(errorHandler);
  return app;
}

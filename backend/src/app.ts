import express from 'express';
import { createCarRepository, type CarRepository } from './cars/carRepository';
import { pool } from './db';
import { errorHandler } from './errorHandler';
import { loginRateLimit } from './loginRateLimit';
import { createRequireAuth } from './middleware/requireAuth';
import { createAdminRouter } from './routes/admin';
import { createAuthRouter } from './routes/auth';
import { createCarsRouter } from './routes/cars';
import { createUserRepository, type UserRepository } from './users/userRepository';

export interface AppDependencies {
  users: UserRepository;
  cars: CarRepository;
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
  const requireAuth = createRequireAuth(users);

  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', loginRateLimit(options.loginMaxAttempts));
  app.use('/api/auth', createAuthRouter(users, requireAuth));
  app.use('/api/admin', createAdminRouter(users, requireAuth));
  app.use('/api/cars', createCarsRouter(cars, requireAuth));
  app.use(errorHandler);
  return app;
}

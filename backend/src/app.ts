import express from 'express';
import { errorHandler } from './errorHandler';
import { loginRateLimit } from './loginRateLimit';
import { createCarRepository } from './cars/carRepository';
import { pool } from './db';
import { createRequireAuth } from './middleware/requireAuth';
import { createAdminRouter } from './routes/admin';
import { createAuthRouter } from './routes/auth';
import { createCarsRouter } from './routes/cars';
import { createUserRepository } from './users/userRepository';

export interface AppOptions {
  /** Failed login attempts allowed per IP per window. */
  loginMaxAttempts?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', loginRateLimit(options.loginMaxAttempts));
  const users = createUserRepository(pool);
  const cars = createCarRepository(pool);
  const requireAuth = createRequireAuth(users);
  app.use('/api/auth', createAuthRouter(users, requireAuth));
  app.use('/api/admin', createAdminRouter(users, requireAuth));
  app.use('/api/cars', createCarsRouter(cars, requireAuth));
  app.use(errorHandler);
  return app;
}

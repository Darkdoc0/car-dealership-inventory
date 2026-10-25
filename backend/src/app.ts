import express from 'express';
import { errorHandler } from './errorHandler';
import { authRouter } from './routes/auth';

export interface AppOptions {
  /** Failed login attempts allowed per IP per window. */
  loginMaxAttempts?: number;
}

export function createApp(_options: AppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

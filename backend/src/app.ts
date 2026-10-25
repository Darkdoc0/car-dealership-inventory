import express from 'express';
import { errorHandler } from './errorHandler';
import { loginRateLimit } from './loginRateLimit';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';

export interface AppOptions {
  /** Failed login attempts allowed per IP per window. */
  loginMaxAttempts?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', loginRateLimit(options.loginMaxAttempts));
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use(errorHandler);
  return app;
}

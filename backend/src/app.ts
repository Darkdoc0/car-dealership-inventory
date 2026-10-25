import express from 'express';
import { errorHandler } from './errorHandler';
import { authRouter } from './routes/auth';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

import express from 'express';
import { authRouter } from './routes/auth';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

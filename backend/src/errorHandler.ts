import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  // body-parser marks client errors (malformed JSON, oversized body) with a 4xx status.
  const status = err?.status ?? err?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 400 ? 'Malformed request body' : 'Invalid request' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};

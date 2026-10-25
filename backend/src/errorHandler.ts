import type { ErrorRequestHandler } from 'express';
import { sendError } from './httpErrors';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  // body-parser marks client errors (malformed JSON, oversized body) with a 4xx status.
  const status = err?.status ?? err?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return sendError(res, status, status === 400 ? 'Malformed request body' : 'Invalid request');
  }
  console.error(err);
  return sendError(res, 500, 'Internal server error');
};

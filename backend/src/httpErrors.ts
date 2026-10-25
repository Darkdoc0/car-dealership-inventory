import type { Response } from 'express';
import type { ZodError } from 'zod';

/** The single place that defines the API's error body: `{ "error": "<message>" }`. */
export function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

/** Builds a message naming the invalid fields, e.g. "Invalid car: vin, year". */
export function describeIssues(prefix: string, error: ZodError) {
  return `${prefix}: ${error.issues.map((i) => i.path.join('.') || 'body').join(', ')}`;
}

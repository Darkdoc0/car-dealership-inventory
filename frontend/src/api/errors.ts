/** A failed API call. `status` is 0 when the server could not be reached at all. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** A message that is safe to show a user for any thrown value. */
export function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_MESSAGE;
}

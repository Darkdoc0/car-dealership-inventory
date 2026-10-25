const MIN_LENGTH = 8;
const MAX_BYTES = 72;

/** Returns why the password is not acceptable, or null when it is. Mirrors the server's registration rules. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters`;
  // The server hashes with bcrypt, which only uses the first 72 bytes, so longer passwords are refused.
  if (new TextEncoder().encode(password).length > MAX_BYTES) return `Password must be at most ${MAX_BYTES} bytes`;
  return null;
}

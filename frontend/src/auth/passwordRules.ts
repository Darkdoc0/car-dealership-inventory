/** Returns why the password is not acceptable, or null when it is. Mirrors the server's registration rules. */
export function passwordProblem(_password: string): string | null {
  throw new Error('not implemented');
}

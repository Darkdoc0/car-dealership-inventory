export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

export function createTokenStore(_storage: Storage): TokenStore {
  throw new Error('not implemented');
}

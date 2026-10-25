import type { ReactNode } from 'react';
import type { CurrentUser } from '../api/types';
import type { Session } from './session';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  login(email: string, password: string): Promise<void>;
  /** Creates the account, then signs in. */
  register(email: string, password: string): Promise<void>;
  logout(): void;
}

export function AuthProvider(_props: { session: Session; children: ReactNode }) {
  return null;
}

export function useAuth(): AuthState {
  throw new Error('not implemented');
}

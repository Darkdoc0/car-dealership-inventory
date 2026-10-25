import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../api/errors';
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

interface Identity {
  status: AuthStatus;
  user: CurrentUser | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ session, children }: { session: Session; children: ReactNode }) {
  const { api, store } = session;
  // A stored token must be verified with the server before we trust it, so start in "loading".
  const [identity, setIdentity] = useState<Identity>(() => ({
    status: store.get() ? 'loading' : 'anonymous',
    user: null,
  }));

  const logout = useCallback(() => {
    store.clear();
    setIdentity({ status: 'anonymous', user: null });
  }, [store]);

  useEffect(() => session.onExpired(logout), [session, logout]);

  useEffect(() => {
    if (!store.get()) return;
    let cancelled = false;
    api.me().then(
      (user) => {
        if (!cancelled) setIdentity({ status: 'authenticated', user });
      },
      (error) => {
        if (cancelled) return;
        // Only a rejected token ends the session. If the server was merely unreachable or erroring,
        // keep the token so a reload can retry, and show the sign-in page in the meantime.
        if (error instanceof ApiError && error.status === 401) logout();
        else setIdentity({ status: 'anonymous', user: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, store, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token } = await api.login(email, password);
      store.set(token);
      try {
        setIdentity({ status: 'authenticated', user: await api.me() });
      } catch (error) {
        store.clear();
        throw error;
      }
    },
    [api, store],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password);
      await login(email, password);
    },
    [api, login],
  );

  const value = useMemo<AuthState>(
    () => ({ ...identity, login, register, logout }),
    [identity, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider');
  return value;
}

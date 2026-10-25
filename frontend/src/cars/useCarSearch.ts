import { useCallback, useEffect, useState } from 'react';
import type { ApiClient } from '../api/client';
import { messageFrom } from '../api/errors';
import type { Car, CarListParams, CarListResult } from '../api/types';

export type CarSearchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** `refreshing` means the shown page is being replaced; it stays on screen until the new one arrives. */
  | { status: 'ready'; page: CarListResult; refreshing: boolean };

/** Loads the cars for `params`, ignoring any response that arrives after the params have changed. */
export function useCarSearch(api: ApiClient, params: CarListParams) {
  const [state, setState] = useState<CarSearchState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let stale = false;
    setState((current) => (current.status === 'ready' ? { ...current, refreshing: true } : { status: 'loading' }));
    api.listCars(JSON.parse(paramsKey) as CarListParams).then(
      (page) => {
        if (!stale) setState({ status: 'ready', page, refreshing: false });
      },
      (error) => {
        if (!stale) setState({ status: 'error', message: messageFrom(error) });
      },
    );
    return () => {
      stale = true;
    };
  }, [api, paramsKey, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  /** Swaps in an updated car (e.g. after a purchase) without reloading the page. */
  const replaceCar = useCallback((car: Car) => {
    setState((current) =>
      current.status === 'ready'
        ? { ...current, page: { ...current.page, items: current.page.items.map((c) => (c.id === car.id ? car : c)) } }
        : current,
    );
  }, []);

  return { state, reload, replaceCar };
}

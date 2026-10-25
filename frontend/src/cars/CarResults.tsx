import type { ReactNode } from 'react';
import type { Car } from '../api/types';
import Pagination from './Pagination';
import type { CarSearchState } from './useCarSearch';

interface CarResultsProps {
  state: CarSearchState;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Renders the cars of the current page; `busy` is true while the next page is loading. */
  children: (cars: Car[], busy: boolean) => ReactNode;
}

/** The loading, error and empty states shared by every car list, plus paging around the results. */
export default function CarResults({ state, onRetry, onPrevious, onNext, children }: CarResultsProps) {
  if (state.status === 'loading') {
    return (
      <p role="status" className="text-slate-600">
        Loading vehicles…
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-red-700">
        <span>{state.message}</span>
        <button type="button" onClick={onRetry} className="rounded-md border border-red-300 px-3 py-1 hover:bg-red-100">
          Try again
        </button>
      </div>
    );
  }

  const { page, refreshing } = state;
  if (page.items.length === 0) return <p className="text-slate-600">No vehicles match your search.</p>;

  return (
    <>
      {children(page.items, refreshing)}
      <Pagination
        offset={page.offset}
        limit={page.limit}
        shown={page.items.length}
        total={page.total}
        busy={refreshing}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </>
  );
}

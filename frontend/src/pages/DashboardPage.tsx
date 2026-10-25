import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { Car } from '../api/types';
import CarCard from '../cars/CarCard';
import CarFiltersForm from '../cars/CarFiltersForm';
import { EMPTY_FILTERS, filtersToParams, type CarFilters } from '../cars/filters';
import Pagination from '../cars/Pagination';
import { useCarSearch } from '../cars/useCarSearch';

export default function DashboardPage() {
  const api = useApi();
  const [filters, setFilters] = useState<CarFilters>(EMPTY_FILTERS);
  const [pageNumber, setPageNumber] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const params = useMemo(() => filtersToParams(filters, pageNumber), [filters, pageNumber]);
  const { state, reload, replaceCar } = useCarSearch(api, params);

  function handleSearch(next: CarFilters) {
    setFilters(next);
    setPageNumber(0);
    setNotice(null);
  }

  async function handlePurchase(car: Car) {
    const updated = await api.purchaseCar(car.id);
    replaceCar(updated);
    setNotice(`Purchased ${car.year} ${car.make} ${car.model}`);
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Vehicles</h1>
      <CarFiltersForm onSearch={handleSearch} />

      {notice && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      )}

      {state.status === 'loading' && (
        <p role="status" className="text-slate-600">
          Loading vehicles…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-red-700">
          <span>{state.message}</span>
          <button type="button" onClick={reload} className="rounded-md border border-red-300 px-3 py-1 hover:bg-red-100">
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.page.items.length === 0 && (
        <p className="text-slate-600">No vehicles match your search.</p>
      )}

      {state.status === 'ready' && state.page.items.length > 0 && (
        <>
          <div aria-busy={state.refreshing} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.page.items.map((car) => (
              <CarCard key={car.id} car={car} onPurchase={handlePurchase} />
            ))}
          </div>
          <Pagination
            offset={state.page.offset}
            limit={state.page.limit}
            shown={state.page.items.length}
            total={state.page.total}
            busy={state.refreshing}
            onPrevious={() => setPageNumber((n) => Math.max(0, n - 1))}
            onNext={() => setPageNumber((n) => n + 1)}
          />
        </>
      )}
    </section>
  );
}

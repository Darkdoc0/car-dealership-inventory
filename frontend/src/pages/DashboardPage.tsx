import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import { carName } from '../lib/format';
import type { Car } from '../api/types';
import CarCard from '../cars/CarCard';
import CarFiltersForm from '../cars/CarFiltersForm';
import CarResults from '../cars/CarResults';
import type { CarFilters } from '../cars/filters';
import { useCarBrowser } from '../cars/useCarBrowser';

export default function DashboardPage() {
  const api = useApi();
  const { state, reload, replaceCar, applyFilters, previousPage, nextPage } = useCarBrowser(api);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSearch(filters: CarFilters) {
    applyFilters(filters);
    setNotice(null);
  }

  async function handlePurchase(car: Car) {
    const updated = await api.purchaseCar(car.id);
    replaceCar(updated);
    setNotice(`Purchased ${carName(car)}`);
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

      <CarResults state={state} onRetry={reload} onPrevious={previousPage} onNext={nextPage}>
        {(cars, busy) => (
          <div aria-busy={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} onPurchase={handlePurchase} />
            ))}
          </div>
        )}
      </CarResults>
    </section>
  );
}

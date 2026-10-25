import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../api/ApiContext';
import type { Car } from '../api/types';
import CarFiltersForm from '../cars/CarFiltersForm';
import CarResults from '../cars/CarResults';
import { CATEGORY_LABELS, STATUS_LABELS } from '../cars/labels';
import { useCarBrowser } from '../cars/useCarBrowser';
import { formatPrice } from '../lib/format';

const cell = 'px-4 py-3';

function CarRow({ car }: { car: Car }) {
  const name = `${car.year} ${car.make} ${car.model}`;
  return (
    <tr className="border-t border-slate-200">
      <th scope="row" className={`${cell} text-left font-medium text-slate-900`}>
        {name}
      </th>
      <td className={`${cell} font-mono text-xs text-slate-600`}>{car.vin}</td>
      <td className={cell}>{CATEGORY_LABELS[car.category]}</td>
      <td className={cell}>{formatPrice(car.priceCents)}</td>
      <td className={cell}>{car.quantity}</td>
      <td className={cell}>{STATUS_LABELS[car.status]}</td>
      <td className={cell}>
        <Link
          to={`/admin/cars/${car.id}/edit`}
          aria-label={`Edit ${name}`}
          className="font-medium text-indigo-600 hover:underline"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
}

/** Pages like the add/edit form leave a confirmation message in the navigation state. */
function noticeFromLocation(state: unknown): string | null {
  const notice = (state as { notice?: unknown } | null)?.notice;
  return typeof notice === 'string' ? notice : null;
}

export default function AdminCarsPage() {
  const api = useApi();
  const { state, reload, applyFilters, previousPage, nextPage } = useCarBrowser(api);
  const notice = noticeFromLocation(useLocation().state);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Manage vehicles</h1>
        <Link to="/admin/cars/new" className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
          Add vehicle
        </Link>
      </div>

      {notice && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      )}

      <CarFiltersForm onSearch={applyFilters} />

      <CarResults state={state} onRetry={reload} onPrevious={previousPage} onNext={nextPage}>
        {(cars, busy) => (
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table aria-busy={busy} className="min-w-full text-sm text-slate-700">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className={cell}>Vehicle</th>
                  <th scope="col" className={cell}>VIN</th>
                  <th scope="col" className={cell}>Category</th>
                  <th scope="col" className={cell}>Price</th>
                  <th scope="col" className={cell}>Stock</th>
                  <th scope="col" className={cell}>Status</th>
                  <th scope="col" className={cell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <CarRow key={car.id} car={car} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CarResults>
    </section>
  );
}

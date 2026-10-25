import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../api/ApiContext';
import { ApiError } from '../api/errors';
import type { Car } from '../api/types';
import CarFiltersForm from '../cars/CarFiltersForm';
import CarResults from '../cars/CarResults';
import CarRowActions from '../cars/CarRowActions';
import { CATEGORY_LABELS, STATUS_LABELS } from '../cars/labels';
import { useCarBrowser } from '../cars/useCarBrowser';
import { formatPrice } from '../lib/format';

const cell = 'px-4 py-3 align-top';
const carName = (car: Car) => `${car.year} ${car.make} ${car.model}`;

interface CarRowProps {
  car: Car;
  onRestock: (car: Car, quantity: number) => Promise<void>;
  onDelete: (car: Car) => Promise<void>;
}

function CarRow({ car, onRestock, onDelete }: CarRowProps) {
  return (
    <tr className="border-t border-slate-200">
      <th scope="row" className={`${cell} text-left font-medium text-slate-900`}>
        {carName(car)}
      </th>
      <td className={`${cell} font-mono text-xs text-slate-600`}>{car.vin}</td>
      <td className={cell}>{CATEGORY_LABELS[car.category]}</td>
      <td className={cell}>{formatPrice(car.priceCents)}</td>
      <td className={cell}>{car.quantity}</td>
      <td className={cell}>{STATUS_LABELS[car.status]}</td>
      <td className={cell}>
        <CarRowActions car={car} onRestock={onRestock} onDelete={onDelete} />
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
  const { state, pageNumber, reload, replaceCar, applyFilters, previousPage, nextPage } = useCarBrowser(api);
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(() => noticeFromLocation(location.state));

  async function handleRestock(car: Car, quantity: number) {
    const updated = await api.restockCar(car.id, quantity);
    replaceCar(updated);
    setNotice(`Restocked ${carName(updated)}: added ${quantity}`);
  }

  async function handleDelete(car: Car) {
    let alreadyGone = false;
    try {
      await api.deleteCar(car.id);
    } catch (error) {
      // Someone else deleted it first: the vehicle is gone either way, so just refresh the list.
      if (!(error instanceof ApiError && error.status === 404)) throw error;
      alreadyGone = true;
    }
    setNotice(alreadyGone ? `Already deleted: ${carName(car)}` : `Deleted ${carName(car)}`);
    // Deleting the only vehicle on a later page would leave that page empty, so step back instead of reloading it.
    if (state.status === 'ready' && state.page.items.length === 1 && pageNumber > 0) previousPage();
    else reload();
  }

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
                  <CarRow key={car.id} car={car} onRestock={handleRestock} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CarResults>
    </section>
  );
}

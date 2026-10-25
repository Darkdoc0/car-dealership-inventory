import { useId, useState } from 'react';
import { messageFrom } from '../api/errors';
import type { Car } from '../api/types';
import { carName, formatMileage, formatPrice } from '../lib/format';
import { CATEGORY_LABELS } from './labels';

/** Why a car cannot be bought right now, or null when it can. */
function unavailableLabel(car: Car): string | null {
  if (car.status === 'reserved') return 'Reserved';
  if (car.status === 'sold' || car.quantity === 0) return 'Sold out';
  return null;
}

export default function CarCard({ car, onPurchase }: { car: Car; onPurchase: (car: Car) => Promise<void> }) {
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailable = unavailableLabel(car);

  async function handleBuy() {
    setError(null);
    setPending(true);
    try {
      await onPurchase(car);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <article aria-labelledby={titleId} className="flex flex-col justify-between rounded-lg bg-white p-4 shadow">
      <div className="space-y-2">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">{carName(car)}</h2>
        <p className="text-xl font-bold text-indigo-600">{formatPrice(car.priceCents)}</p>
        <ul className="space-y-1 text-sm text-slate-600">
          {car.mileage !== null && <li>{formatMileage(car.mileage)}</li>}
          <li>{CATEGORY_LABELS[car.category]}</li>
          <li>{`${car.quantity} in stock`}</li>
        </ul>
      </div>
      <div className="mt-4 space-y-2">
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleBuy}
          disabled={pending || unavailable !== null}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {pending ? 'Buying…' : (unavailable ?? 'Buy')}
        </button>
      </div>
    </article>
  );
}

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { messageFrom } from '../api/errors';
import type { Car } from '../api/types';

const MAX_RESTOCK = 1_000_000;

interface CarRowActionsProps {
  car: Car;
  /** Adds `quantity` units of stock. Throw to show an error on the row. */
  onRestock: (car: Car, quantity: number) => Promise<void>;
  /** Deletes the vehicle. Throw to show an error on the row. */
  onDelete: (car: Car) => Promise<void>;
}

type Mode = 'idle' | 'restock' | 'delete';

const linkButton = 'font-medium text-indigo-600 hover:underline';
const smallButton = 'rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-60';
const primaryButton = 'rounded-md bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-500 disabled:opacity-60';
const dangerButton = 'rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-500 disabled:opacity-60';

/** The Edit / Restock / Delete controls of one row. Restock and Delete expand in place, so there are no pop-up dialogs. */
export default function CarRowActions({ car, onRestock, onDelete }: CarRowActionsProps) {
  const name = `${car.year} ${car.make} ${car.model}`;
  const [mode, setMode] = useState<Mode>('idle');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    setMode('idle');
    setQuantity('');
    setError(null);
  }

  /** Runs an action, keeping the controls open and showing the message if it fails. */
  async function run(action: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await action();
      close();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  function handleRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = quantity.trim();
    const amount = /^\d+$/.test(trimmed) ? Number(trimmed) : 0;
    if (amount < 1 || amount > MAX_RESTOCK) {
      setError('Enter a whole number from 1 to 1,000,000');
      return;
    }
    void run(() => onRestock(car, amount));
  }

  return (
    <div className="space-y-2">
      {mode === 'idle' && (
        <div className="flex gap-3">
          <Link to={`/admin/cars/${car.id}/edit`} aria-label={`Edit ${name}`} className={linkButton}>
            Edit
          </Link>
          <button type="button" aria-label={`Restock ${name}`} onClick={() => setMode('restock')} className={linkButton}>
            Restock
          </button>
          <button type="button" aria-label={`Delete ${name}`} onClick={() => setMode('delete')} className="font-medium text-red-600 hover:underline">
            Delete
          </button>
        </div>
      )}

      {mode === 'restock' && (
        <form onSubmit={handleRestock} className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            aria-label={`Quantity to add to ${name}`}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1"
          />
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? 'Adding…' : 'Add stock'}
          </button>
          <button type="button" onClick={close} disabled={pending} className={smallButton}>
            Cancel
          </button>
        </form>
      )}

      {mode === 'delete' && (
        <div className="flex flex-wrap items-center gap-2">
          <span>{`Delete ${name}?`}</span>
          <button type="button" disabled={pending} onClick={() => void run(() => onDelete(car))} className={dangerButton}>
            {pending ? 'Deleting…' : 'Confirm delete'}
          </button>
          {/* Focus starts on Cancel, the safe choice, so a stray Enter cannot delete anything. */}
          <button type="button" autoFocus onClick={close} disabled={pending} className={smallButton}>
            Cancel
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

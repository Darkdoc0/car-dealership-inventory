import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { messageFrom } from '../api/errors';
import { CAR_CATEGORIES, CAR_STATUSES, type CarCategory, type CarInput, type CarStatus } from '../api/types';
import Field from '../components/Field';
import SelectField from '../components/SelectField';
import { parseCarForm, type CarFormErrors, type CarFormValues } from './carForm';
import { CATEGORY_LABELS, STATUS_LABELS } from './labels';

interface VehicleFormProps {
  initial: CarFormValues;
  /** Creating asks for the starting quantity; editing shows the current stock read-only. */
  mode: 'create' | 'edit';
  /** Called with validated input. Throw to show an error on the form; resolve after navigating away or saving. */
  onSubmit: (input: CarInput) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select a category' },
  ...CAR_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
];
const STATUS_OPTIONS = CAR_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

/** The add/edit vehicle form: validates locally, reports every problem at once, then hands valid input to the caller. */
export default function VehicleForm({ initial, mode, onSubmit }: VehicleFormProps) {
  const [values, setValues] = useState<CarFormValues>(initial);
  const [errors, setErrors] = useState<CarFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed validation, move focus to the first invalid field so keyboard and screen-reader users land on it.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const set = <K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const text = (key: 'vin' | 'make' | 'model' | 'year' | 'mileage' | 'price') => ({
    value: values[key],
    error: errors[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const parsed = parseCarForm(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await onSubmit(parsed.input);
    } catch (err) {
      setServerError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="max-w-xl space-y-4 rounded-lg bg-white p-6 shadow">
      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}
      <Field label="VIN" placeholder="Optional" autoCapitalize="characters" maxLength={17} {...text('vin')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Make" {...text('make')} />
        <Field label="Model" {...text('model')} />
        <Field label="Year" placeholder="Optional" inputMode="numeric" {...text('year')} />
        <Field label="Mileage" placeholder="Optional" inputMode="numeric" {...text('mileage')} />
        <Field label="Price ($)" inputMode="decimal" {...text('price')} />
        <SelectField
          label="Category"
          options={CATEGORY_OPTIONS}
          value={values.category}
          error={errors.category}
          onChange={(e) => set('category', e.target.value as CarCategory | '')}
        />
        {mode === 'create' ? (
          <Field
            label="Quantity"
            type="number"
            min="0"
            value={values.quantity}
            error={errors.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        ) : (
          <div className="space-y-1">
            <p className="block text-sm font-medium text-slate-700">Stock</p>
            <p className="text-slate-900">
              <span>{`${values.quantity} in stock`}</span>
            </p>
            <p className="text-xs text-slate-500">Stock changes through restocking and purchases, not this form.</p>
          </div>
        )}
        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          value={values.status}
          onChange={(e) => set('status', e.target.value as CarStatus)}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save vehicle'}
        </button>
        <Link to="/admin" className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}

import type { Car, CarCategory, CarInput, CarStatus, CarUpdate } from '../api/types';

/** What the add/edit form holds: raw text exactly as typed. */
export interface CarFormValues {
  vin: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  /** Dollars, e.g. "18500.50". */
  price: string;
  category: CarCategory | '';
  quantity: string;
  status: CarStatus;
}

export type CarFormErrors = Partial<Record<keyof CarFormValues, string>>;

export type ParsedCarForm = { ok: true; input: CarInput } | { ok: false; errors: CarFormErrors };

export const EMPTY_CAR_FORM: CarFormValues = {
  vin: '',
  make: '',
  model: '',
  year: '',
  mileage: '',
  price: '',
  category: '',
  quantity: '1',
  status: 'available',
};

// These limits mirror the server's validation so mistakes are caught before the request is sent.
const MAX_TEXT_LENGTH = 100;
const MIN_YEAR = 1886;
const MAX_MILEAGE = 10_000_000;
const MAX_PRICE_CENTS = 2_000_000_000;
const MAX_QUANTITY = 1_000_000;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function carToFormValues(car: Car): CarFormValues {
  return {
    vin: car.vin,
    make: car.make,
    model: car.model,
    year: String(car.year),
    mileage: String(car.mileage),
    price: (car.priceCents / 100).toFixed(2),
    category: car.category,
    quantity: String(car.quantity),
    status: car.status,
  };
}

/** A whole number written with digits only, within [min, max]; null otherwise. */
function wholeNumberIn(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= min && value <= max ? value : null;
}

/** Dollars with at most two decimals, as whole cents; null when the text is not such an amount. */
function dollarsToCents(text: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

function requiredText(label: string, text: string): { value: string } | { error: string } {
  const value = text.trim();
  if (!value) return { error: `${label} is required` };
  if (value.length > MAX_TEXT_LENGTH) return { error: `${label} must be at most ${MAX_TEXT_LENGTH} characters` };
  return { value };
}

export function parseCarForm(values: CarFormValues): ParsedCarForm {
  const errors: CarFormErrors = {};
  const maxYear = new Date().getFullYear() + 1;

  const vin = values.vin.trim().toUpperCase();
  if (!VIN_PATTERN.test(vin)) errors.vin = 'VIN must be 17 letters and digits (no I, O or Q)';

  const make = requiredText('Make', values.make);
  if ('error' in make) errors.make = make.error;
  const model = requiredText('Model', values.model);
  if ('error' in model) errors.model = model.error;

  const year = wholeNumberIn(values.year, MIN_YEAR, maxYear);
  if (year === null) errors.year = `Year must be between ${MIN_YEAR} and ${maxYear}`;

  const mileage = wholeNumberIn(values.mileage, 0, MAX_MILEAGE);
  if (mileage === null) errors.mileage = 'Mileage must be a whole number from 0 to 10,000,000';

  const priceCents = dollarsToCents(values.price);
  if (priceCents === null) errors.price = 'Price must be an amount in dollars, like 18500 or 18500.50';
  else if (priceCents > MAX_PRICE_CENTS) errors.price = 'Price must be at most $20,000,000.00';

  if (!values.category) errors.category = 'Choose a category';

  const quantity = wholeNumberIn(values.quantity, 0, MAX_QUANTITY);
  if (quantity === null) errors.quantity = 'Quantity must be a whole number from 0 to 1,000,000';

  if (
    Object.keys(errors).length > 0 ||
    'error' in make ||
    'error' in model ||
    year === null ||
    mileage === null ||
    priceCents === null ||
    quantity === null ||
    !values.category
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      vin,
      make: make.value,
      model: model.value,
      year,
      mileage,
      priceCents,
      category: values.category,
      quantity,
      status: values.status,
    },
  };
}

const EDITABLE_FIELDS = ['vin', 'make', 'model', 'year', 'mileage', 'priceCents', 'category', 'status'] as const;

/** The fields of `input` that differ from `car`. Stock is never included: it changes through restock and purchase. */
export function changedFields(car: Car, input: CarInput): CarUpdate {
  const changes: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (input[field] !== car[field]) changes[field] = input[field];
  }
  return changes as CarUpdate;
}

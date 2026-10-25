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

export function carToFormValues(_car: Car): CarFormValues {
  throw new Error('not implemented');
}

export function parseCarForm(_values: CarFormValues): ParsedCarForm {
  throw new Error('not implemented');
}

/** The fields of `input` that differ from `car`. Stock is never included: it changes through restock and purchase. */
export function changedFields(_car: Car, _input: CarInput): CarUpdate {
  throw new Error('not implemented');
}

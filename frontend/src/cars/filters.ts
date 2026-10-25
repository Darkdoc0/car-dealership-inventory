import type { CarCategory, CarListParams } from '../api/types';

/** What the search form holds: raw text exactly as typed. */
export interface CarFilters {
  make: string;
  model: string;
  category: CarCategory | '';
  /** Dollars, as typed. */
  minPrice: string;
  /** Dollars, as typed. */
  maxPrice: string;
}

export const EMPTY_FILTERS: CarFilters = { make: '', model: '', category: '', minPrice: '', maxPrice: '' };

export const PAGE_SIZE = 12;

/** Dollars typed by the user, or undefined when it is not a non-negative amount with at most two decimals. */
function parseDollars(text: string): number | undefined {
  const trimmed = text.trim();
  return /^\d+(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : undefined;
}

export function filtersToParams(filters: CarFilters, page: number): CarListParams {
  const params: CarListParams = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };

  const make = filters.make.trim();
  if (make) params.make = make;
  const model = filters.model.trim();
  if (model) params.model = model;
  if (filters.category) params.category = filters.category;
  const minPrice = parseDollars(filters.minPrice);
  if (minPrice !== undefined) params.minPrice = minPrice;
  const maxPrice = parseDollars(filters.maxPrice);
  if (maxPrice !== undefined) params.maxPrice = maxPrice;

  return params;
}

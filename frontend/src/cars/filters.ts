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

/** Dollars typed by the user to whole cents, or undefined when it is not a non-negative amount. */
function dollarsToCents(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  return Math.round(Number(trimmed) * 100);
}

export function filtersToParams(filters: CarFilters, page: number): CarListParams {
  const params: CarListParams = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };

  const make = filters.make.trim();
  if (make) params.make = make;
  const model = filters.model.trim();
  if (model) params.model = model;
  if (filters.category) params.category = filters.category;
  const minPrice = dollarsToCents(filters.minPrice);
  if (minPrice !== undefined) params.minPrice = minPrice;
  const maxPrice = dollarsToCents(filters.maxPrice);
  if (maxPrice !== undefined) params.maxPrice = maxPrice;

  return params;
}

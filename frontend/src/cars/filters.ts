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

export function filtersToParams(_filters: CarFilters, _page: number): CarListParams {
  throw new Error('not implemented');
}

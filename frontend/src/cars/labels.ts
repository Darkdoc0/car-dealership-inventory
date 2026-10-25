import type { CarCategory, CarStatus } from '../api/types';

export const STATUS_LABELS: Record<CarStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
};

export const CATEGORY_LABELS: Record<CarCategory, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  truck: 'Truck',
  hatchback: 'Hatchback',
  coupe: 'Coupe',
  convertible: 'Convertible',
  van: 'Van',
};

export const CAR_CATEGORIES = ['sedan', 'suv', 'truck', 'hatchback', 'coupe', 'convertible', 'van'] as const;
export const CAR_STATUSES = ['available', 'reserved', 'sold'] as const;

export type CarCategory = (typeof CAR_CATEGORIES)[number];
export type CarStatus = (typeof CAR_STATUSES)[number];
export type Role = 'user' | 'admin';

export interface PublicUser {
  id: number;
  email: string;
}

export interface CurrentUser extends PublicUser {
  role: Role;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

export interface Car {
  id: number;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  priceCents: number;
  category: CarCategory;
  quantity: number;
  status: CarStatus;
  createdAt: string;
  updatedAt: string;
}

/** Fields an admin supplies when adding a car. */
export interface CarInput {
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  priceCents: number;
  category: CarCategory;
  quantity?: number;
  status?: CarStatus;
}

export type CarUpdate = Partial<CarInput>;

export interface CarListParams {
  make?: string;
  model?: string;
  category?: CarCategory;
  status?: CarStatus;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

export interface CarListResult {
  items: Car[];
  total: number;
  limit: number;
  offset: number;
}

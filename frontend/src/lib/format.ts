const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const miles = new Intl.NumberFormat('en-US');

/** Prices travel as whole cents; display them as dollars, e.g. 1850000 becomes "$18,500.00". */
export function formatPrice(priceCents: number): string {
  return usd.format(priceCents / 100);
}

export function formatMileage(mileage: number): string {
  return `${miles.format(mileage)} mi`;
}

/** "2021 Toyota Corolla"; a vehicle with no year is just "Toyota Corolla". */
export function carName({ year, make, model }: { year: number | null; make: string; model: string }): string {
  return [year, make, model].filter((part) => part !== null).join(' ');
}

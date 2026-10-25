const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const miles = new Intl.NumberFormat('en-US');

/** Prices travel as whole cents; display them as dollars, e.g. 1850000 becomes "$18,500.00". */
export function formatPrice(priceCents: number): string {
  return usd.format(priceCents / 100);
}

export function formatMileage(mileage: number): string {
  return `${miles.format(mileage)} mi`;
}

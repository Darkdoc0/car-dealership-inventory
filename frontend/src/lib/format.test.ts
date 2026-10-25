import { formatMileage, formatPrice } from './format';

describe('formatPrice', () => {
  it.each([
    [1850000, '$18,500.00'],
    [0, '$0.00'],
    [99, '$0.99'],
    [123456789, '$1,234,567.89'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatPrice(cents)).toBe(expected);
  });
});

describe('formatMileage', () => {
  it.each([
    [42000, '42,000 mi'],
    [0, '0 mi'],
    [999, '999 mi'],
  ])('formats %i miles as %s', (miles, expected) => {
    expect(formatMileage(miles)).toBe(expected);
  });
});

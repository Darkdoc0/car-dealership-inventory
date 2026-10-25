import { EMPTY_FILTERS, PAGE_SIZE, filtersToParams } from './filters';

describe('filtersToParams', () => {
  it('asks for just the first page when no filters are set', () => {
    expect(filtersToParams(EMPTY_FILTERS, 0)).toEqual({ limit: PAGE_SIZE, offset: 0 });
  });

  it('turns the page number into an offset', () => {
    expect(filtersToParams(EMPTY_FILTERS, 3)).toEqual({ limit: PAGE_SIZE, offset: 3 * PAGE_SIZE });
  });

  it('trims text filters and drops blank ones', () => {
    const params = filtersToParams({ ...EMPTY_FILTERS, make: '  Toyota ', model: '   ' }, 0);

    expect(params).toEqual({ make: 'Toyota', limit: PAGE_SIZE, offset: 0 });
  });

  it('passes the category through', () => {
    expect(filtersToParams({ ...EMPTY_FILTERS, category: 'suv' }, 0)).toMatchObject({ category: 'suv' });
  });

  it('converts dollar prices to cents', () => {
    const params = filtersToParams({ ...EMPTY_FILTERS, minPrice: '10000', maxPrice: '20000.50' }, 0);

    expect(params).toMatchObject({ minPrice: 1000000, maxPrice: 2000050 });
  });

  it('keeps a price of zero', () => {
    expect(filtersToParams({ ...EMPTY_FILTERS, minPrice: '0' }, 0)).toMatchObject({ minPrice: 0 });
  });

  it('rounds fractional cents instead of producing a float', () => {
    expect(filtersToParams({ ...EMPTY_FILTERS, minPrice: '19.999' }, 0)).toMatchObject({ minPrice: 2000 });
  });

  it.each([['abc'], ['-5'], ['']])('ignores the unusable price %p', (value) => {
    const params = filtersToParams({ ...EMPTY_FILTERS, minPrice: value }, 0);

    expect(params).not.toHaveProperty('minPrice');
  });
});

import { makeCar } from '../test/fakes';
import { EMPTY_CAR_FORM, carToFormValues, changedFields, parseCarForm, type CarFormValues } from './carForm';

const valid: CarFormValues = {
  vin: 'tst12345678901234',
  make: '  Toyota ',
  model: 'Corolla',
  year: '2021',
  mileage: '42000',
  price: '18500.50',
  category: 'sedan',
  quantity: '3',
  status: 'available',
};

const errorsFor = (overrides: Partial<CarFormValues>) => {
  const result = parseCarForm({ ...valid, ...overrides });
  if (result.ok) throw new Error('expected the form to be invalid');
  return result.errors;
};

describe('parseCarForm', () => {
  it('turns valid text into a car: VIN upper-cased, text trimmed, dollars as cents', () => {
    expect(parseCarForm(valid)).toEqual({
      ok: true,
      input: {
        vin: 'TST12345678901234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        mileage: 42000,
        priceCents: 1850050,
        category: 'sedan',
        quantity: 3,
        status: 'available',
      },
    });
  });

  it('reports every problem of an empty form at once', () => {
    const result = parseCarForm(EMPTY_CAR_FORM);

    expect(result.ok).toBe(false);
    expect(Object.keys((result as { errors: object }).errors).sort()).toEqual(['category', 'make', 'model', 'price']);
  });

  it('treats VIN, year and mileage as optional: blank means none', () => {
    const result = parseCarForm({ ...valid, vin: '  ', year: '', mileage: ' ' });

    expect(result).toMatchObject({ ok: true, input: { vin: null, year: null, mileage: null } });
  });

  it('still checks an optional field once something is typed', () => {
    expect(errorsFor({ vin: 'SHORT' }).vin).toBeDefined();
    expect(errorsFor({ year: '1800' }).year).toBeDefined();
    expect(errorsFor({ mileage: '-1' }).mileage).toBeDefined();
  });

  it.each([
    ['too short', 'TST1234'],
    ['containing the letter I', 'TSTI2345678901234'],
    ['containing the letter O', 'TSTO2345678901234'],
    ['containing the letter Q', 'TSTQ2345678901234'],
    ['containing a symbol', 'TST1234567890123-'],
  ])('rejects a VIN %s', (_label, vin) => {
    expect(errorsFor({ vin }).vin).toBe('VIN must be 17 letters and digits (no I, O or Q)');
  });

  it('requires make and model, and caps their length at 100', () => {
    expect(errorsFor({ make: '   ' }).make).toBe('Make is required');
    expect(errorsFor({ model: '' }).model).toBe('Model is required');
    expect(errorsFor({ make: 'x'.repeat(101) }).make).toBe('Make must be at most 100 characters');
  });

  it('accepts next year as the newest model year but not the one after', () => {
    const next = new Date().getFullYear() + 1;

    expect(parseCarForm({ ...valid, year: String(next) }).ok).toBe(true);
    expect(errorsFor({ year: String(next + 1) }).year).toBe(`Year must be between 1886 and ${next}`);
    expect(errorsFor({ year: '1885' }).year).toBe(`Year must be between 1886 and ${next}`);
    expect(errorsFor({ year: '2020.5' }).year).toBeDefined();
    expect(errorsFor({ year: 'abc' }).year).toBeDefined();
  });

  it.each([['-1'], ['1.5'], ['abc'], ['10000001']])('rejects the mileage %p', (mileage) => {
    expect(errorsFor({ mileage }).mileage).toBe('Mileage must be a whole number from 0 to 10,000,000');
  });

  it.each([
    ['18500', 1850000],
    ['18500.5', 1850050],
    ['0', 0],
    ['0.99', 99],
    ['19.99', 1999],
    ['20000000', 2000000000],
  ])('converts the price %s to %i cents', (price, cents) => {
    const result = parseCarForm({ ...valid, price });

    expect(result).toMatchObject({ ok: true, input: { priceCents: cents } });
  });

  it.each([['-5'], ['abc'], ['1.234'], [''], ['1,000']])('rejects the price %p', (price) => {
    expect(errorsFor({ price }).price).toBe('Price must be an amount in dollars, like 18500 or 18500.50');
  });

  it('rejects a price above the limit', () => {
    expect(errorsFor({ price: '20000000.01' }).price).toBe('Price must be at most $20,000,000.00');
  });

  it('requires a category', () => {
    expect(errorsFor({ category: '' }).category).toBe('Choose a category');
  });

  it.each([['-1'], ['1.5'], ['abc'], ['1000001'], ['']])('rejects the quantity %p', (quantity) => {
    expect(errorsFor({ quantity }).quantity).toBe('Quantity must be a whole number from 0 to 1,000,000');
  });

  it('accepts a quantity of zero', () => {
    expect(parseCarForm({ ...valid, quantity: '0' })).toMatchObject({ ok: true, input: { quantity: 0 } });
  });
});

describe('carToFormValues', () => {
  it('fills the form from a car, showing the price in dollars', () => {
    const car = makeCar({ vin: 'TST12345678901234', make: 'Toyota', model: 'Corolla', year: 2021, mileage: 42000, priceCents: 1850050, category: 'suv', quantity: 3, status: 'reserved' });

    expect(carToFormValues(car)).toEqual({
      vin: 'TST12345678901234',
      make: 'Toyota',
      model: 'Corolla',
      year: '2021',
      mileage: '42000',
      price: '18500.50',
      category: 'suv',
      quantity: '3',
      status: 'reserved',
    });
  });

  it('shows missing VIN, year and mileage as empty fields', () => {
    const values = carToFormValues(makeCar({ vin: null, year: null, mileage: null }));

    expect(values).toMatchObject({ vin: '', year: '', mileage: '' });
  });

  it('round-trips through parseCarForm to the same car fields', () => {
    const car = makeCar({ priceCents: 99 });

    const result = parseCarForm(carToFormValues(car));

    expect(result).toMatchObject({ ok: true, input: { vin: car.vin, priceCents: 99, year: car.year } });
  });
});

describe('changedFields', () => {
  const car = makeCar({ id: 1 });
  const same = {
    vin: car.vin,
    make: car.make,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    priceCents: car.priceCents,
    category: car.category,
    quantity: car.quantity,
    status: car.status,
  };

  it('is empty when nothing changed', () => {
    expect(changedFields(car, same)).toEqual({});
  });

  it('includes only the fields that differ', () => {
    expect(changedFields(car, { ...same, priceCents: 1, status: 'reserved' })).toEqual({ priceCents: 1, status: 'reserved' });
  });

  it('sends null to clear an optional field that was emptied, and nothing when it was already empty', () => {
    expect(changedFields(car, { ...same, vin: null, year: null })).toEqual({ vin: null, year: null });
    const bare = makeCar({ id: 2, vin: null, year: null, mileage: null });
    expect(changedFields(bare, { ...same, vin: null, year: null, mileage: null, make: bare.make, model: bare.model, priceCents: bare.priceCents, category: bare.category })).toEqual({});
  });

  it('never includes quantity, even when it differs', () => {
    expect(changedFields(car, { ...same, quantity: 99 })).toEqual({});
  });
});

import { parseId } from '../src/cars/schemas';

describe('parseId', () => {
  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2147483647],
  ])('accepts %s', (raw, expected) => {
    expect(parseId(raw)).toBe(expected);
  });

  it.each([['0'], ['-1'], ['1.5'], ['abc'], [''], ['007'], ['1e3'], ['99999999999999999999']])('rejects %p', (raw) => {
    expect(parseId(raw)).toBeNull();
  });

  it('rejects a 10-digit id that overflows a Postgres int4', () => {
    expect(parseId('2147483648')).toBeNull();
    expect(parseId('9999999999')).toBeNull();
  });
});

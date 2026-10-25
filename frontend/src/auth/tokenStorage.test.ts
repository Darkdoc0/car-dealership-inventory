import { createTokenStore } from './tokenStorage';

const throwingStorage = {
  getItem() {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem() {
    throw new DOMException('denied', 'SecurityError');
  },
  removeItem() {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

describe('createTokenStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(createTokenStore(localStorage).get()).toBeNull();
  });

  it('stores and clears a token', () => {
    const store = createTokenStore(localStorage);

    store.set('jwt-1');
    expect(store.get()).toBe('jwt-1');

    store.clear();
    expect(store.get()).toBeNull();
  });

  it('persists the token so a new store on the same storage (a page reload) sees it', () => {
    createTokenStore(localStorage).set('jwt-persisted');

    expect(createTokenStore(localStorage).get()).toBe('jwt-persisted');
  });

  it('keeps the session working in memory when storage is unavailable', () => {
    const store = createTokenStore(throwingStorage);

    expect(store.get()).toBeNull();
    expect(() => store.set('jwt-memory')).not.toThrow();
    expect(store.get()).toBe('jwt-memory');
    expect(() => store.clear()).not.toThrow();
    expect(store.get()).toBeNull();
  });
});

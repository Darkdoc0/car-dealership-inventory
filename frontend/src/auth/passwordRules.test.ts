import { passwordProblem } from './passwordRules';

describe('passwordProblem', () => {
  it('accepts a password between 8 characters and 72 bytes', () => {
    expect(passwordProblem('12345678')).toBeNull();
    expect(passwordProblem('a'.repeat(72))).toBeNull();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(passwordProblem('1234567')).toBe('Password must be at least 8 characters');
    expect(passwordProblem('')).toBe('Password must be at least 8 characters');
  });

  it('rejects a password longer than 72 bytes', () => {
    expect(passwordProblem('a'.repeat(73))).toBe('Password must be at most 72 bytes');
  });

  it('counts bytes, not characters, for the upper limit', () => {
    expect(passwordProblem('é'.repeat(36))).toBeNull(); // 72 bytes
    expect(passwordProblem('é'.repeat(37))).toBe('Password must be at most 72 bytes'); // 74 bytes
  });
});

import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from './credentials';

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /**
   * Checks a password against a stored hash. Pass `null` when there is no stored hash (unknown user):
   * a comparison against a dummy hash still runs so the response time does not reveal which users exist.
   */
  verify(plain: string, hash: string | null): Promise<boolean>;
}

export function createBcryptHasher(cost: number = BCRYPT_COST): PasswordHasher {
  let dummyHash: Promise<string> | undefined;
  const getDummyHash = () => (dummyHash ??= bcrypt.hash('timing-equalizer', cost));

  return {
    hash: (plain) => bcrypt.hash(plain, cost),

    async verify(plain, hash) {
      const matches = await bcrypt.compare(plain, hash ?? (await getDummyHash()));
      return hash !== null && matches;
    },
  };
}

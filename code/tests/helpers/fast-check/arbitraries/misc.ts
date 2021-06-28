import fc from 'fast-check';
import { AUTH_CODE_LENGTH } from '../../../../src/util/constants';

export type MayHappenOption = 'sometimes' | 'always' | 'never';

export function mayHappenArbitrary<T>(
  arb: fc.Arbitrary<T>,
  isDefined: MayHappenOption
): fc.Arbitrary<T | undefined> {
  switch (isDefined) {
    case 'always':
      return arb;

    case 'never':
      return fc.constant<undefined>(undefined);

    default:
      return fc.oneof(arb, fc.constant<undefined>(undefined));
  }
}

export const alphaAndUnderscoreString = fc.stringOf(
  fc.mapToConstant(
    { num: 26, build: (v) => String.fromCharCode(v + 0x41) },
    { num: 26, build: (v) => String.fromCharCode(v + 0x61) },
    { num: 1, build: () => '_' } // _
  )
);

export const authCodeString = fc
  .integer({ min: 0, max: 10 ** AUTH_CODE_LENGTH - 1 })
  .map((code) => code.toFixed().padStart(AUTH_CODE_LENGTH, '0'));

import fc from 'fast-check';
import { AUTH_CODE_LENGTH } from '../../../../src/util/constants';

export type MayHappenOption = 'sometimes' | 'always' | 'never';

export function mayHappenArbitrary<T>(
  arb: () => fc.Arbitrary<T>,
  isDefined: MayHappenOption,
  nil: () => fc.Arbitrary<T | undefined> = () =>
    fc.constant<undefined>(undefined)
): fc.Arbitrary<T | undefined> {
  switch (isDefined) {
    case 'always':
      return arb();

    case 'never':
      return nil();

    default:
      return fc.oneof(arb(), nil());
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

import fc from 'fast-check';

export type MayHappenOption = 'sometimes' | 'always' | 'never';

export const alphaAndUnderscoreString = fc.stringOf(
  fc.mapToConstant(
    { num: 26, build: (v) => String.fromCharCode(v + 0x41) },
    { num: 26, build: (v) => String.fromCharCode(v + 0x61) },
    { num: 1, build: () => '_' } // _
  )
);

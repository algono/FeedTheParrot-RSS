import fc from 'fast-check';
import { calculateMaxCharactersIn } from '../../src/util/helpers';

describe('calculateMaxCharactersIn', () => {
  test('returns 0 if list is empty', () =>
    fc.assert(
      fc.property(fc.lorem({ maxCount: 1 }), (property) => {
        expect(calculateMaxCharactersIn([], property)).toBe(0);
      })
    ));

  test('returns 0 if inner lists are empty', () =>
    fc.assert(
      fc.property(
        fc.lorem({ maxCount: 1 }).chain((property) =>
          fc.tuple(
            fc.array(
              fc.record({
                [property]: fc.constant<string[]>([]),
              }),
              { minLength: 1 }
            ),
            fc.constant(property)
          )
        ),
        ([list, property]) => {
          expect(calculateMaxCharactersIn(list, property)).toBe(0);
        }
      )
    ));

  test('it works', () =>
    fc.assert(
      fc.property(
        fc
          .tuple(fc.lorem({ maxCount: 1 }), fc.integer({ min: 1, max: 20 }))
          .chain(([property, max]) => {
            const state = { anyWithMax: false };
            return fc.tuple(
              fc
                .array(
                  fc.record({
                    [property]: fc.option(
                      fc.array(
                        fc.boolean().chain((isMax) => {
                          if (isMax) state.anyWithMax = isMax;
                          return fc.string(
                            isMax
                              ? { minLength: max, maxLength: max }
                              : { maxLength: max - 1 }
                          );
                        }),
                        { minLength: 1 }
                      )
                    ),
                  }),
                  { minLength: 1 }
                )
                .filter(() => state.anyWithMax),
              fc.constant(property),
              fc.constant(max)
            );
          }),
        ([list, property, max]) => {
          expect(calculateMaxCharactersIn(list, property)).toBe(max);
        }
      )
    ));

  test('topLimit works', () =>
    fc.assert(
      fc.property(
        fc
          .tuple(fc.lorem({ maxCount: 1 }), fc.integer({ min: 1, max: 20 }))
          .chain(([property, topLimit]) =>
            fc.tuple(
              fc.array(
                fc.record({
                  [property]: fc.array(fc.string({ minLength: topLimit }), {
                    minLength: 1,
                  }),
                }),
                { minLength: 1 }
              ),
              fc.constant(property),
              fc.constant(topLimit)
            )
          ),
        ([list, property, topLimit]) => {
          expect(calculateMaxCharactersIn(list, property, topLimit)).toBe(
            topLimit
          );
        }
      )
    ));
});

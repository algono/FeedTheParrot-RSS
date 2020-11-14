import fc from 'fast-check';
import * as truncate from '../../src/util/truncate';
import { truncateAll } from '../../src/util/truncateAll';
import { hasReturned } from '../helpers/jest/mockResultHelpers';

test('None of the strings from the result surpass the provided length', () =>
  fc.assert(
    fc.property(
      fc.lorem({ mode: 'sentences' }),
      fc.integer({ min: 1 }),
      (str, len) => {
        truncateAll(str, len).forEach((value) => {
          expect(value.length).toBeLessThanOrEqual(len);
        });
      }
    )
  ));

test('The result list contains everything from the original string', () =>
  fc.assert(
    fc.property(
      fc.lorem({ mode: 'sentences' }),
      fc.integer({ min: 1 }),
      (str, len) => {
        const res = truncateAll(str, len);
        expect(res.join('')).toEqual(str);
      }
    )
  ));

describe('tests with truncate mocked', () => {
  const truncateSpy = jest.spyOn(truncate, 'truncate');
  beforeEach(() => truncateSpy.mockClear());

  function getTruncateSpyResults({ readable }: { readable?: boolean } = {}) {
    return truncateSpy.mock.results.map((res) => {
      if (hasReturned(res)) {
        return readable ? res.value.readable : res.value.str;
      } else {
        fail('One of the results was not returned, but instead: ' + res.type);
      }
    });
  }

  test('When the readable flag is unset, it returns the result strings from calling truncate', () =>
    fc.assert(
      fc.property(
        fc.lorem({ mode: 'sentences' }),
        fc.integer({ min: 1 }),
        (str, len) => {
          truncateSpy.mockClear();

          const res = truncateAll(str, len);

          expect(truncateSpy).toHaveBeenCalled();
          expect(getTruncateSpyResults()).toEqual(res);
        }
      )
    ));

  test('When the readable flag is set to false, it returns the result strings from calling truncate', () =>
    fc.assert(
      fc.property(
        fc.lorem({ mode: 'sentences' }),
        fc.integer({ min: 1 }),
        (str, len) => {
          truncateSpy.mockClear();

          const res = truncateAll(str, len, { readable: false });

          expect(truncateSpy).toHaveBeenCalled();
          expect(getTruncateSpyResults({ readable: false })).toEqual(res);
        }
      )
    ));

  test('When the readable flag is set to true, it instead returns the readable versions of the result strings from calling truncate', () =>
    fc.assert(
      fc.property(
        fc.lorem({ mode: 'sentences' }),
        fc.integer({ min: 1 }),
        (str, len) => {
          truncateSpy.mockClear();

          const res = truncateAll(str, len, { readable: true });

          expect(truncateSpy).toHaveBeenCalled();
          expect(getTruncateSpyResults({ readable: true })).toEqual(res);
        }
      )
    ));
});

import fc from 'fast-check';
import { truncateAll } from '../../src/util/truncateAll';

test('None of the strings from the result of truncateAll surpass the provided length', () =>
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

test.todo(
  'The list resulting from truncateAll contains everything from the original string'
);

test.todo(
  'When truncateAll has the readable flag set to true, it instead returns the readable versions of the result strings from calling truncate'
);

import fc from 'fast-check';
import { truncate } from '../../src/util/truncate';

test('If the length is not greater than zero, throw an error', () =>
  fc.assert(
    fc.property(fc.string(), fc.integer({ max: 0 }), (str, len) => {
      expect(() => truncate(str, len)).toThrowError(RangeError);
    })
  ));

test('If the length is not an integer, throw an error', () =>
  fc.assert(
    fc.property(fc.string(), fc.double(), (str, len) => {
      expect(() => truncate(str, len)).toThrowError(RangeError);
    })
  ));

test('The result of calling truncate never surpasses the provided length', () =>
  fc.assert(
    fc.property(
      fc.lorem({ mode: 'sentences' }),
      fc.integer({ min: 1 }),
      (str, len) => {
        expect(truncate(str, len).str.length).toBeLessThanOrEqual(len);
      }
    )
  ));

test('The original string starts with the result of calling truncate', () =>
  fc.assert(
    fc.property(
      fc.lorem({ mode: 'sentences' }),
      fc.integer({ min: 1 }),
      (str, len) => {
        expect(str.startsWith(truncate(str, len).str)).toBe(true);
      }
    )
  ));

test('When the readable version is present, it is always the same as the normal version but with 3 dots at the end', () =>
  fc.assert(
    fc.property(
      fc.lorem({ mode: 'sentences' }),
      fc.integer({ min: 1 }),
      (str, len) => {
        const res = truncate(str, len);

        if (res.readable) {
          expect(res.readable).toEqual(res.str + '...');
        } else {
          expect(res.readable).toBeUndefined();
        }
      }
    )
  ));

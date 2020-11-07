import util from 'util';
import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import {
  applyLangFormatter,
  getLangFormatter,
} from '../../src/util/langFormatter';
import { init } from '../../src/util/localization';
import { testInAllLocales } from '../helpers/helperTests';

testInAllLocales(
  "getLangFormatter returns ssml with a valid 'lang' tag",
  async (locale) => {
    const t = await init(locale);

    const langFormatter = getLangFormatter(t);

    expect(langFormatter).toMatch(
      /.*?<lang xml:lang="[\w-]+?">.*?%s.*?<\/lang>.*?/
    );
  }
);

testInAllLocales(
  "getLangFormatter returns ssml with a valid 'voice' tag",
  async (locale) => {
    const t = await init(locale);

    const langFormatter = getLangFormatter(t);

    expect(langFormatter).toMatch(
      /.*?<voice name="[\w]+?">.*?%s.*?<\/voice>.*?/
    );
  }
);

jest.mock('util');
describe('applyLangFormatter', () => {
  const formatMock = mocked(util.format).mockImplementation();

  beforeEach(() => jest.clearAllMocks());

  test('applyLangFormatter returns result of applying util format if the langFormatter is not empty', () =>
    fc.assert(
      fc.property(
        fc.string(),
        fc.string({ minLength: 1 }),
        (target, langFormatter) => {
          const result = applyLangFormatter(target, langFormatter);
          expect(formatMock).toHaveBeenLastCalledWith(langFormatter, target);
          expect(formatMock).toHaveLastReturnedWith(result);
        }
      )
    ));

  test('applyLangFormatter returns target if the langFormatter is empty, null or undefined', () =>
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom<string[]>('', null, undefined),
        (target, langFormatter) => {
          const result = applyLangFormatter(target, langFormatter);
          expect(formatMock).not.toHaveBeenCalled();
          expect(result).toEqual(target);
        }
      )
    ));
});

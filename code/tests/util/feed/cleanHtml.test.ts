import fc from 'fast-check';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import { init } from '../../../src/util/localization';
import { htmlFormattedLorem } from '../../helpers/fast-check/arbitraries/formattedText';
import { testInAllLocales } from '../../helpers/helperTests';

test('cleanHtml properly cleans html formatted text', () =>
  fc.assert(
    fc.property(htmlFormattedLorem, (text) =>
      expect(cleanHtml(text.html, '')).toEqual(text.plain.trim())
    )
  ));

testInAllLocales(
  "cleanHtml changes the html ampersand symbol ('&amp;') with the ampersandReplacement",
  async (locale) => {
    const t = await init(locale);
    const ampersandReplacement = t('AMPERSAND');

    fc.assert(
      fc.property(
        fc.stringOf(fc.oneof(fc.lorem(), fc.constant('&amp;'))),
        (text) => {
          expect(cleanHtml(text, ampersandReplacement)).toEqual(
            text.replace(/&amp;/g, ampersandReplacement)
          );
        }
      )
    );
  }
);

test("cleanHtml removes html tag symbols ('<', '>')", () =>
  fc.assert(
    fc.property(htmlFormattedLorem, (text) => {
      const res = cleanHtml(text.html, '');
      expect(res).not.toContain('<');
      expect(res).not.toContain('>');
    })
  ));

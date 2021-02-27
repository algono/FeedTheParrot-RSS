import fc from 'fast-check';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import { initNewInstance } from '../../../src/util/localization';
import { htmlFormattedLorem } from '../../helpers/fast-check/arbitraries/formattedText';
import { testInAllLocales } from '../../helpers/helperTests';

test('properly cleans html formatted text', () =>
  fc.assert(
    fc.property(htmlFormattedLorem, (text) =>
      expect(cleanHtml(text.html, '')).toEqual(text.plain.trim())
    )
  ));

testInAllLocales(
  "changes the html ampersand symbol ('&amp;') with the ampersandReplacement"
)(async (locale) => {
  const t = await initNewInstance(locale);
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
});

test("removes html tag symbols ('<', '>')", () =>
  fc.assert(
    fc.property(htmlFormattedLorem, (text) => {
      const res = cleanHtml(text.html, '');
      expect(res).not.toContain('<');
      expect(res).not.toContain('>');
    })
  ));

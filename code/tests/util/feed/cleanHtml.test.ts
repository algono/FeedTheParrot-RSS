import fc from 'fast-check';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import { htmlFormattedLorem } from '../../helpers/fast-check/arbitraries/formattedText';
import { testInAllLocales } from '../../helpers/helperTests';

test('cleanHtml properly cleans html formatted text', () =>
  fc.assert(
    fc.property(htmlFormattedLorem, (html) =>
      expect(cleanHtml(html.html, '')).toEqual(html.plain.trim())
    )
  ));

testInAllLocales.todo(
  'cleanHtml changes the ampersand symbol with the ampersandReplacement'
);

test.todo("cleanHtml removes all tag symbols ('<', '>')");

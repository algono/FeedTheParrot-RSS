import fc from 'fast-check';
import { Item } from 'feedparser';
import { instance, mock, when } from 'ts-mockito';
import { MAX_CHARACTERS_SPEECH } from '../../../src/util/constants';
import { MayHappenOption } from '../fast-check/arbitraries/misc';
import { mockArbitrary } from '../fast-check/arbitraries/mockArbitrary';

export function mockItemArbitrary({
  contentSurpassesMaxCharacters = 'sometimes',
}: { contentSurpassesMaxCharacters?: MayHappenOption } = {}): fc.Arbitrary<
  Item
> {
  return fc
    .tuple(
      fc.integer({
        min:
          contentSurpassesMaxCharacters === 'always'
            ? MAX_CHARACTERS_SPEECH + 1
            : undefined,
        max:
          contentSurpassesMaxCharacters === 'never'
            ? MAX_CHARACTERS_SPEECH
            : undefined,
      }),
      fc.boolean()
    )
    .chain(([contentLength, hasSummary]) => {
      const contentMock = mock<string>();
      when(contentMock.length).thenReturn(contentLength);
      const content = instance(contentMock);

      return mockArbitrary<Item>((itemMock) => {
        when(itemMock.summary).thenReturn(hasSummary ? content : null);
        when(itemMock.description).thenReturn(content);
      });
    });
}

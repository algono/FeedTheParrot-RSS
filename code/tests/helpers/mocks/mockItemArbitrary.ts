import fc from 'fast-check';
import { Item, Enclosure } from 'feedparser';
import { anything, instance, mock, when } from 'ts-mockito';
import { MAX_CHARACTERS_SPEECH } from '../../../src/util/constants';
import { MayHappenOption } from '../fast-check/arbitraries/misc';
import { mockArbitrary } from '../fast-check/arbitraries/mockArbitrary';

const hasAudioContentArbs : { readonly [key in MayHappenOption]: fc.Arbitrary<boolean> } = {
  'always': fc.constant(true),
  'sometimes': fc.boolean(),
  'never': fc.constant(false),
};

export function mockItemArbitrary({
  contentSurpassesMaxCharacters = 'sometimes',
  hasAudioContent = 'sometimes',
}: {
  contentSurpassesMaxCharacters?: MayHappenOption;
  hasAudioContent?: MayHappenOption;
} = {}): fc.Arbitrary<Item> {
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
      fc.boolean(),
      hasAudioContentArbs[hasAudioContent]
    )
    .chain(([contentLength, hasSummary, hasAudio]) => {
      const contentMock = mock<string>();
      when(contentMock.length).thenReturn(contentLength);
      const content = instance(contentMock);

      return mockArbitrary<Item>((itemMock) => {
        when(itemMock.summary).thenReturn(hasSummary ? content : null);
        when(itemMock.description).thenReturn(content);

        const enclosuresMock = mock<Enclosure[]>();
        const enclosureMock = mock<Enclosure>();
        when(enclosuresMock.find(anything())).thenCall(() => hasAudio ? instance(enclosureMock) : undefined);

        when(itemMock.enclosures).thenCall(() => instance(enclosuresMock));
      });
    });
}

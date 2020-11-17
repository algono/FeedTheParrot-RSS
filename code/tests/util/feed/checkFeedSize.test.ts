import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { instance, mock, when } from 'ts-mockito';
import { FeedIsTooLongError } from '../../../src/intents/Error';
import { Feed, FeedItems } from '../../../src/logic/Feed';
import { MAX_RESPONSE_LENGTH } from '../../../src/util/constants';
import { checkFeedSize } from '../../../src/util/feed/checkFeedSize';
import { calculateMaxCharactersIn } from '../../../src/util/helpers';

jest.mock('../../../src/util/helpers');

test('throws an error if the feed size exceeds the maximum response length', () =>
  fc.assert(
    fc.property(
      fc.integer({ min: MAX_RESPONSE_LENGTH }),
      fc.nat(),
      (feedSize, maxCharacters) => {
        const jsonStringMock = mock<string>();
        when(jsonStringMock.length).thenReturn(feedSize);

        jest.spyOn(JSON, 'stringify').mockReturnValue(instance(jsonStringMock));

        mocked(calculateMaxCharactersIn).mockReturnValue(maxCharacters);

        expect(() =>
          checkFeedSize(instance(mock<FeedItems>()), instance(mock<Feed>()))
        ).toThrowError(FeedIsTooLongError);
      }
    )
  ));

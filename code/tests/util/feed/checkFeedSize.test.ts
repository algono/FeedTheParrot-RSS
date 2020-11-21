import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { instance, mock, when } from 'ts-mockito';
import { FeedIsTooLongError } from '../../../src/logic/Errors';
import { Feed, FeedItems } from '../../../src/logic/Feed';
import {
  MAX_CHARACTERS_SPEECH,
  MAX_RESPONSE_LENGTH,
} from '../../../src/util/constants';
import { checkFeedSize } from '../../../src/util/feed/checkFeedSize';
import { calculateMaxCharactersIn } from '../../../src/util/helpers';

jest.mock('../../../src/util/helpers');

const checkFeedSizeCall = () =>
  checkFeedSize(instance(mock<FeedItems>()), instance(mock<Feed>()));

test('throws an error if the feed size exceeds the maximum response length', () =>
  fc.assert(
    fc.property(
      fc.integer({ min: MAX_RESPONSE_LENGTH + 1 }),
      fc.nat({ max: MAX_CHARACTERS_SPEECH }),
      (feedSize, maxCharacters) => {
        setupMocks(feedSize, maxCharacters);
        expect(checkFeedSizeCall).toThrowError(FeedIsTooLongError);
      }
    )
  ));

// I have yet to find out what the actual limitations of Alexa accurately are, so I am trying to make an educated guess here
test('does not throw an error if the feed size does not exceed a reasonable limit', () =>
  fc.assert(
    fc.property(
      fc.nat({ max: MAX_RESPONSE_LENGTH - MAX_CHARACTERS_SPEECH }),
      fc.nat({ max: MAX_CHARACTERS_SPEECH }),
      (feedSize, maxCharacters) => {
        setupMocks(feedSize, maxCharacters);
        expect(checkFeedSizeCall).not.toThrowError(FeedIsTooLongError);
      }
    )
  ));

function setupMocks(feedSize: number, maxCharacters: number) {
  const jsonStringMock = mock<string>();
  when(jsonStringMock.length).thenReturn(feedSize);

  jest.spyOn(JSON, 'stringify').mockReturnValue(instance(jsonStringMock));

  mocked(calculateMaxCharactersIn).mockReturnValue(maxCharacters);
}

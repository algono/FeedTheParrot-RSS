import { MAX_RESPONSE_LENGTH } from '../constants';
import { Feed, FeedItems } from '../../logic/Feed';
import { FeedIsTooLongError } from '../../logic/Errors';
import { calculateMaxCharactersIn } from '../helpers';

export function checkFeedSize(items: FeedItems, feed: Feed) {
  console.log('Checking feed size...'); // Not sure why, but it seems to only work if there is something before checking the feed size

  const feedSize = JSON.stringify(items.list).length;

  console.log('Feed size: ' + feedSize);

  const maxCharacters = calculateMaxCharactersIn(
    items.list,
    'content',
    feed.truncateContentAt
  );

  const maxFeedSize = Math.max(0, MAX_RESPONSE_LENGTH - maxCharacters);

  if (feedSize > maxFeedSize) {
    throw new FeedIsTooLongError();
  }
}

import { MAX_RESPONSE_LENGTH } from '../constants';
import { Feed, FeedItem, FeedItems } from '../../logic/Feed';
import { FeedIsTooLongError } from '../../intents/Error';

export function checkFeedSize(items: FeedItems, feed: Feed) {
  console.log('Checking feed size...'); // Not sure why, but it seems to only work if there is something before checking the feed size

  const feedSize = JSON.stringify(items.list).length;

  console.log('Feed size: ' + feedSize);

  if (
    feedSize >
    calculateMaxFeedSize(
      calculateMaxCharactersInFeedContent(items.list, feed.truncateContentAt)
    )
  ) {
    console.log('Feed is too long');
    throw new FeedIsTooLongError();
  }
}

function calculateMaxFeedSize(...maxCharacters: number[]): number {
  const res = Math.max(
    0,
    maxCharacters.reduce(
      (acc, max) => acc - max,
      MAX_RESPONSE_LENGTH - CHARACTER_MARGIN
    )
  );

  console.log('Max feed size: ' + res);
  return res;
}

// This value will probably be tweaked in the future
const CHARACTER_MARGIN = 0;

function calculateMaxCharactersInFeedContent(
  items: FeedItem[],
  truncateAt?: number
): number {
  let res = 0;
  for (const item of items) {
    let max = 0;
    for (const speech of item.content) {
      if (truncateAt && speech.length >= truncateAt) {
        return truncateAt;
      } else if (speech.length > max) {
        max = speech.length;
      }
    }
    if (max > res) {
      res = max;
    }
  }

  console.log('Max characters in feed content: ' + res);
  return res;
}

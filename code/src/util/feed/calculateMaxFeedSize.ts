import { MAX_RESPONSE_LENGTH } from '../constants';
import { FeedItem } from '../../logic/Feed';

export function calculateMaxFeedSize(...maxCharacters: number[]): number {
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
export const CHARACTER_MARGIN = 0;

export function calculateMaxCharactersInFeedContent(
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

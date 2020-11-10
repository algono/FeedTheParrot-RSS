import { Item } from 'feedparser';
import { MAX_CHARACTERS_SPEECH } from '../constants';
import { Feed, FeedItem } from '../../logic/Feed';
import { truncateAll } from '../truncateAll';
import { cleanHtml } from './cleanHtml';

export function processFeedItem(
  item: Item,
  feed: Feed,
  ampersandReplacement: string
) {
  const clean = (text: string) => cleanHtml(text, ampersandReplacement);
  /**
   * Note:
   * The FeedParser library adds the rss:content to the description, and the rss:description to the summary.
   * This happens because in the Atom format, the summary is the equivalent to the description
   * So to receive a consistent response independent on the format given, it does that.
   */
  const feedItem: FeedItem = {
    title: clean(item.title),
    description: clean(item.description),
    summary: clean(item.summary),
    date: new Date(item.date).toUTCString(),
    link: item.link,
    imageUrl: item.image ? item.image.url : undefined,
    content: [],
  };

  const summary = feedItem.summary || feedItem.description;

  feedItem.content = processContent(
    summary,
    MAX_CHARACTERS_SPEECH,
    feed.truncateContentAt
  );

  return feedItem;
}

function processContent(
  content: string,
  maxItemCharacters: number,
  truncateAt?: number
) {
  if (truncateAt || content.length > maxItemCharacters) {
    return truncateAll(content, truncateAt ?? maxItemCharacters, {
      readable: true,
    });
  } else {
    return [content];
  }
}

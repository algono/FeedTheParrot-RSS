import { Item } from 'feedparser';
import { MAX_CHARACTERS_SPEECH } from '../constants';
import { Feed, FeedFilter, FeedItem } from '../../logic/Feed';
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
    categories: item.categories,
    imageUrl: item.image ? item.image.url : undefined,
    content: [],
  };

  const audio = item.enclosures.find((enclosure) =>
    enclosure.type?.startsWith('audio')
  );
  if (audio) {
    feedItem.podcast = audio;
  }

  const content = getContent(feed, feedItem);

  feedItem.content = processContent(
    content,
    MAX_CHARACTERS_SPEECH,
    feed.truncateContentAt
  );

  return feedItem;
}

export function getContent(feed: Feed, item: Item | FeedItem) {
  return feed.readFullContent
    ? item.description || item.summary
    : item.summary || item.description;
}

function processContent(
  content: string,
  maxItemCharacters: number,
  truncateAt?: number
) {
  if (truncateAt || content.length > maxItemCharacters) {
    return truncateAll(content, truncateAt || maxItemCharacters, {
      readable: true,
    });
  } else {
    return [content];
  }
}

export function matchesFilters(item: FeedItem, feed: Feed): boolean {
  return matchesTextFilter(item, feed) && matchesCategoryFilter(item, feed);
}

function matchesTextFilter(item: FeedItem, feed: Feed): boolean {
  return matchesFilter(feed.filters.text, (value) => {
    return item.title.includes(value) || item.content?.includes(value);
  });
}

function matchesCategoryFilter(item: FeedItem, feed: Feed): boolean {
  return matchesFilter(feed.filters.category, (value) => item.categories.includes(value));
}

function matchesFilter(filter: FeedFilter, predicate: (value: string) => boolean): boolean {
  if (!filter.values) return true; // If there is no actual filter, always match
  if (filter.matchAll) return filter.values.every(predicate);
  else return filter.values.some(predicate);
}

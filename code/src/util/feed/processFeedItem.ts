import { Item } from 'feedparser';
import { MAX_CHARACTERS_SPEECH } from '../constants';
import { Feed, FeedItem } from '../../logic/Feed';
import { truncateAll } from '../truncateAll';

export function processFeedItem(
  item: Item,
  feed: Feed,
  clean: { (text: string): string }
) {
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

  // If the fields to read content are specified, use them
  if (feed.readFields) {
    console.log('Fields specified. Using: ' + JSON.stringify(feed.readFields));

    feed.readFields.forEach((field, _, arr) => {
      const text: string = feedItem[field.name];

      const maxItemCharacters = Math.floor(MAX_CHARACTERS_SPEECH / arr.length);

      let truncatedText: string[];

      if (field.truncateAt || text.length > maxItemCharacters) {
        const truncateAt = field.truncateAt ?? maxItemCharacters;
        console.log(
          `Field "${field.name}" truncated at ${truncateAt} characters`
        );
        truncatedText = truncateAll(text, truncateAt, { readable: true });
        feedItem.content.push(...truncatedText);
      } else {
        feedItem.content.push(text);
      }
    });
  } else {
    console.log('No fields specified. Using summary/description by default');

    const summary = feedItem.summary || feedItem.description;
    let truncatedSummary: string[];
    if (feed.truncateSummaryAt || summary.length > MAX_CHARACTERS_SPEECH) {
      truncatedSummary = truncateAll(summary, feed.truncateSummaryAt, {
        readable: true,
      });
      console.log(`Summary truncated at ${feed.truncateSummaryAt} characters`);
      feedItem.content = truncatedSummary;
    } else {
      feedItem.content = [summary];
    }
  }

  return feedItem;
}

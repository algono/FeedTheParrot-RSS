import FeedParser, { Item } from 'feedparser';
import fetch from 'node-fetch';
import { initNewInstance } from '../localization';
import { Feed, FeedItems } from '../../logic/Feed';
import { getLangFormatter } from '../langFormatter';
import { checkFeedSize } from './checkFeedSize';
import { processFeedItem } from './processFeedItem';

export function getItems(
  feed: Feed,
  defaultLocale: string
): Promise<FeedItems> {
  return new Promise<FeedItems>((resolve, reject) => {
    const req = fetch(feed.url);
    const feedparser = new FeedParser({ feedurl: feed.url });
    const items: FeedItems = {
      list: [],
    };

    req.then(
      function (res) {
        if (res.ok) {
          res.body.pipe(feedparser); // res.body is a stream
        } else {
          reject(Error('Bad status code'));
        }
      },
      function (err) {
        reject(err);
      }
    );

    // Received stream. Read them, process them, and save them in a list
    feedparser.on('readable', async function () {
      const stream: FeedParser = this;
      const meta = stream.meta;

      // Get localization function for the feed's language
      const locale: string = feed.language || meta.language;
      const t = await initNewInstance(locale);

      // If the locale of the feed doesn't match the one on the device, use SSML to change the voice and language
      if (locale !== defaultLocale) {
        items.langFormatter = getLangFormatter(t);
      }

      // Get ampersand replacement for that language (i.e: 'and' in English)
      const ampersandReplacement = t('AMPERSAND');

      let item: Item;
      while ((item = stream.read())) {
        const feedItem = processFeedItem(item, feed, ampersandReplacement);
        items.list.push(feedItem);

        // If there is an item limit set and it has been surpassed, consume the stream and break the loop
        if (feed.itemLimit && items.list.length >= feed.itemLimit) {
          stream.resume(); // It turns out the resume method does the best job at consuming the stream
          break;
        }
      }
    });

    // All items have been parsed.
    feedparser.on('end', function () {
      try {
        checkFeedSize(items, feed);
      } catch (err) {
        reject(err);
      }

      items.list.sort(function (a, b) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      resolve(items);
    });

    feedparser.on('error', function (err: any) {
      reject(err);
    });
  });
}

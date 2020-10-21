import FeedParser, { Item } from 'feedparser';
import { AllHtmlEntities as entities } from 'html-entities';
import fetch from 'node-fetch';
import striptags from 'striptags';
import util from 'util';
import { init } from '../util/localization';
import {
  PAUSE_BETWEEN_FIELDS_CARD,
  PAUSE_BETWEEN_FIELDS,
  MAX_CHARACTERS,
} from '../util/constants';

export interface GetItemsOptions {
  forceUpdate?: boolean;
  itemLimit?: number;
}

export interface ItemField {
  name: string;
  truncateAt: number;
}

interface FeedItemAlexaReads {
  title: string;
  content: string;
}

export interface FeedItem {
  title: string;
  description: string;
  summary: string;
  date: string;
  link: string;
  imageUrl?: string;

  alexaReads?: FeedItemAlexaReads;
  cardReads?: string;

  index?: number;
}

export class Feed {
  name: string;
  readonly url: string;
  language?: string;

  readFields?: ItemField[];
  truncateSummaryAt?: number;
  itemLimit?: number;

  constructor(name: string, url: string, language?: string) {
    this.name = name;
    this.url = url;
    this.language = language;
  }

  // NOTE: Cannot have methods within the class because sessionAttributes messes with them and makes them disappear from the object
}

export function getItems(
  feed: Feed,
  defaultLocale: string,
  options?: GetItemsOptions
): Promise<FeedItem[]> {
  return new Promise<FeedItem[]>((resolve, reject) => {
    const req = fetch(feed.url);
    const feedparser = new FeedParser({ feedurl: feed.url });
    const items: FeedItem[] = [];

    req.then(
      function (res) {
        console.log('Is Get Feed Status OK = ' + res.ok);
        console.log('Get Feed Status = ' + res.status);
        if (res.status === 200) {
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
      const t = await init(locale);

      // If the locale of the feed doesn't match the one on the device, use SSML to change the voice and language
      let langFormatter: string;
      if (locale !== defaultLocale) {
        langFormatter = `<voice name="${t(
          'DEFAULT_VOICE'
        )}"><lang xml:lang="${t('DEFAULT_VOICE_LOCALE')}">%s</lang></voice>`;
      }

      // Get ampersand replacement for that language (i.e: 'and' in English)
      const ampersandReplacement = t('AMPERSAND');

      function clean(text: string): string {
        let cleanedText: string;

        cleanedText = text;
        cleanedText = entities.decode(striptags(cleanedText));
        cleanedText = cleanedText.trim();
        cleanedText = cleanedText
          .replace(/[&]/g, ampersandReplacement)
          .replace(/[<>]/g, '');

        return cleanedText;
      }

      const itemLimit = options?.itemLimit ?? feed.itemLimit;

      let item: Item;
      while ((item = stream.read())) {
        const feedItem = processFeedItem(item, feed, clean, langFormatter);
        items.push(feedItem);

        // If there is an item limit set and it has been surpassed, consume the stream and break the loop
        if (itemLimit && items.length >= itemLimit) {
          stream.resume(); // It turns out the resume method does the best job at consuming the stream
          break;
        }
      }
    });

    // All items parsed. Return them
    feedparser.on('end', function () {
      items.sort(function (a, b) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      items.forEach(function (item, index) {
        item.index = index;
      });

      resolve(items);
    });

    feedparser.on('error', function (err: any) {
      reject(err);
    });
  });
}

function processFeedItem(
  item: Item,
  feed: Feed,
  clean: { (text: string): string },
  langFormatter: string
) {
  //console.log('Get Feed Item = ' + JSON.stringify(item));

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
  };

  const alexaReads: FeedItemAlexaReads = {
    title: feedItem.title,
    content: '',
  };

  let cardReads = '';

  // If the fields to read content are specified, use them
  if (feed.readFields) {
    console.log('Fields specified. Using: ' + JSON.stringify(feed.readFields));

    feed.readFields.forEach((field, _, arr) => {
      let text: string = feedItem[field.name];
      
      const maxItemCharacters = Math.floor(MAX_CHARACTERS / arr.length);

      if (field.truncateAt || text.length > maxItemCharacters) {
        const truncateAt = field.truncateAt ?? maxItemCharacters;
        console.log(
          `Field "${field.name}" truncated at ${truncateAt} characters`
        );
        text = truncate(text, truncateAt);
      }
      alexaReads.content += text;
      alexaReads.content += PAUSE_BETWEEN_FIELDS;

      cardReads += text;
      cardReads += PAUSE_BETWEEN_FIELDS_CARD;
    });
  } else {
    console.log('No fields specified. Using summary/description by default');

    let summary = feedItem.summary || feedItem.description;
    if (feed.truncateSummaryAt || summary.length > MAX_CHARACTERS) {
      console.log(`Summary truncated at ${feed.truncateSummaryAt} characters`);
      summary = truncate(summary, feed.truncateSummaryAt);
    }
    alexaReads.content = summary;
    cardReads += summary;
  }

  if (langFormatter) {
    alexaReads.title = util.format(langFormatter, alexaReads.title);
    alexaReads.content = util.format(langFormatter, alexaReads.content);
  }

  console.log('Alexa reads: ' + JSON.stringify(alexaReads));
  console.log('Card reads: ' + cardReads);

  feedItem.alexaReads = alexaReads;
  feedItem.cardReads = cardReads;

  return feedItem;
}

// HELPER FUNCTIONS

/**
 * It truncates the string to the last phrase in order to not surpass n characters total.
 *
 * @param {string} str The original string
 * @param {number} n The max number of characters (must be a positive integer)
 */
function truncate(str: string, n: number) {
  if (str.length <= n) return str;
  const subString = str.substr(0, n);
  const lastPhraseEnd = subString.lastIndexOf('. ');
  if (lastPhraseEnd >= 0) {
    return subString.substr(0, lastPhraseEnd + 1);
  } else {
    const lastSpace = subString.lastIndexOf(' ');
    if (lastSpace >= 0) {
      return subString.substr(0, lastSpace) + '...';
    } else {
      return subString.substr(0, n - 3) + '...';
    }
  }
}

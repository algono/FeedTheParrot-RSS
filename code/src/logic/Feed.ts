import FeedParser, { Item } from 'feedparser';
import { AllHtmlEntities as entities } from 'html-entities';
import fetch from 'node-fetch';
import striptags from 'striptags';
import util from 'util';
import { initNewInstance, TFunction } from '../util/localization';
import { MAX_CHARACTERS_SPEECH, MAX_RESPONSE_LENGTH } from '../util/constants';
import { FeedIsTooLongError } from '../intents/Error';

export interface GetItemsOptions {
  forceUpdate?: boolean;
  itemLimit?: number;
}

export interface ItemField {
  name: string;
  truncateAt: number;
}

export interface FeedItem {
  title: string;
  description: string;
  summary: string;
  date: string;
  link: string;
  imageUrl?: string;

  content?: string[];

  index?: number;
}

export interface FeedItems {
  list: FeedItem[];
  langFormatter?: string;
}

export interface FeedData {
  readonly url: string;
  language?: string;

  readFields?: ItemField[];
  truncateSummaryAt?: number;
  itemLimit?: number;
}

export interface Feed extends FeedData {
  name: string;
}

export function getItems(
  feed: Feed,
  defaultLocale: string,
  options?: GetItemsOptions
): Promise<FeedItems> {
  return new Promise<FeedItems>((resolve, reject) => {
    const req = fetch(feed.url);
    const feedparser = new FeedParser({ feedurl: feed.url });
    const items: FeedItems = {
      list: [],
    };

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
      const t = await initNewInstance(locale);

      // If the locale of the feed doesn't match the one on the device, use SSML to change the voice and language
      if (locale !== defaultLocale) {
        items.langFormatter = getLangFormatter(t);
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
        const feedItem = processFeedItem(item, feed, clean);
        items.list.push(feedItem);

        // If there is an item limit set and it has been surpassed, consume the stream and break the loop
        if (itemLimit && items.list.length >= itemLimit) {
          stream.resume(); // It turns out the resume method does the best job at consuming the stream
          break;
        }
      }
    });

    // All items have been parsed.
    feedparser.on('end', function () {
      console.log('Checking feed size...'); // Not sure why, but it seems to only work if there is something before checking the feed size

      const feedSize = JSON.stringify(items.list).length;

      console.log('Feed size: ' + feedSize);

      if (
        feedSize >
        calculateMaxFeedSize(
          calculateMaxCharactersInFeedContent(
            items.list,
            feed.truncateSummaryAt
          )
        )
      ) {
        console.log('Feed is too large for max size calculation');
        reject(new FeedIsTooLongError());
      }

      items.list.sort(function (a, b) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      items.list.forEach(function (item, index) {
        item.index = index;
      });

      resolve(items);
    });

    feedparser.on('error', function (err: any) {
      reject(err);
    });
  });
}

export function getLangFormatter(t: TFunction): string {
  return `<voice name="${t(
    'DEFAULT_VOICE'
  )}"><lang xml:lang="${t('DEFAULT_VOICE_LOCALE')}">%s</lang></voice>`;
}

// This value will probably be tweaked in the future
const CHARACTER_MARGIN = 0;

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

function processFeedItem(
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
        truncatedText = truncateAll(text, truncateAt);
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
      truncatedSummary = truncateAll(summary, feed.truncateSummaryAt);
      console.log(`Summary truncated at ${feed.truncateSummaryAt} characters`);
      feedItem.content = truncatedSummary;
    } else {
      feedItem.content = [summary];
    }
  }

  return feedItem;
}

export function applyLangFormatter(
  target: string,
  langFormatter: string
) {
  if (langFormatter) {
    return util.format(langFormatter, target);
  } else {
    return target;
  }
}

// Max characters between last phrase end and truncated string end
const MAX_LAST_PHRASE_DISTANCE_CHARS = 20;

function truncateAll(str: string, n: number) {
  const res: string[] = [];
  let remaining = str;
  while (remaining) {
    const current = truncate(remaining, n);
    res.push(current.str);
    remaining = remaining.substring(current.len);
  }

  return res;
}

/**
 * It truncates the string to the last phrase in order to not surpass n characters total.
 *
 * @param {string} str The original string
 * @param {number} len The max number of characters (must be a positive integer)
 */
function truncate(str: string, len: number) {
  // Check that the length is valid
  if (len <= 0)
    throw new RangeError('The truncate length must be greater than zero');
  if (!Number.isInteger(len))
    throw new RangeError('The truncate length must be an integer');

  let res: { str: string; len: number };

  if (str.length <= len) {
    res = { str, len: str.length };
  } else {
    let subString = str.substr(0, len);
    const lastPhraseEnd = subString.lastIndexOf('. ');
    if (
      lastPhraseEnd >= 0 &&
      lastPhraseEnd >= len - MAX_LAST_PHRASE_DISTANCE_CHARS
    ) {
      res = {
        str: subString.substr(0, lastPhraseEnd + 1),
        len: lastPhraseEnd + 1,
      };
    } else {
      if (len > 2) subString = subString.substr(0, len - 2);
      const lastSpace = subString.lastIndexOf(' ');
      if (lastSpace > 0) {
        res = {
          str: subString.substr(0, lastSpace) + '...',
          len: lastSpace,
        };
      } else {
        if (len > 3) {
          res = {
            str: subString.substr(0, len - 3) + '...',
            len: len - 3,
          };
        } else {
          res = {
            str: subString,
            len: len > 2 ? len - 2 : len,
          };
        }
      }
    }
  }

  return res;
}

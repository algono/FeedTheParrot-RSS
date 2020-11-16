import { EventEmitter } from 'events';
import fc from 'fast-check';
import FeedParser from 'feedparser';
import { mocked } from 'ts-jest/utils';
import { anyOfClass, instance, mock, when } from 'ts-mockito';
import { FeedIsTooLongError } from '../../../src/intents/Error';
import { Feed, FeedItem } from '../../../src/logic/Feed';
import { checkFeedSize } from '../../../src/util/feed/checkFeedSize';
import { getItems } from '../../../src/util/feed/getItems';
import { processFeedItem } from '../../../src/util/feed/processFeedItem';
import { getLangFormatter } from '../../../src/util/langFormatter';
import { init, initNewInstance } from '../../../src/util/localization';
import {
  feedItemRecord,
  feedRecord,
} from '../../helpers/fast-check/arbitraries/feed';
import { itemRecord } from '../../helpers/fast-check/arbitraries/feedParser';
import { availableLocales, testInAllLocales } from '../../helpers/helperTests';
import {
  FeedParserEventIntervals,
  FeedParserEvents,
  mockFeedParser,
  mockNodeFetch,
  mockNodeFetchRejects,
} from '../../helpers/mocks/mockFeedParser';

jest.mock('feedparser');
jest.mock('node-fetch');

jest.mock('../../../src/util/localization');
jest.mock('../../../src/util/langFormatter');
jest.mock('../../../src/util/feed/processFeedItem');
jest.mock('../../../src/util/feed/checkFeedSize');

beforeEach(() => jest.resetAllMocks());

testInAllLocales(
  'pipes response body stream into feedparser when fetch response is ok'
)((locale, done) =>
  fc.assert(
    fc.asyncProperty(fc.integer({ min: 200, max: 299 }), async (statusCode) => {
      const { responseBodyMock } = mockNodeFetch({ statusCode });

      when(responseBodyMock.pipe(anyOfClass(FeedParser))).thenCall(() =>
        done()
      );

      await getItems(instance(mock<Feed>()), locale);
    })
  )
);

testInAllLocales('throws error when fetch response is not ok')(
  async (locale) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 300, max: 999 }),
        async (statusCode) => {
          mockNodeFetch({ statusCode });
          await expect(
            getItems(instance(mock<Feed>()), locale)
          ).rejects.toBeInstanceOf(Error);
        }
      )
    );
  }
);

testInAllLocales(
  'rejects with fetch response reason when fetch response is rejected'
)(async (locale) => {
  const expectedError = instance(mock<Error>());
  mockNodeFetchRejects(expectedError);
  await getItems(instance(mock<Feed>()), locale)
    .then(() => fail('The promise was not rejected'))
    .catch((err) => {
      expect(err === expectedError).toBe(true);
    });
});

describe('feedparser related tests', () => {
  let feedParserMock: FeedParser,
    eventEmitter: EventEmitter,
    intervals: FeedParserEventIntervals,
    setEventInterval: (event: FeedParserEvents) => void,
    setErrorEventInterval: (expectedError: Error) => void,
    cleanupEventEmitter: () => EventEmitter;

  const tMock = jest.fn<string, string[]>();

  const setupFeedParser = () => {
    const res = mockFeedParser();
    feedParserMock = res.feedParserMock;
    eventEmitter = res.eventEmitter;
    intervals = res.intervals;
    setEventInterval = res.setEventInterval;
    setErrorEventInterval = res.setErrorEventInterval;
    cleanupEventEmitter = () => eventEmitter.removeAllListeners();

    mocked(initNewInstance).mockResolvedValue(tMock);
  };

  beforeEach(setupFeedParser);

  testInAllLocales(
    'rejects with feedparser response reason when feedparser emits an error'
  )(async (locale) => {
    const expectedError = instance(mock<Error>());
    setErrorEventInterval(expectedError);

    await getItems(instance(mock<Feed>()), locale)
      .then(() => fail('The promise was not rejected'))
      .catch((err) => {
        expect(err === expectedError).toBe(true);
      });

    clearInterval(intervals.error);
  });

  testInAllLocales(
    "inits a new localization instance based on the feed's locale"
  )(async (locale) => {
    mocked(init).mockImplementation(() =>
      fail(
        'Should init a new localization instance, not replace the current one'
      )
    );

    const initNewInstanceMock = mocked(initNewInstance);

    const feedMock = mock<Feed>();
    when(feedMock.language).thenReturn(locale);

    initNewInstanceMock.mockClear();

    setEventInterval('readable');
    await getItems(instance(feedMock), null);

    expect(initNewInstanceMock).toHaveBeenCalledWith(locale);
  });

  testInAllLocales(
    'adds a lang formatter to the result based on the locale if it does not match the one on the feed'
  )(async (locale) => {
    await fc.assert(
      fc.asyncProperty(
        feedRecord({
          locales: availableLocales.filter((value) => value !== locale),
        }),
        fc.string({ minLength: 1 }),
        async (feed, langFormatter) => {
          cleanupEventEmitter();

          mocked(getLangFormatter).mockImplementation((t) => {
            if (t === tMock) {
              return langFormatter;
            } else {
              return null;
            }
          });

          setEventInterval('readable');
          const items = await getItems(feed, locale);

          expect(items.langFormatter).toEqual(langFormatter);
        }
      )
    );
  });
  testInAllLocales(
    'does not add a lang formatter to the result if the locale matches the one on the feed'
  )(async (locale) => {
    await fc.assert(
      fc.asyncProperty(
        feedRecord({
          locales: [locale],
        }),
        async (feed) => {
          cleanupEventEmitter();

          setEventInterval('readable');
          const items = await getItems(feed, locale);

          expect(mocked(getLangFormatter)).not.toHaveBeenCalled();
          expect(items.langFormatter).toBeUndefined();
        }
      )
    );
  });

  function setupReadable(
    itemList: FeedParser.Item[],
    feedItemList: FeedItem[],
    ampersandReplacement: string
  ) {
    tMock.mockReset();

    let processFeedItemMock = mocked(processFeedItem);
    processFeedItemMock.mockReset();

    setupFeedParser();

    tMock.mockImplementation((key) => {
      if (key === 'AMPERSAND') {
        return ampersandReplacement;
      } else {
        return null;
      }
    });

    // Chaining different return values for each call with ts-mockito creates a memory leak
    // So, as a workaround, we wrap it in a jest mock, which does not leak
    let readMock = jest.fn();
    for (const item of itemList) {
      readMock = readMock.mockReturnValueOnce(item);
    }
    when(feedParserMock.read()).thenCall(() => readMock());

    for (const item of feedItemList) {
      processFeedItemMock = processFeedItemMock.mockReturnValueOnce(item);
    }
    return { readMock, processFeedItemMock };
  }

  testInAllLocales(
    'processes all items and returns a list of the results sorted by date in descending order'
  )(async (locale) => {
    await fc.assert(
      fc.asyncProperty(
        feedRecord({ hasItemLimit: 'never' }),
        fc.array(itemRecord(), { minLength: 1 }).chain((itemList) =>
          fc.tuple(
            fc.constant(itemList),
            fc.array(feedItemRecord(), {
              minLength: itemList.length,
              maxLength: itemList.length,
            })
          )
        ),
        fc.lorem({ maxCount: 1 }),
        async (feed, [itemList, feedItemList], ampersandReplacement) => {
          const { processFeedItemMock } = setupReadable(
            itemList,
            feedItemList,
            ampersandReplacement
          );

          setEventInterval('readable');
          const items = await getItems(feed, locale);

          expect(items.list.length).toEqual(itemList.length);
          expect(processFeedItemMock).toHaveBeenCalledTimes(itemList.length);

          for (let i = 0; i < itemList.length; i++) {
            const expectedItem = itemList[i];
            expect(processFeedItemMock).toHaveBeenNthCalledWith(
              i + 1,
              expectedItem,
              feed,
              ampersandReplacement
            );
          }

          // Check that items list contains all elements from feedItemList, ignoring order
          expect(items.list).toEqual(expect.arrayContaining(feedItemList));

          expect(
            // List is sorted by date in descending order
            items.list.every((item, index, list) => {
              return (
                index === 0 ||
                new Date(list[index - 1].date).getTime() >=
                  new Date(item.date).getTime()
              );
            })
          ).toBe(true);
        }
      )
    );
  });
  testInAllLocales(
    'consumes the stream and breaks the loop if there is an item limit set and it has been reached'
  )(async (locale) => {
    await fc.assert(
      fc.asyncProperty(
        // Reasonable max item limit to avoid really large arrays making javascript run out of memory
        feedRecord({ hasItemLimit: 'always', maxItemLimit: 5 }).chain((feed) =>
          fc
            .array(itemRecord(), { minLength: feed.itemLimit })
            .chain((itemList) =>
              fc.tuple(
                fc.constant(feed),
                fc.constant(itemList),
                fc.array(feedItemRecord(), {
                  minLength: itemList.length,
                  maxLength: itemList.length,
                })
              )
            )
        ),
        fc.lorem({ maxCount: 1 }),
        async ([feed, itemList, feedItemList], ampersandReplacement) => {
          const { readMock } = setupReadable(
            itemList,
            feedItemList,
            ampersandReplacement
          );
          when(feedParserMock.resume()).thenCall(() => readMock.mockReset());

          setEventInterval('readable');
          const items = await getItems(feed, locale);

          expect(items.list.length).toEqual(feed.itemLimit);
        }
      )
    );
  });

  testInAllLocales(
    'throws an error if the feed is too long for Alexa to read (according to checkFeedSize)'
  )(async (locale) => {
    await fc.assert(
      fc.asyncProperty(feedRecord(), async (feed) => {
        cleanupEventEmitter();

        mocked(checkFeedSize).mockImplementation(() => {
          throw new FeedIsTooLongError();
        });

        setEventInterval('end');
        await expect(getItems(feed, locale)).rejects.toBeInstanceOf(
          FeedIsTooLongError
        );
      })
    );
  });

  afterEach(() => {
    for (const key in intervals) {
      clearInterval(intervals[key]);
      delete intervals[key];
    }
  });
});

import { EventEmitter } from 'events';
import fc from 'fast-check';
import FeedParser from 'feedparser';
import { mocked } from 'ts-jest/utils';
import { anyOfClass, instance, mock, when } from 'ts-mockito';
import { Feed } from '../../../src/logic/Feed';
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
    setReadableInterval: () => FeedParserEventIntervals,
    cleanupEventEmitter: () => EventEmitter;

  const tMock = jest.fn();

  const setupFeedParser = () => {
    const res = mockFeedParser();
    feedParserMock = res.feedParserMock;
    eventEmitter = res.eventEmitter;
    intervals = res.intervals;
    setReadableInterval = res.setReadableInterval;
    cleanupEventEmitter = () => eventEmitter.removeAllListeners();

    mocked(initNewInstance).mockResolvedValue(tMock);
  };

  beforeEach(setupFeedParser);

  testInAllLocales(
    'rejects with feedparser response reason when feedparser emits an error'
  )(async (locale) => {
    const expectedError = instance(mock<Error>());

    intervals.error = setInterval(() => {
      if (eventEmitter.listeners('error').length > 0)
        eventEmitter.emit('error', expectedError);
    }, 0);

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

    setReadableInterval();
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

          setReadableInterval();
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

          setReadableInterval();
          const items = await getItems(feed, locale);

          expect(mocked(getLangFormatter)).not.toHaveBeenCalled();
          expect(items.langFormatter).toBeUndefined();
        }
      )
    );
  });
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

          setReadableInterval();
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
  test.todo(
    'consumes the stream and breaks the loop if there is an item limit set and it has been surpassed'
  );

  test.todo('throws an error if the feed is too long for Alexa to read');

  afterEach(() => {
    for (const key in intervals) {
      clearInterval(intervals[key]);
      delete intervals[key];
    }
  });
});

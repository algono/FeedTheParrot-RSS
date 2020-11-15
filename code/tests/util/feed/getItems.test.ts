import { EventEmitter } from 'events';
import fc from 'fast-check';
import FeedParser from 'feedparser';
import { mocked } from 'ts-jest/utils';
import { anyOfClass, instance, mock, when } from 'ts-mockito';
import { Feed } from '../../../src/logic/Feed';
import { getItems } from '../../../src/util/feed/getItems';
import { getLangFormatter } from '../../../src/util/langFormatter';
import { init, initNewInstance } from '../../../src/util/localization';
import { feedRecord } from '../../helpers/fast-check/arbitraries/feed';
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
  let eventEmitter: EventEmitter,
    intervals: FeedParserEventIntervals,
    setReadableInterval: () => FeedParserEventIntervals,
    cleanupEventEmitter: () => EventEmitter;

  beforeEach(() => {
    const res = mockFeedParser();
    eventEmitter = res.eventEmitter;
    intervals = res.intervals;
    setReadableInterval = res.setReadableInterval;
    cleanupEventEmitter = () => eventEmitter.removeAllListeners();
  });

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

    const initNewInstanceMock = mocked(initNewInstance).mockResolvedValue(
      jest.fn()
    );

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

          const tMock = jest.fn();
          mocked(initNewInstance).mockResolvedValue(tMock);

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
  test.todo(
    'does not add a lang formatter to the result if the locale matches the one on the feed'
  );
  test.todo('processes all items and pushes the results to an items list');
  test.todo(
    'consumes the stream and breaks the loop if there is an item limit set and it has been surpassed'
  );

  test.todo('returns a list of items sorted by date in descending order');
  test.todo('throws an error if the feed is too long for Alexa to read');

  afterEach(() => {
    for (const key in intervals) {
      clearInterval(intervals[key]);
      delete intervals[key];
    }
  });
});

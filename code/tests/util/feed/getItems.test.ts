import { EventEmitter } from 'events';
import fc from 'fast-check';
import FeedParser from 'feedparser';
import { anyOfClass, instance, mock, when } from 'ts-mockito';
import { Feed } from '../../../src/logic/Feed';
import { getItems } from '../../../src/util/feed/getItems';
import { testInAllLocales } from '../../helpers/helperTests';
import {
  FeedParserEventIntervals,
  mockFeedParser,
  mockNodeFetch,
  mockNodeFetchRejects,
} from '../../helpers/mocks/mockFeedParser';

jest.mock('feedparser');
jest.mock('node-fetch');

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
  let eventEmitter: EventEmitter, intervals: FeedParserEventIntervals;
  beforeAll(() => {
    const res = mockFeedParser();
    eventEmitter = res.eventEmitter;
    intervals = res.intervals;
  });

  beforeEach(() => eventEmitter.removeAllListeners());

  testInAllLocales(
    'rejects with feedparser response reason when feedparser emits an error'
  )(async (locale) => {
    const expectedError = instance(mock<Error>());

    intervals.error = setInterval(() => {
      if (eventEmitter.listeners('error').length > 0)
        eventEmitter.emit('error', expectedError);
    }, 10);

    await getItems(instance(mock<Feed>()), locale)
      .then(() => fail('The promise was not rejected'))
      .catch((err) => {
        expect(err === expectedError).toBe(true);
      });

    clearInterval(intervals.error);
  });

  test.todo(
    'adds a lang formatter to the result based on the locale if it does not match the one on the feed'
  );
  test.todo(
    'does not add a lang formatter to the result if the locale matches the one on the feed'
  );
  test.todo(
    'processes all items and pushes the results to an items list'
  );
  test.todo(
    'consumes the stream and breaks the loop if there is an item limit set and it has been surpassed'
  );

  test.todo(
    'returns a list of items sorted by date in descending order'
  );
  test.todo(
    'throws an error if the feed is too long for Alexa to read'
  );

  afterEach(() => {
    for (const key in intervals) {
      clearInterval(intervals[key]);
      delete intervals[key];
    }
  });
});

import fc from 'fast-check';
import FeedParser from 'feedparser';
import { anyOfClass, mock, when } from 'ts-mockito';
import { Feed } from '../../../src/logic/Feed';
import { getItems } from '../../../src/util/feed/getItems';
import { testInAllLocales } from '../../helpers/helperTests';
import {
  //mockFeedParser,
  mockNodeFetch,
} from '../../helpers/mocks/mockFeedParser';

jest.mock('feedparser');
jest.mock('node-fetch');

//const { intervals } = mockFeedParser();

testInAllLocales(
  'getItems pipes response body stream into feedparser when fetch response is ok'
)((locale, done) =>
  fc.assert(
    fc.asyncProperty(fc.integer({ min: 200, max: 299 }), async (statusCode) => {
      const { responseBodyMock } = mockNodeFetch({ statusCode });

      when(responseBodyMock.pipe(anyOfClass(FeedParser))).thenCall(() =>
        done()
      );

      await getItems(mock<Feed>(), locale);
    })
  )
);

testInAllLocales('getItems throws error when fetch response is not ok')(
  async (locale) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 300, max: 999 }),
        async (statusCode) => {
          mockNodeFetch({ statusCode });
          await expect(getItems(mock<Feed>(), locale)).rejects.toBeInstanceOf(
            Error
          );
        }
      )
    );
  }
);

test.todo('getItems tests');
/*
afterAll(() => {
  for (const key in intervals) {
    clearInterval(intervals[key]);
  }
});
*/

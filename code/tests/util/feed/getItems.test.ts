import { mockFeedParser } from '../../helpers/mocks/mockFeedParser';

jest.mock('feedparser');
jest.mock('node-fetch');

const { intervals } = mockFeedParser();

test.todo('getItems tests');

afterAll(() => {
  for (const key in intervals) {
    clearInterval(intervals[key]);
  }
});

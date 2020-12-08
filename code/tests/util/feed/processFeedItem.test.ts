import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { MAX_CHARACTERS_SPEECH } from '../../../src/util/constants';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import {
  getContent,
  processFeedItem,
} from '../../../src/util/feed/processFeedItem';
import { truncateAll } from '../../../src/util/truncateAll';
import {
  feedItemRecord,
  feedRecord,
} from '../../helpers/fast-check/arbitraries/feed';
import { itemRecord } from '../../helpers/fast-check/arbitraries/feedParser';
import { mockArbitrary } from '../../helpers/fast-check/arbitraries/mockArbitrary';
import { lastCallTo } from '../../helpers/jest/mockInstanceHelpers';
import { mockItemArbitrary } from '../../helpers/mocks/mockItemArbitrary';

jest.mock('../../../src/util/feed/cleanHtml');
jest.mock('../../../src/util/truncateAll');

beforeEach(() => {
  jest.resetAllMocks();
  mocked(cleanHtml).mockImplementation((text) => text);
});

test('properly cleans the title, description and summary', () => {
  fc.assert(
    fc.property(
      itemRecord,
      feedRecord(),
      fc.lorem({ maxCount: 1 }),
      fc.record(
        {
          title: fc.lorem(),
          description: fc.lorem({ mode: 'sentences' }),
          summary: fc.lorem({ mode: 'sentences' }),
        },
        { withDeletedKeys: false }
      ),
      (item, feed, ampersandReplacement, cleanData) => {
        fc.pre(
          item.title !== cleanData.title &&
            item.description !== cleanData.description &&
            item.summary !== cleanData.summary
        );

        mocked(cleanHtml).mockClear();

        const cleanMap = {
          [item.title]: cleanData.title,
          [item.description]: cleanData.description,
          [item.summary]: cleanData.summary,
        };
        mocked(cleanHtml).mockImplementation((text) => cleanMap[text]);

        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(cleanHtml).toHaveBeenCalledTimes(3);

        expect(cleanHtml).toHaveBeenCalledWith(
          item.title,
          ampersandReplacement
        );
        expect(cleanHtml).toHaveBeenCalledWith(
          item.description,
          ampersandReplacement
        );
        expect(cleanHtml).toHaveBeenCalledWith(
          item.summary,
          ampersandReplacement
        );

        expect(feedItem.title).toEqual(cleanData.title);
        expect(feedItem.description).toEqual(cleanData.description);
        expect(feedItem.summary).toEqual(cleanData.summary);
      }
    )
  );
});

test('returns the date in UTC string format', () => {
  fc.assert(
    fc.property(
      itemRecord,
      feedRecord(),
      fc.lorem({ maxCount: 1 }),
      (item, feed, ampersandReplacement) => {
        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(feedItem.date).toEqual(new Date(item.date).toUTCString());
      }
    )
  );
});

test('returns the whole content if it does not have to be truncated', () => {
  fc.assert(
    fc.property(
      mockItemArbitrary({ contentSurpassesMaxCharacters: 'never' }),
      feedRecord({ hasTruncateContentAt: 'never' }),
      fc.lorem({ maxCount: 1 }),
      (item, feed, ampersandReplacement) => {
        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(truncateAll).not.toHaveBeenCalled();

        expect(feedItem.content.length).toEqual(1);
        expect(feedItem.content[0]).toBe(getContent(feed, item));
      }
    )
  );
});

test('returns the readable result of truncating all content if the feed has the truncateContentAt attribute defined', () => {
  fc.assert(
    fc.property(
      itemRecord,
      feedRecord({ hasTruncateContentAt: 'always' }),
      fc.lorem({ maxCount: 1 }),
      fc.array(fc.lorem({ mode: 'sentences' }), { minLength: 1 }),
      (item, feed, ampersandReplacement, expectedResult) => {
        mocked(truncateAll).mockClear();
        mocked(truncateAll).mockReturnValue(expectedResult);

        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(truncateAll).toHaveBeenCalledWith(
          getContent(feed, item),
          feed.truncateContentAt,
          { readable: true }
        );
        expect(feedItem.content).toEqual(expectedResult);
      }
    )
  );
});

test('returns the readable result of truncating all content if the content surpasses the max character count', () => {
  fc.assert(
    fc.property(
      mockItemArbitrary({ contentSurpassesMaxCharacters: 'always' }),
      feedRecord(),
      fc.lorem({ maxCount: 1 }),
      mockArbitrary<string[]>(),
      (item, feed, ampersandReplacement, expectedResult) => {
        mocked(truncateAll).mockClear();
        mocked(truncateAll).mockReturnValue(expectedResult);

        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(feedItem.content).toBe(expectedResult);

        const callToTruncateAll = lastCallTo(mocked(truncateAll));
        expect(callToTruncateAll[0]).toBe(getContent(feed, item));
        expect(callToTruncateAll[1]).toEqual(
          feed.truncateContentAt || MAX_CHARACTERS_SPEECH
        );
        expect(callToTruncateAll[2]).toMatchObject({ readable: true });
      }
    )
  );
});

describe('getContent', () => {
  test('If readFullContent is true, it prioritises the description and uses the summary as fallback', () => {
    fc.assert(
      fc.property(
        feedRecord({ readFullContentCustomArb: fc.constant(true) }),
        fc.oneof(itemRecord, feedItemRecord()),
        (feed, item) => {
          const content = getContent(feed, item);
          expect(content).toEqual(item.description || item.summary);
        }
      )
    );
  });
  test('If readFullContent is false, null or undefined, it prioritises the summary and uses the description as fallback', () => {
    fc.assert(
      fc.property(
        feedRecord({
          readFullContentCustomArb: fc.constantFrom(false, null, undefined),
        }),
        fc.oneof(itemRecord, feedItemRecord()),
        (feed, item) => {
          const content = getContent(feed, item);
          expect(content).toEqual(item.summary || item.description);
        }
      )
    );
  });
});

import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { MAX_CHARACTERS_SPEECH } from '../../../src/util/constants';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import { processFeedItem } from '../../../src/util/feed/processFeedItem';
import { truncateAll } from '../../../src/util/truncateAll';
import { feedRecord } from '../../helpers/fast-check/arbitraries/feed';
import { itemRecord } from '../../helpers/fast-check/arbitraries/feedParser';

jest.mock('../../../src/util/feed/cleanHtml');
jest.mock('../../../src/util/truncateAll');

beforeEach(() => {
  jest.resetAllMocks();
  mocked(cleanHtml).mockImplementation((text) => text);
});

test('properly cleans the title, description and summary', () => {
  fc.assert(
    fc.property(
      itemRecord(),
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
      itemRecord(),
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
      itemRecord({ contentSurpassesMaxCharacters: 'never' }),
      feedRecord({ hasTruncateContentAt: 'never' }),
      fc.lorem({ maxCount: 1 }),
      (item, feed, ampersandReplacement) => {
        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(truncateAll).not.toHaveBeenCalled();
        expect(feedItem.content).toEqual([item.summary || item.description]);
      }
    )
  );
});

test('returns the readable result of truncating all content if the feed has the truncateContentAt attribute defined', () => {
  fc.assert(
    fc.property(
      itemRecord(),
      feedRecord({ hasTruncateContentAt: 'always' }),
      fc.lorem({ maxCount: 1 }),
      fc.array(fc.lorem({ mode: 'sentences' }), { minLength: 1 }),
      (item, feed, ampersandReplacement, expectedResult) => {
        mocked(truncateAll).mockClear();
        mocked(truncateAll).mockReturnValue(expectedResult);

        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(truncateAll).toHaveBeenCalledWith(
          item.summary || item.description,
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
      itemRecord({ contentSurpassesMaxCharacters: 'always' }),
      feedRecord(),
      fc.lorem({ maxCount: 1 }),
      fc.array(fc.lorem({ mode: 'sentences' }), { minLength: 1 }),
      (item, feed, ampersandReplacement, expectedResult) => {
        mocked(truncateAll).mockClear();
        mocked(truncateAll).mockReturnValue(expectedResult);

        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(truncateAll).toHaveBeenCalledWith(
          item.summary || item.description,
          feed.truncateContentAt || MAX_CHARACTERS_SPEECH,
          { readable: true }
        );
        expect(feedItem.content).toEqual(expectedResult);
      }
    )
  );
});

import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import { processFeedItem } from '../../../src/util/feed/processFeedItem';
import { feedRecord } from '../../helpers/fast-check/arbitraries/feed';
import { itemRecord } from '../../helpers/fast-check/arbitraries/feedParser';

jest.mock('../../../src/util/feed/cleanHtml');
jest.mock('../../../src/util/truncateAll');

beforeEach(() => jest.resetAllMocks());

test('processFeedItem properly cleans the title, description and summary', () => {
  fc.assert(
    fc.property(
      itemRecord,
      feedRecord,
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

test('processFeedItem returns the date in UTC string format', () => {
  mocked(cleanHtml).mockImplementation((text) => text);

  fc.assert(
    fc.property(
      itemRecord,
      feedRecord,
      fc.lorem({ maxCount: 1 }),
      (item, feed, ampersandReplacement) => {
        const feedItem = processFeedItem(item, feed, ampersandReplacement);

        expect(feedItem.date).toEqual(new Date(item.date).toUTCString());
      }
    )
  );
});

test.todo(
  'processFeedItem returns the whole content if it does not have to be truncated'
);

test.todo(
  'processFeedItem returns the readable result of truncating all content if it has to be truncated'
);

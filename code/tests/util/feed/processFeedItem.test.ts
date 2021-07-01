import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { MAX_CHARACTERS_SPEECH } from '../../../src/util/constants';
import { cleanHtml } from '../../../src/util/feed/cleanHtml';
import {
  getContent,
  matchesFilters,
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
      itemRecord(),
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
        fc.oneof(
          itemRecord({ hasDescription: 'sometimes' }),
          feedItemRecord({ hasDescription: 'sometimes' })
        ),
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
        fc.oneof(
          itemRecord({ hasSummary: 'sometimes' }),
          feedItemRecord({ hasSummary: 'sometimes' })
        ),
        (feed, item) => {
          const content = getContent(feed, item);
          expect(content).toEqual(item.summary || item.description);
        }
      )
    );
  });
});

describe('matchesFilters', () => {
  function testFilter(
    name: string,
    expectedResult: boolean,
    config?: {
      feedRecordConfig?: Parameters<typeof feedRecord>[0];
      readingContent?: boolean;
    }
  ) {
    return test(name, () =>
      fc.assert(
        fc.property(
          feedRecord(config.feedRecordConfig),
          feedItemRecord({ readingContent: config?.readingContent }),
          (feed, item) => {
            const res = matchesFilters(item, feed);
            expect(res).toEqual(expectedResult);
          }
        )
      )
    );
  }

  testFilter(
    'If the feed has an empty filters property, it should return true',
    true,
    {
      feedRecordConfig: {
        hasFilters: false,
        hasTextFilter: 'never',
        hasCategoryFilter: 'never',
      },
    }
  );

  testFilter(
    'If the feed only has empty filters, it should return true',
    true,
    {
      feedRecordConfig: {
        hasTextFilter: 'never',
        hasCategoryFilter: 'never',
      },
    }
  );

  type FilterMatchesType = 'all' | 'some' | 'none' | 'except-all';

  describe('text', () => {
    function testFilter(
      name: string,
      expectedResult: boolean,
      matchesType: FilterMatchesType,
      config?: {
        feedRecordConfig?: Parameters<typeof feedRecord>[0];
        maxWords?: number;
      }
    ) {
      return test(name, () =>
        fc.assert(
          fc.property(
            fc
              .tuple(
                matchesType === 'all'
                  ? fc.constant<string[]>([])
                  : fc.set(fc.lorem({ maxCount: config?.maxWords }), {
                      minLength:
                        matchesType === 'except-all' || matchesType === 'none'
                          ? 1
                          : 0,
                    }), // non-matching filter values
                feedItemRecord({
                  readingContent: true,
                  contentMinLength: 1,
                })
              )
              .chain(([filter, item]) => {
                let fullContent = '';
                if (filter) {
                  const nonMatchFiltersRegex = new RegExp(
                    filter.join('|'),
                    'ig'
                  ); // 'ig' = 'ignore case, global'

                  item.title = item.title.replace(nonMatchFiltersRegex, '');

                  item.content = item.content.map((line) => {
                    fullContent += line;
                    // Make sure that the non-matching filters never match
                    return line.replace(nonMatchFiltersRegex, '');
                  });
                } else {
                  fullContent = item.content.join('');
                }

                return fc.tuple(
                  fc.constant(fullContent),
                  fc.constant(filter),
                  fc.constant(item)
                );
              })
              .filter(([fullContent]) => /\w+/.test(fullContent)) // Checks that the full content still contains some letters (for the filter matches)
              .chain(([fullContent, filter, item]) => {
                return fc.tuple(
                  fc.constant(item),
                  (matchesType === 'none'
                    ? fc.constant<string[]>([])
                    : fc
                        .array(
                          fc.integer({
                            min: 1,
                            max: fullContent.length,
                          }),
                          { minLength: 2, maxLength: 2 }
                        )
                        .chain(([titleSplitLimit, contentSplitLimit]) =>
                          fc.shuffledSubarray(
                            item.title
                              .split('', titleSplitLimit)
                              .concat(fullContent.split('', contentSplitLimit)),
                            {
                              minLength:
                                matchesType === 'some' || matchesType === 'all'
                                  ? 1
                                  : 0,
                            }
                          )
                        )
                  ).chain((matches) => {
                    return feedRecord({
                      textFilterValues: filter.concat(matches),
                      ...config.feedRecordConfig,
                    });
                  })
                );
              }),
            ([item, feed]) => {
              const res = matchesFilters(item, feed);
              expect(res).toEqual(expectedResult);
            }
          )
        )
      );
    }

    testFilter(
      'If there is a text filter with "matchAll" set to "any" and the content contains some of the strings within its values, it should return true',
      true,
      'some',
      {
        feedRecordConfig: {
          filtersMatchAll: 'any',
        },
      }
    );

    testFilter(
      'If there is a text filter with "matchAll" set to "all" and the content contains all of the strings within its values, it should return true',
      true,
      'all',
      {
        feedRecordConfig: {
          filtersMatchAll: 'all',
        },
      }
    );

    testFilter(
      'If there is a text filter with "matchAll" set to "any" and the content does not contain any of the strings within its values, it should return false',
      false,
      'none',
      {
        feedRecordConfig: {
          filtersMatchAll: 'any',
        },
      }
    );

    testFilter(
      'If there is a text filter with "matchAll" set to "all" and the content does not contain all of the strings within its values (that means, between 0 and n-1 strings), it should return false',
      false,
      'except-all',
      {
        feedRecordConfig: {
          filtersMatchAll: 'all',
        },
      }
    );
  });

  describe('category', () => {
    function testFilter(
      name: string,
      expectedResult: boolean,
      matchesType: FilterMatchesType,
      config?: {
        feedRecordConfig?: Parameters<typeof feedRecord>[0];
      }
    ) {
      return test(name, () =>
        fc.assert(
          fc.property(
            fc
              .tuple(
                matchesType === 'all'
                  ? fc.constant<string[]>([])
                  : fc.set(fc.lorem({ maxCount: 1 }), {
                      minLength:
                        matchesType === 'except-all' || matchesType === 'none'
                          ? 1
                          : 0,
                    }), // non-matching filter values
                feedItemRecord({ categoriesMinLength: 1 })
              )
              .chain(([filter, item]) => {
                if (filter) {
                  item.categories = item.categories.filter(
                    (x) => !filter.includes(x)
                  );
                }

                return fc.tuple(fc.constant(item), fc.constant(filter));
              })
              .filter(([item]) => item.categories.length > 0)
              .chain(([item, filter]) => {
                return fc.tuple(
                  fc.constant(item),
                  (matchesType === 'none'
                    ? fc.constant<string[]>([])
                    : fc.shuffledSubarray(item.categories, {
                        minLength:
                          matchesType === 'some' || matchesType === 'all'
                            ? 1
                            : 0,
                      })
                  ).chain((matches) => {
                    return feedRecord({
                      categoryFilterValues: filter.concat(matches),
                      ...config.feedRecordConfig,
                    });
                  })
                );
              }),
            ([item, feed]) => {
              const res = matchesFilters(item, feed);
              expect(res).toEqual(expectedResult);
            }
          )
        )
      );
    }

    testFilter(
      'If there is a category filter with "matchAll" set to "any" and some of the categories match with some of the strings within its values, it should return true',
      true,
      'some',
      {
        feedRecordConfig: {
          filtersMatchAll: 'any',
        },
      }
    );

    testFilter(
      'If there is a category filter with "matchAll" set to "all" and all of the strings within its values are present in the list of categories, it should return true',
      true,
      'all',
      {
        feedRecordConfig: {
          filtersMatchAll: 'all',
        },
      }
    );

    testFilter(
      'If there is a category filter with "matchAll" set to "any" and none of the categories match with any of the strings within its values, it should return false',
      false,
      'none',
      {
        feedRecordConfig: {
          filtersMatchAll: 'any',
        },
      }
    );

    testFilter(
      'If there is a category filter with "matchAll" set to "all" and the list of categories does not contain all of the strings within its values (that means, between 0 and n-1 strings), it should return false',
      false,
      'except-all',
      {
        feedRecordConfig: {
          filtersMatchAll: 'all',
        },
      }
    );
  });
});

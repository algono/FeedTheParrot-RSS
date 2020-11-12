import fc from 'fast-check';
import { Feed, FeedItem, FeedItems } from '../../../../src/logic/Feed';
import { getLangFormatter } from '../../../../src/util/langFormatter';
import { TFunction } from '../../../../src/util/localization';

export const feedRecord: fc.Arbitrary<Feed> = fc.record<
  Feed,
  fc.RecordConstraints
>(
  {
    name: fc.lorem(),
    url: fc.webUrl(),
    language: fc.oneof(fc.string(), fc.constant(undefined)),
    itemLimit: fc.oneof(fc.nat(), fc.constant(undefined)),
    truncateContentAt: fc.oneof(fc.nat(), fc.constant(undefined)),
  },
  { withDeletedKeys: false }
);

function content({ minLength = 0 } = {}) {
  return fc.array(fc.lorem({ mode: 'sentences' }), {
    minLength,
  });
}

export function feedItemRecord({
  readingContent = false,
  contentMinLength = 0,
} = {}): fc.Arbitrary<FeedItem> {
  const contentArb = content({ minLength: contentMinLength });
  return fc.record<FeedItem, fc.RecordConstraints>(
    {
      title: fc.lorem(),
      description: fc.lorem({ mode: 'sentences' }),
      summary: fc.lorem({ mode: 'sentences' }),
      date: fc.date().map((date) => date.toUTCString()),
      link: fc.webUrl(),
      imageUrl: fc.oneof(fc.webUrl(), fc.constant(undefined)),
      content: readingContent
        ? contentArb
        : fc.oneof(contentArb, fc.constant(undefined)),
    },
    { withDeletedKeys: false }
  );
}

export function feedItemsRecord({
  minLength = 0,
  readingContent = false,
  contentMinLength = 0,
  t,
}: {
  minLength?: number;
  contentMinLength?: number;
  readingContent?: boolean;
  t?: TFunction;
} = {}): fc.Arbitrary<FeedItems> {
  const langFormatterValue = t ? getLangFormatter(t) : undefined;

  return fc.record<FeedItems, fc.RecordConstraints>(
    {
      list: fc.array(feedItemRecord({ readingContent, contentMinLength }), {
        minLength,
      }),
      langFormatter: fc.constant(langFormatterValue),
    },
    { withDeletedKeys: false }
  );
}

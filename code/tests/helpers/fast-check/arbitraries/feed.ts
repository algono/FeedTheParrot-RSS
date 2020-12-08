import fc from 'fast-check';
import { Feed, FeedItem, FeedItems } from '../../../../src/logic/Feed';
import { getLangFormatter } from '../../../../src/util/langFormatter';
import { TFunction } from '../../../../src/util/localization';
import { AvailableLocale, availableLocales } from '../../helperTests';
import { mayHappenArbitrary, MayHappenOption } from './misc';

export function feedRecord({
  hasItemLimit = 'sometimes',
  hasTruncateContentAt = 'sometimes',
  locales = availableLocales,
  maxItemLimit,
  readFullContentCustomArb,
}: {
  hasItemLimit?: MayHappenOption;
  hasTruncateContentAt?: MayHappenOption;
  locales?: readonly AvailableLocale[];
  maxItemLimit?: number;
  readFullContentCustomArb?: fc.Arbitrary<boolean>;
} = {}): fc.Arbitrary<Feed> {
  return fc.record<Feed, fc.RecordConstraints>(
    {
      name: fc.lorem(),
      url: fc.webUrl(),
      language: fc.constantFrom(...locales),
      itemLimit: mayHappenArbitrary(
        fc.integer({ min: 1, max: maxItemLimit }),
        hasItemLimit
      ),
      truncateContentAt: mayHappenArbitrary(
        fc.integer({ min: 1 }),
        hasTruncateContentAt
      ),
      readFullContent:
        readFullContentCustomArb !== undefined
          ? readFullContentCustomArb
          : fc.boolean(),
    },
    { withDeletedKeys: false }
  );
}

function content({ minLength = 0 } = {}) {
  return fc.array(fc.lorem({ mode: 'sentences' }), {
    minLength,
  });
}

export function feedItemRecord({
  readingContent = false,
  contentMinLength = 0,
  hasDescription = 'always',
  hasSummary = 'always',
}: {
  readingContent?: boolean;
  contentMinLength?: number;
  hasDescription?: MayHappenOption;
  hasSummary?: MayHappenOption;
} = {}): fc.Arbitrary<FeedItem> {
  const contentArb = content({ minLength: contentMinLength });
  return fc.record<FeedItem, fc.RecordConstraints>(
    feedItemRecordModel({
      readingContent,
      contentArb,
      hasDescription,
      hasSummary,
    }),
    { withDeletedKeys: false }
  );
}

export function feedItemRecordModel({
  readingContent,
  contentArb,
  hasDescription = 'always',
  hasSummary = 'always',
}: {
  readingContent?: boolean;
  contentArb?: fc.Arbitrary<string[]>;
  hasDescription?: MayHappenOption;
  hasSummary?: MayHappenOption;
} = {}) {
  return {
    title: fc.lorem(),
    description: mayHappenArbitrary(
      fc.lorem({ mode: 'sentences' }),
      hasDescription
    ),
    summary: mayHappenArbitrary(fc.lorem({ mode: 'sentences' }), hasSummary),
    date: fc.date({ min: new Date(0) }).map((date) => date.toUTCString()),
    link: fc.webUrl(),
    imageUrl: fc.oneof(fc.webUrl(), fc.constant(undefined)),
    content: readingContent
      ? contentArb
      : fc.oneof(contentArb, fc.constant(undefined)),
  };
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

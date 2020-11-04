import fc from 'fast-check';
import {
  Feed,
  FeedItem,
  FeedItems,
  getLangFormatter,
  ItemField,
} from '../../../src/logic/Feed';
import { TFunction } from '../../../src/util/localization';

export const feedRecord = fc.record<Feed>({
  name: fc.lorem(),
  url: fc.webUrl(),
  language: fc.oneof(fc.string(), fc.constant(undefined)),
  itemLimit: fc.oneof(fc.nat(), fc.constant(undefined)),
  truncateSummaryAt: fc.oneof(fc.nat(), fc.constant(undefined)),
  readFields: fc.oneof(
    fc.array(
      fc.record<ItemField>({
        name: fc.string(),
        truncateAt: fc.nat(),
      })
    ),
    fc.constant(undefined)
  ),
});

function content({ minLength = 0 } = {}) {
  return fc.array(fc.lorem({ mode: 'sentences' }), {
    minLength,
  });
}

export function feedItemRecord({
  reading = false,
  contentMinLength = 0,
} = {}) {
  const contentArb = content({ minLength: contentMinLength });
  return fc.record<FeedItem, fc.RecordConstraints>(
    {
      title: fc.lorem(),
      description: fc.lorem({ mode: 'sentences' }),
      summary: fc.lorem({ mode: 'sentences' }),
      date: fc.date().map((date) => date.toUTCString()),
      link: fc.webUrl(),
      imageUrl: fc.oneof(fc.webUrl(), fc.constant(undefined)),
      content: reading
        ? contentArb
        : fc.oneof(contentArb, fc.constant(undefined)),
      index: reading ? fc.nat() : fc.oneof(fc.nat(), fc.constant(undefined)),
    },
    { withDeletedKeys: false }
  );
}

export function feedItemsRecord({
  minLength = 0,
  reading = false,
  contentMinLength = 0,
  t,
}: {
  minLength?: number;
  contentMinLength?: number;
  reading?: boolean;
  t?: TFunction;
} = {}) {
  const langFormatterValue = t ? getLangFormatter(t) : undefined;

  return fc.record<FeedItems, fc.RecordConstraints>(
    {
      list: fc.array(feedItemRecord({ reading, contentMinLength }), {
        minLength,
      }),
      langFormatter: fc.constant(langFormatterValue),
    },
    { withDeletedKeys: false }
  );
}

export const alphaAndUnderscoreString = fc.stringOf(
  fc.mapToConstant(
    { num: 26, build: (v) => String.fromCharCode(v + 0x41) }, // A-Z
    { num: 26, build: (v) => String.fromCharCode(v + 0x61) }, // a-z
    { num: 1, build: () => '_' } // _
  )
);

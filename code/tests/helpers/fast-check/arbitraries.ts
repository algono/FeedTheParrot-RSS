import fc from 'fast-check';
import { Feed, FeedItem, ItemField } from '../../../src/logic/Feed';

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

export const feedItemRecord = fc.record<FeedItem>({
  title: fc.lorem(),
  description: fc.lorem({ mode: 'sentences' }),
  summary: fc.lorem({ mode: 'sentences' }),
  date: fc.date().map((date) => date.toUTCString()),
  link: fc.webUrl(),
  imageUrl: fc.webUrl(),
});

export const alphaAndUnderscoreString = fc.stringOf(
  fc.mapToConstant(
    { num: 26, build: (v) => String.fromCharCode(v + 0x41) }, // A-Z
    { num: 26, build: (v) => String.fromCharCode(v + 0x61) }, // a-z
    { num: 1, build: () => '_' } // _
  )
);

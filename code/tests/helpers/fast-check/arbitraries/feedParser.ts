import fc from 'fast-check';
import { Enclosure, Image, Item, Meta, NS, Type } from 'feedparser';
import { availableLocales } from '../../helperTests';

const ImageRecord = fc.record<Image, fc.RecordConstraints>(
  {
    title: fc.lorem(),
    url: fc.webUrl(),
  },
  { withDeletedKeys: false }
);

const MetaRecord = fc.record<Meta, fc.RecordConstraints>(
  {
    '#ns': fc.constant<NS[]>(null),
    '#type': fc.constant<Type>(null),
    '#version': fc.string(),
    title: fc.lorem(),
    description: fc.lorem({ mode: 'sentences' }),
    date: fc.option(fc.date()),
    pubdate: fc.option(fc.date()),
    link: fc.webUrl(),
    xmlurl: fc.webUrl(),
    author: fc.lorem(),
    language: fc.constantFrom(...availableLocales),
    image: ImageRecord,
    favicon: fc.string(),
    copyright: fc.string(),
    generator: fc.string(),
    categories: fc.array(fc.lorem()),
  },
  { withDeletedKeys: false }
);

export const ItemRecord = fc.record<Item, fc.RecordConstraints>(
  {
    title: fc.lorem(),
    description: fc.lorem({ mode: 'sentences' }),
    summary: fc.lorem({ mode: 'sentences' }),
    date: fc.option(fc.date()),
    pubdate: fc.option(fc.date()),
    link: fc.webUrl(),
    origlink: fc.webUrl(),
    author: fc.lorem(),
    guid: fc.webUrl(),
    comments: fc.lorem({ mode: 'sentences' }),
    image: ImageRecord,
    categories: fc.array(fc.lorem()),
    enclosures: fc.array(
      fc.record<Enclosure, fc.RecordConstraints>(
        {
          length: fc.oneof(
            fc.nat().map((n) => n.toString()),
            fc.constant(undefined)
          ),
          type: fc.oneof(fc.string(), fc.constant(undefined)),
          url: fc.webUrl(),
        },
        {
          withDeletedKeys: false,
        }
      )
    ),
    meta: MetaRecord,
  },
  { withDeletedKeys: false }
);

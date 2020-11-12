import fc from 'fast-check';
import { Enclosure, Image, Item, Meta, NS, Type } from 'feedparser';
import { MAX_CHARACTERS_SPEECH } from '../../../../src/util/constants';
import { availableLocales } from '../../helperTests';

const imageRecord: fc.Arbitrary<Image> = fc.record<Image, fc.RecordConstraints>(
  {
    title: fc.lorem(),
    url: fc.webUrl(),
  },
  { withDeletedKeys: false }
);

const metaRecord: fc.Arbitrary<Meta> = fc.record<Meta, fc.RecordConstraints>(
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
    image: imageRecord,
    favicon: fc.string(),
    copyright: fc.string(),
    generator: fc.string(),
    categories: fc.array(fc.lorem()),
  },
  { withDeletedKeys: false }
);

export function itemRecord({
  contentSurpassesMaxCharacters = false,
} = {}): fc.Arbitrary<Item> {
  return fc.record<Item, fc.RecordConstraints>(
    {
      title: fc.lorem(),
      description: contentSurpassesMaxCharacters
        ? fc.string({ minLength: MAX_CHARACTERS_SPEECH })
        : fc.lorem({ mode: 'sentences' }),
      summary: contentSurpassesMaxCharacters
        ? fc.string({ minLength: MAX_CHARACTERS_SPEECH })
        : fc.lorem({ mode: 'sentences' }),
      date: fc.option(fc.date()),
      pubdate: fc.option(fc.date()),
      link: fc.webUrl(),
      origlink: fc.webUrl(),
      author: fc.lorem(),
      guid: fc.webUrl(),
      comments: fc.lorem({ mode: 'sentences' }),
      image: imageRecord,
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
      meta: metaRecord,
    },
    { withDeletedKeys: false }
  );
}

import fc from 'fast-check';

export const htmlFormattedLorem = fc
  .array(fc.lorem({ mode: 'sentences', maxCount: 1 }))
  .map((sentences) => ({
    plain: sentences.reduce((acc, sentence) => `${acc}${sentence}\n`, ''),
    html: sentences.reduce((acc, sentence) => `${acc}<p>${sentence}</p>\n`, ''),
  }));

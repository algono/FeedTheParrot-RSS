// Max characters between last phrase end and truncated string end
const MAX_LAST_PHRASE_DISTANCE_CHARS = 20;

/**
 * It truncates the string to the last phrase in order to not surpass n characters total.
 *
 * @param {string} str The original string
 * @param {number} len The max number of characters (must be a positive integer)
 */
export function truncate(str: string, len: number) {
  // Check that the length is valid
  if (len <= 0)
    throw new RangeError('The truncate length must be greater than zero');
  if (!Number.isInteger(len))
    throw new RangeError('The truncate length must be an integer');

  let res: { str: string; readable?: string };

  if (str.length <= len) {
    res = { str };
  } else {
    let subString = str.substr(0, len);
    const lastPhraseEnd = subString.lastIndexOf('. ');
    if (
      lastPhraseEnd >= 0 &&
      lastPhraseEnd >= len - MAX_LAST_PHRASE_DISTANCE_CHARS
    ) {
      res = {
        str: subString.substr(0, lastPhraseEnd + 1),
      };
    } else {
      if (len > 2) subString = subString.substr(0, len - 2);
      const lastSpace = subString.lastIndexOf(' ');
      if (lastSpace > 0) {
        const strRes = subString.substr(0, lastSpace);
        res = {
          str: strRes,
          readable: strRes + '...',
        };
      } else {
        if (len > 3) {
          const strRes = subString.substr(0, len - 3);
          res = {
            str: strRes,
            readable: strRes + '...',
          };
        } else {
          res = {
            str: subString,
          };
        }
      }
    }
  }

  return res;
}

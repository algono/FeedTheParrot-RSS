// Max characters between last phrase end and truncated string end
const MAX_LAST_PHRASE_DISTANCE_CHARS = 20;

export function truncateAll(str: string, n: number) {
  const res: string[] = [];
  let remaining = str;
  while (remaining) {
    const current = truncate(remaining, n);
    res.push(current.str);
    remaining = remaining.substring(current.len);
  }

  return res;
}

/**
 * It truncates the string to the last phrase in order to not surpass n characters total.
 *
 * @param {string} str The original string
 * @param {number} len The max number of characters (must be a positive integer)
 */
function truncate(str: string, len: number) {
  // Check that the length is valid
  if (len <= 0)
    throw new RangeError('The truncate length must be greater than zero');
  if (!Number.isInteger(len))
    throw new RangeError('The truncate length must be an integer');

  let res: { str: string; len: number };

  if (str.length <= len) {
    res = { str, len: str.length };
  } else {
    let subString = str.substr(0, len);
    const lastPhraseEnd = subString.lastIndexOf('. ');
    if (
      lastPhraseEnd >= 0 &&
      lastPhraseEnd >= len - MAX_LAST_PHRASE_DISTANCE_CHARS
    ) {
      res = {
        str: subString.substr(0, lastPhraseEnd + 1),
        len: lastPhraseEnd + 1,
      };
    } else {
      if (len > 2) subString = subString.substr(0, len - 2);
      const lastSpace = subString.lastIndexOf(' ');
      if (lastSpace > 0) {
        res = {
          str: subString.substr(0, lastSpace) + '...',
          len: lastSpace,
        };
      } else {
        if (len > 3) {
          res = {
            str: subString.substr(0, len - 3) + '...',
            len: len - 3,
          };
        } else {
          res = {
            str: subString,
            len: len > 2 ? len - 2 : len,
          };
        }
      }
    }
  }

  return res;
}

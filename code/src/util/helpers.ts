import { ui } from 'ask-sdk-model';
import { FilterMatch } from '../logic/Feed';

/**
 * This is a user-defined type guard.
 * More details here: https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
 */
function isSsml(
  outputSpeech: ui.OutputSpeech
): outputSpeech is ui.SsmlOutputSpeech {
  return (outputSpeech as ui.SsmlOutputSpeech).ssml !== undefined;
}

/**
 * Returns the text used in an OutputSpeech. It can either be SSML or plain text.
 */
export function getSpeakOutput(outputSpeech: ui.OutputSpeech): string {
  return isSsml(outputSpeech) ? outputSpeech.ssml : outputSpeech.text;
}

/**
 * Calculate the max number of characters in a series of string lists
 * wrapped inside a property from a list of objects with type T
 * @param list The list of objects to get the string lists from
 * @param property The property within the objects that contains the string lists
 * @param topLimit (Optional) Number (> 0) that should never be equaled or exceeded. If it does, this gets immediately returned as the max value.
 */
export function calculateMaxCharactersIn<
  P extends keyof T,
  T extends { [key in P]?: string[] }
>(list: T[], property: P, topLimit?: number): number {
  let res = 0;
  for (const item of list) {
    const content = item[property];
    if (content) {
      let max = 0;
      for (const text of content) {
        if (topLimit && text.length >= topLimit) {
          return topLimit;
        } else if (text.length > max) {
          max = text.length;
        }
      }
      if (max > res) {
        res = max;
      }
    }
  }
  return res;
}

export function anyOrAllElements<T>(
  array: T[],
  match: FilterMatch,
  predicate: (value: T) => boolean
): boolean {
  switch (match) {
    case 'any': return array.some(predicate);
    case 'all': return array.every(predicate);
  }
}

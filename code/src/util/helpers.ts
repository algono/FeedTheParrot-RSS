import { ui } from 'ask-sdk-model';

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

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


const arrowFunctionRegex = /\(.*\)\s*=>\s*(.*)/;
const functionRegex = /return (.*?)[;\s\n]/;
/**
 * Similar to the 'nameof' function from C#, get the name from a variable or a property
 * @param name The name of the property from T, or a function that returns a variable (of type T) whose name we want
 */
export function nameof<T>(name: keyof T | (() => T)) {
  if (name instanceof Function) {
    const funcString = name.toString();

    const arrowFunctionResults = arrowFunctionRegex.exec(funcString);
    if (arrowFunctionResults) return arrowFunctionResults[1];

    return functionRegex.exec(funcString)[1];
  } else {
    return name.toString();
  }
}

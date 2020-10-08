import { ui } from "ask-sdk-model";

/**
 * This is a user-defined type guard.
 * More details here: https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
 */
function isSsml(outputSpeech: ui.OutputSpeech): outputSpeech is ui.SsmlOutputSpeech {
    return (outputSpeech as ui.SsmlOutputSpeech).ssml !== undefined;
}

/**
 * This is a user-defined type guard.
 * More details here: https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
 */
function isPlainText(outputSpeech: ui.OutputSpeech): outputSpeech is ui.PlainTextOutputSpeech {
    return (outputSpeech as ui.PlainTextOutputSpeech).text !== undefined;
}

/**
 * Returns the text used in an OutputSpeech. It can either be SSML or plain text.
 * @throws 'TypeError' if the given 'outputSpeech' has an unknown type.
 */
export function getSpeakOutput(outputSpeech: ui.OutputSpeech): string {
    if (isSsml(outputSpeech)) {
        return outputSpeech.ssml;
    } else if (isPlainText(outputSpeech)) {
        return outputSpeech.text;
    } else {
        throw new TypeError(`The following response has an unknown type, so it could not be saved for repeating: ${JSON.stringify(outputSpeech)}`)
    }
}
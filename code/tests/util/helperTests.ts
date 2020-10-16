import {
  getIntentName,
  getRequestType,
  HandlerInput,
  RequestHandler,
} from 'ask-sdk-core';
import { mocked } from 'ts-jest/utils';
import { mock, when, instance } from 'ts-mockito';

const availableLocales = ['en', 'es'];

export function testInAllLocales(name: string, fn: { (locale: string): any }) {
  availableLocales.forEach((locale) => {
    test(`${name} (${locale})`, () => fn(locale));
  });
}

/**
 * Tests if the 'canHandle' function of the handler handles the intent successfully
 * @example
 * jest.mock('ask-sdk-core'); // You must ALWAYS mock the module first
 * // ...
 * testIntentCanHandle(HelpIntentHandler, 'AMAZON.HelpIntent');
 *
 * @param handler The request handler for the intent
 * @param intentName The intent's name
 */
export function testIntentCanHandle(
  handler: RequestHandler,
  intentName: string
) {
  const requestType = 'IntentRequest';

  test(`${intentName} intent can be handled when called`, () => {
    mocked(getRequestType).mockReturnValue(requestType);
    mocked(getIntentName).mockReturnValue(intentName);

    const handlerInput = mock<HandlerInput>();
    when(handlerInput.requestEnvelope).thenReturn(null);

    expect(handler.canHandle(instance(handlerInput))).toBe(true);
  });
}

import {
  getIntentName,
  getRequestType,
  RequestHandler,
} from 'ask-sdk-core';
import { mocked } from 'ts-jest/utils';
import { mockHandlerInput } from './HandlerInputMocks';

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
 * testIntentCanHandle({ handler: HelpIntentHandler, intentName: 'AMAZON.HelpIntent' });
 *
 * @param handler The request handler for the intent
 * @param intentName The intent's name
 */
export function testIntentCanHandle({
  handler,
  intentName,
  testName,
}: {
  handler: RequestHandler;
  intentName?: string;
  testName?: string;
}) {
  const requestType = 'IntentRequest';

  test(
    
    testName ?? `${intentName} intent can be handled when called`,
   
    async () => {
        mocked(getRequestType).mockReturnValue(requestType);
        mocked(getIntentName).mockReturnValue(intentName);

        const mocks = await mockHandlerInput();

        expect(handler.canHandle(mocks.instanceHandlerInput)).toBe(true);
      }
  
  );
}

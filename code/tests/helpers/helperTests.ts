import { getIntentName, getRequestType, RequestHandler } from 'ask-sdk-core';
import { mocked } from 'ts-jest/utils';
import { mockHandlerInput, MockHandlerInputOptions } from './HandlerInputMocks';

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
 * @param handler The intent request handler we are testing against
 * @param intentName (optional) If we are testing a particular intent, its name
 * @param testName (optional) A custom name for the test
 * @param mockHandlerInputOptions (optional) Options for the call to 'mockHandlerInput' made inside this function
 */
export function testIntentCanHandle({
  handler,
  intentName,
  testName,
  mockHandlerInputOptions,
}: {
  handler: RequestHandler;
  intentName?: string;
  testName?: string;
  mockHandlerInputOptions?: MockHandlerInputOptions;
}) {
  const requestType = 'IntentRequest';

  testCanHandle({
    requestType,
    handler,
    testName: testName ?? `${intentName} intent can be handled when called`,
    testBefore: () => {
      mocked(getIntentName).mockReturnValue(intentName);
    },
    mockHandlerInputOptions,
  });
}

/**
 * Tests if the 'canHandle' function of the handler handles a particular request type successfully
 * @example
 * jest.mock('ask-sdk-core'); // You must ALWAYS mock the module first
 * // ...
 * testCanHandle({
 *  requestType: 'SessionEndedRequest',
 *  handler: SessionEndedRequestHandler,
 *  testName: 'Session Ended Request Handler can handle any SessionEndedRequest'
 * });
 *
 * @param requestType The type of request we are testing
 * @param handler The request handler we are testing against
 * @param testName The test's name (a message displayed when testing)
 * @param testBefore (optional) A function called just before the test logic
 * @param mockHandlerInputOptions (optional) Options for the call to 'mockHandlerInput' made inside this function
 */
export function testCanHandle({
  requestType,
  handler,
  testName,
  testBefore,
  mockHandlerInputOptions,
}: {
  requestType: string;
  handler: RequestHandler;
  testName: string;
  testBefore?: () => void | Promise<void>;
  mockHandlerInputOptions?: MockHandlerInputOptions;
}) {
  test(
    testName,

    async () => {
      if (testBefore) {
        await testBefore();
      }

      mocked(getRequestType).mockReturnValue(requestType);

      const mocks = await mockHandlerInput(mockHandlerInputOptions);

      expect(handler.canHandle(mocks.instanceHandlerInput)).toBe(true);
    }
  );
}

import { mocked } from 'ts-jest/utils';
import { capture } from 'ts-mockito';
import { IntentReflectorHandler } from '../../src/intents/Reflector';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

import { getIntentName } from 'ask-sdk-core';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import * as fc from 'fast-check';

testIntentCanHandle({
  handler: IntentReflectorHandler,
  testName: 'Intent reflector can handle any IntentRequest',
});

testInAllLocales(
  'Intent reflector response contains the reflected intent',
  async (locale) => {
    const mocks = await mockHandlerInput({ locale });

    fc.assert(
      fc.property(
        // Allow only non-empty strings with alphanumerical characters
        fc.string({ minLength: 1 }).filter((str) => /^[\w]+$/.test(str)),
        (intentName) => {
          mocked(getIntentName).mockReturnValue(intentName);

          IntentReflectorHandler.handle(mocks.instanceHandlerInput);

          const [responseSpeakOutput] = capture(
            mocks.mockedResponseBuilder.speak
          ).last();

          expect(responseSpeakOutput).toContain(intentName);
        }
      )
    );
  }
);

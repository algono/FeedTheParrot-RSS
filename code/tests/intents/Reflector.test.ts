import { mocked } from 'ts-jest/utils';
import { capture } from 'ts-mockito';
import { IntentReflectorHandler } from '../../src/intents/Reflector';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

import { getIntentName } from 'ask-sdk-core';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import * as fc from 'fast-check';
import { alphaAndUnderscoreString } from '../helpers/fast-check/arbitraries/misc';

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
        fc
          .tuple(
            fc.option(fc.constant('AMAZON.'), { freq: 2 }), // 50/50 of being a built-in intent
            /**
             * Allow only strings that match an Alexa intent name's restrictions:
             * (the following text was extracted from Alexa prompts, except for the remarks in parenthesis, which are extrapolated from examples)
             *
             * "Intent name cannot be empty, it can only contain case-insensitive alphabetical characters and underscores,
             * and it must begin and end with an alphabetic character. (also no double underscores)
             * Numbers, spaces, or other special characters are not allowed."
             * (built-in intents have 'AMAZON' and a dot prepended to its name)
             */
            alphaAndUnderscoreString.filter((str) =>
              /^[a-z]+(?:_[a-z]+)*$/i.test(str)
            )
          )
          .map(([prefix, name]) => (prefix ? prefix + name : name)),
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

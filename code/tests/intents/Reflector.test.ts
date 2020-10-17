import { mocked } from 'ts-jest/utils';
import { capture } from 'ts-mockito';
import { IntentReflectorHandler } from '../../src/intents/Reflector';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

import { getIntentName } from 'ask-sdk-core';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';

testIntentCanHandle({
  handler: IntentReflectorHandler,
  testName: 'Intent reflector can handle any IntentRequest',
});

testInAllLocales(
  'Intent reflector response contains the reflected intent',
  async (locale) => {
    const intentName = 'MyTestIntent';
    mocked(getIntentName).mockReturnValue(intentName);

    const mocks = await mockHandlerInput({ locale });

    IntentReflectorHandler.handle(mocks.instanceHandlerInput);

    const [responseSpeakOutput] = capture(
      mocks.mockedResponseBuilder.speak
    ).last();

    expect(responseSpeakOutput).toContain(intentName);
  }
);

import { capture } from 'ts-mockito';
import { HelpIntentHandler } from '../../src/intents/Help';
import { mockHandlerInput } from '../util/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../util/helperTests';

jest.mock('ask-sdk-core');
testIntentCanHandle(HelpIntentHandler, 'AMAZON.HelpIntent');

testInAllLocales('Help intent shows help message', async (locale) => {
  const mocks = await mockHandlerInput(locale);

  HelpIntentHandler.handle(mocks.instanceHandlerInput);

  const [responseSpeakOutput] = capture(
    mocks.mockedResponseBuilder.speak
  ).last();

  expect(responseSpeakOutput).toEqual(mocks.t('HELP_MSG'));
});

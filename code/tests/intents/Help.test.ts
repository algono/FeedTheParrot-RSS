import { capture } from 'ts-mockito';
import { HelpIntentHandler } from '../../src/intents/Help';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: HelpIntentHandler,
  intentName: 'AMAZON.HelpIntent',
});

testInAllLocales('Help intent speaks help message', async (locale) => {
  const mocks = await mockHandlerInput({ locale });

  HelpIntentHandler.handle(mocks.instanceHandlerInput);

  const [responseSpeakOutput] = capture(
    mocks.mockedResponseBuilder.speak
  ).last();

  expect(responseSpeakOutput).toEqual(mocks.t('HELP_MSG'));
});

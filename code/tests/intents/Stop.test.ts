import { capture } from "ts-mockito";
import { CancelAndStopIntentHandler } from "../../src/intents/Stop";
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: CancelAndStopIntentHandler,
  intentName: 'AMAZON.CancelIntent',
});
testIntentCanHandle({
  handler: CancelAndStopIntentHandler,
  intentName: 'AMAZON.StopIntent',
});

testInAllLocales('Stop intent shows goodbye message', async (locale) => {
  const mocks = await mockHandlerInput({ locale });

  CancelAndStopIntentHandler.handle(mocks.instanceHandlerInput);

  const [responseSpeakOutput] = capture(
    mocks.mockedResponseBuilder.speak
  ).last();

  expect(responseSpeakOutput).toEqual(mocks.t('GOODBYE_MSG'));
});
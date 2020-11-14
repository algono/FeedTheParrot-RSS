import { capture } from 'ts-mockito';
import { CancelAndStopIntentHandler } from '../../src/intents/Stop';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

describe('Cancel and stop intent', () => {
  testIntentCanHandle({
    handler: CancelAndStopIntentHandler,
    intentName: 'AMAZON.CancelIntent',
  });
  testIntentCanHandle({
    handler: CancelAndStopIntentHandler,
    intentName: 'AMAZON.StopIntent',
  });

  testInAllLocales('speaks goodbye message')(async (locale) => {
    const mocks = await mockHandlerInput({ locale });

    CancelAndStopIntentHandler.handle(mocks.instanceHandlerInput);

    const [responseSpeakOutput] = capture(
      mocks.mockedResponseBuilder.speak
    ).last();

    expect(responseSpeakOutput).toEqual(mocks.t('GOODBYE_MSG'));
  });
});

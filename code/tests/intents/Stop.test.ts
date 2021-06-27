import { verify } from 'ts-mockito';
import { CancelAndStopIntentHandler } from '../../src/intents/Stop';
import { testIntentCanHandle } from '../helpers/helperTests';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';

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
  testIntentCanHandle({
    handler: CancelAndStopIntentHandler,
    intentName: 'AMAZON.PauseIntent',
  });

  test('It stops any currently playing audio', async () => {
    const { instanceHandlerInput, mockedResponseBuilder } =
      await mockHandlerInput();

    CancelAndStopIntentHandler.handle(instanceHandlerInput);

    verify(mockedResponseBuilder.addAudioPlayerStopDirective()).once();
  });

  test('It ends the current skill session', async () => {
    const { instanceHandlerInput, mockedResponseBuilder } =
      await mockHandlerInput();

    CancelAndStopIntentHandler.handle(instanceHandlerInput);

    verify(mockedResponseBuilder.withShouldEndSession(true)).once();
  });
});

import { anyString, anything, capture, verify } from 'ts-mockito';
import { SessionEndedRequestHandler } from '../../src/intents/SessionEnded';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testCanHandle, testInAllLocales } from '../helpers/helperTests';
import { er } from 'ask-sdk-model';

jest.mock('ask-sdk-core');
testCanHandle({
  requestType: 'SessionEndedRequest',
  handler: SessionEndedRequestHandler,
  testName: 'Session Ended Request Handler can handle any SessionEndedRequest',
});

testInAllLocales(
  'Session ended handler clears dynamic entities',
  async (locale) => {
    const mocks = await mockHandlerInput({ locale });

    SessionEndedRequestHandler.handle(mocks.instanceHandlerInput);

    const [directive] = capture(
      mocks.mockedResponseBuilder.addDirective
    ).last();

    expect(directive).toHaveProperty('type', 'Dialog.UpdateDynamicEntities');
    expect(directive).toHaveProperty<er.dynamic.UpdateBehavior>(
      'updateBehavior',
      'CLEAR'
    );
  }
);

testInAllLocales(
  'Session ended handler does not speak nor reprompt',
  async (locale) => {
    const mocks = await mockHandlerInput({ locale });

    SessionEndedRequestHandler.handle(mocks.instanceHandlerInput);

    verify(mocks.mockedResponseBuilder.speak(anyString(), anything())).never();
    verify(
      mocks.mockedResponseBuilder.reprompt(anyString(), anything())
    ).never();
  }
);

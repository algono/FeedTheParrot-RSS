import { anyString, anything, capture, verify } from 'ts-mockito';
import { SessionEndedRequestHandler } from '../../src/intents/SessionEnded';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testCanHandle, testInAllLocales } from '../helpers/helperTests';
import { er } from 'ask-sdk-model';

jest.mock('ask-sdk-core');

describe('Session ended request handler', () => {
  testCanHandle({
    requestType: 'SessionEndedRequest',
    handler: SessionEndedRequestHandler,
    testName:
      'can handle any SessionEndedRequest',
  });

  testInAllLocales('clears dynamic entities')(
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

  testInAllLocales('does not speak nor reprompt')(
    async (locale) => {
      const mocks = await mockHandlerInput({ locale });

      SessionEndedRequestHandler.handle(mocks.instanceHandlerInput);

      verify(
        mocks.mockedResponseBuilder.speak(anyString(), anything())
      ).never();
      verify(
        mocks.mockedResponseBuilder.reprompt(anyString(), anything())
      ).never();
    }
  );
});

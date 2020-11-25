import { AuthIntentHandler } from '../../src/intents/Auth';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

import { anything, capture, verify } from 'ts-mockito';
import { mockDatabase } from '../helpers/mocks/mockDatabase';

jest.mock('ask-sdk-core');

describe('Auth intent', () => {
  testIntentCanHandle({
    handler: AuthIntentHandler,
    intentName: 'AuthIntent',
  });

  test('generates a 6 digit code', async () => {
    const mocks = await mockHandlerInput({ locale: null });

    const mockedDatabase = mockDatabase();

    await AuthIntentHandler.handle(mocks.instanceHandlerInput);

    verify(mockedDatabase.setAuthCode(anything())).once();

    const [authCode] = capture(mockedDatabase.setAuthCode).last();

    expect(authCode.code).toMatch(/[0-9]{6}/);
  });
});

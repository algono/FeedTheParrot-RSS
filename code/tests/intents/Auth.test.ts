import { mocked } from 'ts-jest/utils';
import { AuthIntentHandler } from '../../src/intents/Auth';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

jest.mock('../../src/database/Database');

import Database from '../../src/database/Database';

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: AuthIntentHandler,
  intentName: 'AuthIntent',
});

test('Auth intent generates a 6 digit code', async () => {
  const sessionAttributes = {};
  const mocks = await mockHandlerInput({ sessionAttributes });

  const mockAddAuthCode = mocked(Database.addAuthCode);

  AuthIntentHandler.handle(mocks.instanceHandlerInput);

  const authCode =
    mockAddAuthCode.mock.calls[mockAddAuthCode.mock.calls.length - 1][0];

  expect(authCode.code).toMatch(/[0-9]{6}/);
});

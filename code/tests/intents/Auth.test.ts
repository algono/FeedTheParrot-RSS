import { AuthIntentHandler } from '../../src/intents/Auth';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

import { capture } from 'ts-mockito';
import { mockDatabase } from '../helpers/mocks/mockDatabase';

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: AuthIntentHandler,
  intentName: 'AuthIntent',
});

test('Auth intent generates a 6 digit code', async () => {
  const sessionAttributes = {};
  const mocks = await mockHandlerInput({ sessionAttributes, locale: null });

  const mockedDatabase = mockDatabase();

  await AuthIntentHandler.handle(mocks.instanceHandlerInput);

  const [authCode] = capture(mockedDatabase.addAuthCode).last();

  expect(authCode.code).toMatch(/[0-9]{6}/);
});

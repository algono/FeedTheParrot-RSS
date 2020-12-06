import { AuthIntentHandler } from '../../src/intents/Auth';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

import { anything, capture, verify } from 'ts-mockito';
import { mockDatabase } from '../helpers/mocks/mockDatabase';
import { AUTH_CODE_LENGTH } from '../../src/util/constants';

jest.mock('ask-sdk-core');

describe('Auth intent', () => {
  testIntentCanHandle({
    handler: AuthIntentHandler,
    intentName: 'AuthIntent',
  });

  test('generates a code with a number of digits equal to the "AUTH_CODE_LENGTH" constant', async () => {
    const mocks = await mockHandlerInput({ locale: null });

    const mockedDatabase = mockDatabase();

    await AuthIntentHandler.handle(mocks.instanceHandlerInput);

    verify(mockedDatabase.setAuthCode(anything())).once();

    const [authCode] = capture(mockedDatabase.setAuthCode).last();

    expect(authCode.code).toMatch(new RegExp(`[0-9]{${AUTH_CODE_LENGTH}}`));
  });
});

import { AuthIntentHandler } from '../../src/intents/Auth';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

import { anything, capture, mock, verify, when } from 'ts-mockito';
import { mockDatabase } from '../helpers/mocks/mockDatabase';
import { LaunchSessionAttributes } from '../../src/intents/Launch';
import { UserData } from '../../src/database/Database';
import fc from 'fast-check';
import { resolvableInstance } from '../helpers/ts-mockito/resolvableInstance';
import { mocked } from 'ts-jest/utils';
import { getUserId } from 'ask-sdk-core';

jest.mock('ask-sdk-core');

describe('Auth intent', () => {
  testIntentCanHandle({
    handler: AuthIntentHandler,
    intentName: 'AuthIntent',
  });

  test('creates a new user if it does not exist', () =>
    fc.assert(
      fc.asyncProperty(fc.string(), async (userId) => {
        const sessionAttributes: LaunchSessionAttributes = {};
        const mocks = await mockHandlerInput({
          sessionAttributes,
          locale: null,
        });

        mocked(getUserId).mockReturnValue(userId);

        const mockedDatabase = mockDatabase();

        when(mockedDatabase.createNewUser(anything())).thenResolve(
          resolvableInstance(
            mock<
              FirebaseFirestore.DocumentReference<
                FirebaseFirestore.DocumentData
              >
            >()
          )
        );

        await AuthIntentHandler.handle(mocks.instanceHandlerInput);

        verify(mockedDatabase.createNewUser(anything())).once();

        const [userData] = capture(mockedDatabase.createNewUser).last();

        expect(userData).toMatchObject<UserData>({ userId });
      })
    ));

  test('generates a 6 digit code', async () => {
    const sessionAttributes: LaunchSessionAttributes = {
      userIdDB: mock<string>(),
    };
    const mocks = await mockHandlerInput({ sessionAttributes, locale: null });

    const mockedDatabase = mockDatabase();

    await AuthIntentHandler.handle(mocks.instanceHandlerInput);

    verify(mockedDatabase.addAuthCode(anything())).once();

    const [authCode] = capture(mockedDatabase.addAuthCode).last();

    expect(authCode.code).toMatch(/[0-9]{6}/);
  });
});

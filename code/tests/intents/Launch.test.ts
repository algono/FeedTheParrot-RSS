import { LaunchRequestHandler, LaunchSessionAttributes } from '../../src/intents/Launch';
import { testCanHandle } from '../helpers/helperTests';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { mocked } from 'ts-jest/utils';
import { instance, mock, when } from 'ts-mockito';

jest.mock('../../src/database/Database');
import Database from '../../src/database/Database';

jest.mock('ask-sdk-core');
import { getUserId } from 'ask-sdk-core';
import fc from 'fast-check';

testCanHandle({
  handler: LaunchRequestHandler,
  requestType: 'LaunchRequest',
  testName: 'Launch request can be handled when called',
});

test('Launch intent saves userId from database in session attributes', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string(), fc.string(), async (userId, refId) => {
        const sessionAttributes: LaunchSessionAttributes = {};
        const mocks = await mockHandlerInput({ sessionAttributes });

        mocked(getUserId).mockReturnValue(userId);

        const mockUserData = mock<Database.UserData>();
        when(mockUserData.userId).thenReturn(userId);

        const mockUserDataRef = mock<
          FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
        >();

        when(mockUserDataRef.id).thenReturn(refId);

        mocked(Database.getUserData).mockResolvedValue({
          userData: instance(mockUserData),
          userDataRef: instance(mockUserDataRef),
        });
        
        mocked(Database.getFeedsFromUser).mockResolvedValue({
          feeds: {},
          feedNames: [],
        });

        await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

        expect(sessionAttributes.userIdDB).toEqual(refId);
      }
    )
  )
});

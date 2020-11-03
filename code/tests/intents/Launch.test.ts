import {
  LaunchRequestHandler,
  LaunchSessionAttributes,
} from '../../src/intents/Launch';
import { testCanHandle } from '../helpers/helperTests';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { mocked } from 'ts-jest/utils';
import { anyString, anything, capture, instance, mock, when } from 'ts-mockito';

import { UserData } from '../../src/database/Database';

jest.mock('ask-sdk-core');
import { getUserId } from 'ask-sdk-core';
import { dialog, Directive } from 'ask-sdk-model';
import fc from 'fast-check';
import { mockDatabase } from '../helpers/mocks/mockDatabase';

testCanHandle({
  handler: LaunchRequestHandler,
  requestType: 'LaunchRequest',
  testName: 'Launch request can be handled when called',
});

test('Launch intent saves userId from database in session attributes', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), fc.string(), async (userId, refId) => {
      const mocks = await mockHandlerInput();

      mocked(getUserId).mockReturnValue(userId);

      const mockUserData = mock<UserData>();
      when(mockUserData.userId).thenReturn(userId);

      const mockUserDataRef = mock<
        FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
      >();

      when(mockUserDataRef.id).thenReturn(refId);

      const mockedDatabase = mockDatabase();

      when(mockedDatabase.getUserData(anyString())).thenResolve({
        userData: instance(mockUserData),
        userDataRef: instance(mockUserDataRef),
      });

      when(
        mockedDatabase.getFeedsFromUser(anything(), anyString())
      ).thenResolve({
        feeds: {},
        feedNames: [],
      });

      await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

      // We could have also passed a sessionAttributes object before and used it,
      // but this way we also check that it still works when there are no session attributes at first
      const [sessionAttributes] = capture(
        mocks.mockedAttributesManager.setSessionAttributes
      ).last();

      expect(sessionAttributes.userIdDB).toEqual(refId);
    })
  );
});

function directiveHasDynamicEntities(
  directive: Directive
): directive is dialog.DynamicEntitiesDirective {
  return (directive as dialog.DynamicEntitiesDirective).types !== undefined;
}

test('Launch intent takes feed names from session attributes and creates slot values from them', async () => {
  await fc.assert(
    fc.asyncProperty(fc.array(fc.string()), async (feedNames) => {
      const sessionAttributes: LaunchSessionAttributes = Object.freeze({
        feeds: { testFeed: null }, // This is not used within the code, only checked if it has something in it
        feedNames,
      });
      const mocks = await mockHandlerInput({ sessionAttributes });

      await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

      const replaceEntityDirective = capture(
        mocks.mockedResponseBuilder.addDirective
      ).last()[0];

      if (directiveHasDynamicEntities(replaceEntityDirective)) {
        expect(replaceEntityDirective.types[0].values).toEqual(
          sessionAttributes.feedNames.map((value) => ({
            name: {
              value: value,
            },
          }))
        );
      } else {
        fail(TypeError('Added Directive was not a DynamicEntitiesDirective'));
      }
    })
  );
});

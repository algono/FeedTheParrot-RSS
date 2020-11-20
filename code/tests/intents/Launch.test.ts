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
import { Feed } from '../../src/logic/Feed';

describe('Launch request', () => {
  testCanHandle({
    handler: LaunchRequestHandler,
    requestType: 'LaunchRequest',
    testName: 'can be handled when called',
  });

  function mockLaunchRequest({
    feeds,
    feedNames,
  }: {
    feeds: { [x: string]: Feed };
    feedNames: string[];
  }) {
    const mockUserData = mock<UserData>();

    const mockUserDataRef = mock<
      FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
    >();

    const mockedDatabase = mockDatabase();

    when(mockedDatabase.getUserData(anyString())).thenResolve({
      userData: instance(mockUserData),
      userDataRef: instance(mockUserDataRef),
    });

    when(mockedDatabase.getFeedsFromUser(anything(), anyString())).thenResolve({
      feeds,
      feedNames,
    });

    return { mockUserData, mockUserDataRef, mockedDatabase };
  }

  test('saves user id and their feed data from database in session attributes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.string(), async (userId, refId) => {
        const mocks = await mockHandlerInput({ locale: null });

        mocked(getUserId).mockReturnValue(userId);

        const expectedFeeds = instance(mock<{ [x: string]: Feed }>());
        const expectedFeedNames = instance(mock<string[]>());

        const { mockUserData, mockUserDataRef } = mockLaunchRequest({
          feeds: expectedFeeds,
          feedNames: expectedFeedNames,
        });

        when(mockUserData.userId).thenReturn(userId);
        when(mockUserDataRef.id).thenReturn(refId);

        await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

        const [sessionAttributes]: [
          LaunchSessionAttributes,
          ...unknown[]
        ] = capture(mocks.mockedAttributesManager.setSessionAttributes).last();

        expect(sessionAttributes.userIdDB).toEqual(refId);
        expect(sessionAttributes.feeds).toBe(expectedFeeds);
        expect(sessionAttributes.feedNames).toBe(expectedFeedNames);
      })
    );
  });

  function directiveHasDynamicEntities(
    directive: Directive
  ): directive is dialog.DynamicEntitiesDirective {
    return (directive as dialog.DynamicEntitiesDirective).types !== undefined;
  }

  test('creates slot values from the obtained feed names', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.string()), async (feedNames) => {
        const mocks = await mockHandlerInput({
          locale: null,
        });

        mockLaunchRequest({
          feeds: instance(mock<{ [x: string]: Feed }>()),
          feedNames,
        });

        await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

        const [replaceEntityDirective] = capture(
          mocks.mockedResponseBuilder.addDirective
        ).last();

        if (directiveHasDynamicEntities(replaceEntityDirective)) {
          expect(replaceEntityDirective.types[0].values).toEqual(
            feedNames.map((value) => ({
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
});

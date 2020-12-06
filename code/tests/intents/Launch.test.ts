import { LaunchRequestHandler } from '../../src/intents/Launch';
import { testCanHandle } from '../helpers/helperTests';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { GetUserDataOptions } from '../../src/database/Database';

import { dialog, Directive } from 'ask-sdk-model';
import fc from 'fast-check';
import { mockDatabase } from '../helpers/mocks/mockDatabase';
import { Feed } from '../../src/logic/Feed';
import { resolvableInstance } from '../helpers/ts-mockito/resolvableInstance';
import { NoUserDataError } from '../../src/logic/Errors';
import { UserData } from '../../src/database/UserData';

jest.mock('ask-sdk-core');

describe('Launch request', () => {
  testCanHandle({
    handler: LaunchRequestHandler,
    requestType: 'LaunchRequest',
    testName: 'can be handled when called',
  });

  function mockLaunchRequest({
    feeds = instance(mock<{ [x: string]: Feed }>()),
    feedNames = instance(mock<string[]>()),
  }: {
    feeds?: { [x: string]: Feed };
    feedNames?: string[];
  } = {}) {
    const mockUserData = mock<UserData>();

    when(mockUserData.feeds).thenReturn(feeds);
    when(mockUserData.feedNames).thenReturn(feedNames);

    const mockedDatabase = mockDatabase();

    when(mockedDatabase.getUserData(anything())).thenResolve(
      resolvableInstance(mockUserData)
    );

    return { mockUserData, mockedDatabase };
  }

  test('Gets user data with the "throw if user was not found" flag set to true', async () => {
    const mocks = await mockHandlerInput({
      locale: null,
    });

    const { mockedDatabase } = mockLaunchRequest();

    await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

    verify(mockedDatabase.getUserData(anything())).once();
    const [getUserDataOptions] = capture(mockedDatabase.getUserData).last();
    expect(getUserDataOptions).toMatchObject<GetUserDataOptions>({
      throwIfUserWasNotFound: true,
    });
  });

  test('If the getUserData function throws an error stating that no user was found, the launch handler does not fail and no directive is added to the response', async () => {
    const mocks = await mockHandlerInput({
      locale: null,
    });

    const mockedDatabase = mockDatabase();
    when(mockedDatabase.getUserData(anything())).thenThrow(
      new NoUserDataError()
    );

    await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

    verify(mocks.mockedResponseBuilder.addDirective(anything())).never();
  });

  test('If any unexpected error is found, it is thrown', async () => {
    const mocks = await mockHandlerInput({
      locale: null,
    });

    const expectedError = new Error();

    const mockedDatabase = mockDatabase();
    when(mockedDatabase.getUserData(anything())).thenThrow(expectedError);

    expect(() =>
      LaunchRequestHandler.handle(mocks.instanceHandlerInput)
    ).rejects.toBe(expectedError);
  });

  function directiveHasDynamicEntities(
    directive: Directive
  ): directive is dialog.DynamicEntitiesDirective {
    return (directive as dialog.DynamicEntitiesDirective).types !== undefined;
  }

  test("Obtains the user's feed data and creates slot values from their feed names", () =>
    fc.assert(
      fc.asyncProperty(fc.array(fc.string()), async (feedNames) => {
        const mocks = await mockHandlerInput({
          locale: null,
        });

        const { mockedDatabase } = mockLaunchRequest({
          feedNames,
        });

        await LaunchRequestHandler.handle(mocks.instanceHandlerInput);

        verify(mockedDatabase.getUserData(anything())).once();
        const [getUserDataOptions] = capture(mockedDatabase.getUserData).last();
        expect(getUserDataOptions).toMatchObject<GetUserDataOptions>({
          throwIfUserWasNotFound: true,
        });

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
    ));
});

import { getUserId } from 'ask-sdk-core';
import fc from 'fast-check';
import { initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import {
  anything,
  capture,
  deepEqual,
  instance,
  verify,
  when,
} from 'ts-mockito';
import { collectionNames } from '../../src/database/FirebasePersistenceAdapter';
import { AuthCode, UserDocData } from '../../src/database/UserData';
import { authCodeString } from '../helpers/fast-check/arbitraries/misc';
import {
  createDatabaseHandler,
  CreateDatabaseHandlerResult,
  createPersistenceAdapter,
} from '../helpers/mocks/mockDatabase';
import {
  mockUserRefId,
  mockCollectionFirestore,
  mockRef,
  mockQuery,
} from '../helpers/mocks/mockFirebase';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));

jest.mock('../../src/database/firebaseServiceAccountKey', () => null);

jest.mock('ask-sdk-core');

test('Creating a new persistence adapter initializes the database', () => {
  const { appMock } = createPersistenceAdapter();

  expect(mocked(initializeApp)).toHaveBeenCalled();
  verify(appMock.firestore()).once();
});

describe('setAuthCode', () => {
  function testSetAuthCode(
    callback: (
      userId: string,
      code: AuthCode,
      isUserDataCached: boolean,
      result: CreateDatabaseHandlerResult
    ) => void | Promise<void>
  ) {
    return async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.record<AuthCode, fc.RecordConstraints>(
            {
              code: authCodeString,
              expirationDate: fc.date({ min: new Date() }),
            },
            {
              withDeletedKeys: false,
            }
          ),
          fc.boolean(),
          async (userId, code: AuthCode, isUserDataCached) => {
            const result = await createDatabaseHandler();

            if (isUserDataCached) {
              result.persistentAttributesHolder.attributes = {
                feeds: null,
                feedNames: null,
              };
            }

            await callback(userId, code, isUserDataCached, result);
          }
        )
      );
    };
  }

  test(
    'if the user does not exist, it creates a new one',
    testSetAuthCode(async (userId, code, _, result) => {
      const { databaseHandler, firestoreMock } = result;

      mocked(getUserId).mockReturnValue(userId);

      const { collectionMock } = mockCollectionFirestore({
        firestoreMock,
        collectionPath: collectionNames.users,
      });

      mockQuery({ empty: true, collectionMock });

      const { collectionMock: authCollectionMock } = mockCollectionFirestore({
        firestoreMock,
        collectionPath: collectionNames.authCodes,
      });

      when(authCollectionMock.doc(anything())).thenReturn(instance(mockRef()));

      await databaseHandler.setAuthCode(code);

      verify(collectionMock.add(anything())).once();

      const [userDocData] = capture(collectionMock.add).last();
      expect(userDocData).toMatchObject<UserDocData>({ userId });
    })
  );

  test(
    'if the user exists, sets the code in a document with the same id as the user in auth codes collection',
    testSetAuthCode(async (userId, code, _, result) => {
      const { databaseHandler, firestoreMock } = result;

      mockUserRefId({ firestoreMock, id: userId });

      const { collectionMock } = mockCollectionFirestore({
        firestoreMock,
        collectionPath: collectionNames.authCodes,
      });

      const refMock = mockRef();

      when(collectionMock.doc(userId)).thenCall(() => instance(refMock));

      await databaseHandler.setAuthCode(code);

      verify(refMock.set(deepEqual(code))).once();
    })
  );
});

describe('getUserData', () => {
  test.todo('throws an error if the user does not exist');

  test.todo('retrieves user data (based on locale) and ref if it exists');
});

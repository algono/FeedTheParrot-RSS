import { getLocale, getUserId } from 'ask-sdk-core';
import fc from 'fast-check';
import { initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import {
  anything,
  capture,
  deepEqual,
  instance,
  resetCalls,
  verify,
  when,
} from 'ts-mockito';
import { collectionNames } from '../../src/database/FirebasePersistenceAdapter';
import { AuthCode, UserData, UserDocData } from '../../src/database/UserData';
import { NoUserDataError } from '../../src/logic/Errors';
import { feedRecord } from '../helpers/fast-check/arbitraries/feed';
import { authCodeString } from '../helpers/fast-check/arbitraries/misc';
import { availableLocales } from '../helpers/helperTests';
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
  mockCollectionFromRef,
  mockQueryDocumentSnapshot,
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

      mockQuery({ empty: true, queryMock: collectionMock });

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
  test('throws an error if the user does not exist and the "throwIfUserWasNotFound" flag is true', async () => {
    const { databaseHandler, firestoreMock } = await createDatabaseHandler();

    mockUserRefId({ firestoreMock, id: null });

    await expect(() =>
      databaseHandler.getUserData({ throwIfUserWasNotFound: true })
    ).rejects.toBeInstanceOf(NoUserDataError);
  });

  test('returns an UserData object with null feeds and feedNames if the user does not exist and the "throwIfUserWasNotFound" flag is false, null or undefined', async () => {
    const flagStates: readonly boolean[] = [false, null, undefined] as const;
    flagStates.forEach(async (throwIfUserWasNotFound) => {
      const { databaseHandler, firestoreMock } = await createDatabaseHandler();

      mockUserRefId({ firestoreMock, id: null });

      const userData = await databaseHandler.getUserData({
        throwIfUserWasNotFound,
      });

      expect(userData).toMatchObject<UserData>({
        feeds: null,
        feedNames: null,
      });
    });
  });

  test('If it is called a second time and the first time the user did not exist, it does not call the database to check it again', async () => {
    const { databaseHandler, firestoreMock } = await createDatabaseHandler();

    mockUserRefId({ firestoreMock, id: null });

    await expect(() =>
      databaseHandler.getUserData({
        throwIfUserWasNotFound: true,
      })
    ).rejects.toBeInstanceOf(NoUserDataError);

    resetCalls(firestoreMock);

    await expect(() =>
      databaseHandler.getUserData({
        throwIfUserWasNotFound: true,
      })
    ).rejects.toBeInstanceOf(NoUserDataError);

    verify(firestoreMock.collection(anything())).never();
  });

  test('retrieves user data (based on locale) and ref if it exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.boolean(),
        fc.constantFrom(...availableLocales),
        fc.array(feedRecord()),
        async (userId, throwIfUserWasNotFound, locale, expectedFeeds) => {
          mocked(getLocale).mockReturnValue(locale);

          const {
            databaseHandler,
            firestoreMock,
            t,
          } = await createDatabaseHandler({ locale });

          const nameField = t('FEED_NAME_FIELD');

          const feedSnapshots = expectedFeeds.map((feed) => {
            const { name, ...data } = feed;
            data[nameField] = name;

            const snapshot = mockQueryDocumentSnapshot();

            when(snapshot.data()).thenReturn(data);

            return instance(snapshot);
          });

          const { refMock } = mockUserRefId({ firestoreMock, id: userId });

          const { collectionMock } = mockCollectionFromRef({ refMock });

          const { queryMock, querySnapshotMock } = mockQuery({
            queryMock: collectionMock,
          });

          when(querySnapshotMock.forEach(anything())).thenCall((callback) =>
            feedSnapshots.forEach(callback)
          );

          const { feeds, feedNames } = await databaseHandler.getUserData({
            throwIfUserWasNotFound,
          });

          const [collectionName] = capture(refMock.collection).last();
          expect(collectionName).toEqual(collectionNames.feeds);

          const [orderByField] = capture(queryMock.orderBy).last();
          expect(orderByField).toEqual(nameField);

          expect(feeds).toMatchObject(
            // object with properties like {"feed.name": "feed"}
            expectedFeeds.reduce((acc, value) => {
              acc[value.name] = value;
              return acc;
            }, {})
          );
          expect(feedNames).toEqual(expectedFeeds.map((feed) => feed.name));
        }
      )
    );
  });
});

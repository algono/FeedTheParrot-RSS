import { getLocale, getUserId } from 'ask-sdk-core';
import fc from 'fast-check';
import { initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import {
  anything,
  capture,
  instance,
  mock,
  resetCalls,
  verify,
  when,
} from 'ts-mockito';
import { UserDataSessionAttributes } from '../../src/database/Database';
import {
  collectionNames,
  HasFeedFiltersDb,
} from '../../src/database/FirebasePersistenceAdapter';
import {
  AuthCode,
  authCodeToDB,
  UserData,
  UserDocData,
} from '../../src/database/UserData';
import { NoUserDataError } from '../../src/logic/Errors';
import { Feed } from '../../src/logic/Feed';
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
  mockQuery,
  mockCollectionFromRef,
  mockQueryDocumentSnapshot,
} from '../helpers/mocks/mockFirebase';
import { resolvableInstance } from '../helpers/ts-mockito/resolvableInstance';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));

jest.mock('aws-sdk', () => ({
  STS: jest.fn(),
  DynamoDB: {
    DocumentClient: jest.fn(),
  },
}));

jest.mock('../../src/database/firebaseServiceAccountKey', () => null);

jest.mock('ask-sdk-core');

test('Creating a new persistence adapter initializes the database', async () => {
  const { appMock } = await createPersistenceAdapter();

  expect(mocked(initializeApp)).toHaveBeenCalled();
  verify(appMock.firestore()).once();
});

describe('setAuthCode', () => {
  function testSetAuthCode(
    callback: (
      userId: string,
      code: AuthCode,
      isUserDataCached: boolean,
      result: CreateDatabaseHandlerResult,
      userRefId?: string
    ) => void | Promise<void>,
    needsUserRefId: boolean = false
  ) {
    return async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.record<AuthCode, fc.RecordConstraints<keyof AuthCode>>(
            {
              code: authCodeString,
              expirationDate: fc.date({ min: new Date() }),
            },
            {
              withDeletedKeys: false,
            }
          ),
          fc.boolean(),
          fc.boolean(),
          needsUserRefId ? fc.string({ minLength: 1 }) : fc.constant(undefined),
          async (
            userId,
            code: AuthCode,
            isUserDataCached,
            initDynamoDb,
            userRefId?: string
          ) => {
            const result = await createDatabaseHandler({ initDynamoDb });

            if (isUserDataCached) {
              result.persistentAttributesHolder.attributes = {
                feeds: null,
                feedNames: null,
              };
            }

            await callback(userId, code, isUserDataCached, result, userRefId);
          }
        )
      );
    };
  }

  // Check that the auth code was stored properly
  function verifySetAuthCode(
    clientMock: AWS.DynamoDB.DocumentClient,
    userId: string,
    code: AuthCode
  ) {
    const [item] = capture(clientMock.put).last();
    return expect(item).toMatchObject({
      Item: {
        id: userId,
        ...authCodeToDB(code),
      },
    });
  }

  test(
    'if the user does not exist, it creates a new one and sets the code in a document with the same id as the created user',
    testSetAuthCode(async (userId, code, _, result) => {
      const { databaseHandler, firestoreMock, clientMock } = result;

      mocked(getUserId).mockReturnValue(userId);

      const { collectionMock } = mockCollectionFirestore({
        firestoreMock,
        collectionPath: collectionNames.users,
      });

      mockQuery({ empty: true, queryMock: collectionMock });

      await databaseHandler.setAuthCode(code);

      verify(collectionMock.add(anything())).once();

      const [userDocData] = capture(collectionMock.add).last();
      expect(userDocData).toMatchObject<UserDocData>({ userId });

      verifySetAuthCode(clientMock, userId, code);
    })
  );

  test(
    'if the user exists, sets the code in a document with the same id as the user',
    testSetAuthCode(async (userId, code, _, result, userRefId) => {
      const { databaseHandler, firestoreMock, clientMock } = result;

      mocked(getUserId).mockReturnValue(userId);

      mockUserRefId({ firestoreMock, id: userRefId });

      await databaseHandler.setAuthCode(code);

      verifySetAuthCode(clientMock, userId, code);
    }, true)
  );

  function basicAuthCodeMockInstance() {
    const authCodeMock = mock<AuthCode>();
    const dateMock = mock<Date>();

    when(dateMock.getTime()).thenReturn(0);
    when(authCodeMock.expirationDate).thenCall(() => instance(dateMock));

    return instance(authCodeMock);
  }

  test('If there is an unhandled error while retrieving the user id from the database (in the process of saving the auth code), the error is thrown', async () => {
    const { databaseHandler, firestoreMock, persistentAttributesHolder } =
      await createDatabaseHandler();

    // To prevent the user id being retrieved when getting persistent attributes, we cache some null values
    persistentAttributesHolder.attributes = {
      feeds: null,
      feedNames: null,
    };

    const expectedError = new Error();
    when(firestoreMock.collection(anything())).thenThrow(expectedError);

    await expect(() =>
      databaseHandler.setAuthCode(basicAuthCodeMockInstance())
    ).rejects.toBe(expectedError);
  });

  test('If the auth code is null or undefined, the auth codes collection in the database is never used/called', async () => {
    const authCodeValues: readonly AuthCode[] = [null, undefined] as const;

    for (const authCode of authCodeValues) {
      const {
        databaseHandler,
        firestoreMock,
        clientMock,
        persistentAttributesHolder,
      } = await createDatabaseHandler();

      persistentAttributesHolder.attributes = {
        feeds: null,
        feedNames: null,
      };

      mockUserRefId({ firestoreMock });

      when(clientMock.put(anything())).thenCall(() => {
        throw new Error(
          'The auth codes collection in the database was used/called'
        );
      });

      await databaseHandler.setAuthCode(authCode);
    }
  });

  test('(aws-sdk) If STS assumeRole throws an error, the callback should throw an error too', async () => {
    const {
      databaseHandler,
      stsMock,
      firestoreMock,
      persistentAttributesHolder,
    } = await createDatabaseHandler();

    persistentAttributesHolder.attributes = {
      feeds: null,
      feedNames: null,
    };

    mockUserRefId({ firestoreMock });

    when(stsMock.assumeRole(anything(), anything())).thenCall(
      (_cfg, callback) => callback(new Error(), null)
    );

    await expect(() =>
      databaseHandler.setAuthCode(basicAuthCodeMockInstance())
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('getUserData', () => {
  test('if the user data is already cached in session attributes, it is returned without getting any persistent attributes', async () => {
    const cachedUserData = resolvableInstance(mock<UserData>());
    const sessionAttributes: UserDataSessionAttributes = {
      userData: cachedUserData,
    };

    const { databaseHandler, mockedAttributesManager } =
      await createDatabaseHandler({
        sessionAttributes,
      });

    const userData = await databaseHandler.getUserData();

    expect(userData).toBe(cachedUserData);

    verify(mockedAttributesManager.getPersistentAttributes()).never();
  });

  test('throws an error if the user does not exist and the "throwIfUserWasNotFound" flag is true', async () => {
    const { databaseHandler, firestoreMock } = await createDatabaseHandler();

    mockUserRefId({ firestoreMock, id: null });

    await expect(() =>
      databaseHandler.getUserData({ throwIfUserWasNotFound: true })
    ).rejects.toBeInstanceOf(NoUserDataError);
  });

  test('returns an UserData object with null feeds and feedNames if the user does not exist and the "throwIfUserWasNotFound" flag is false, null or undefined', async () => {
    const flagStates: readonly boolean[] = [false, null, undefined] as const;
    for (const throwIfUserWasNotFound of flagStates) {
      const { databaseHandler, firestoreMock } = await createDatabaseHandler();

      mockUserRefId({ firestoreMock, id: null });

      const userData = await databaseHandler.getUserData({
        throwIfUserWasNotFound,
      });

      expect(userData).toMatchObject<UserData>({
        feeds: null,
        feedNames: null,
      });
    }
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

          const { databaseHandler, firestoreMock, t } =
            await createDatabaseHandler({ locale });

          const nameField = t('FEED_NAME_FIELD');

          const feedSnapshots = expectedFeeds.map((feed) => {
            const { name, filters, ...data }: Feed & HasFeedFiltersDb = feed;
            data[nameField] = name;

            data.filterByText = filters.text.values;
            data.filterByCategory = filters.category.values;
            data.filterByTextMatchAll = filters.text.matchAll === 'all';
            data.filterByCategoryMatchAll = filters.category.matchAll === 'all';

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

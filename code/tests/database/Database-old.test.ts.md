```ts
import fc from 'fast-check';
import { firestore, initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import {
  anyNumber,
  anyString,
  anything,
  capture,
  instance,
  mock,
  verify,
  when,
} from 'ts-mockito';
import { Database } from '../../src/database/Database';
import {
  collectionNames,
  FirebasePersistenceAdapter,
} from '../../src/database/FirebasePersistenceAdapter';
import { AuthCode, UserData } from '../../src/database/UserData';
import { NoUserDataError } from '../../src/logic/Errors';
import { allTranslationsFrom } from '../helpers/allTranslationsFrom';
import { feedRecord } from '../helpers/fast-check/arbitraries/feed';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { resolvableInstance } from '../helpers/ts-mockito/resolvableInstance';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));

jest.mock('../../src/database/firebaseServiceAccountKey', () => null);

function clearState() {
  // TODO: Implement an updated version of this function
}

beforeEach(clearState);

test('Creating a new Firebase Persistence Adapter initializes the database', () => {
  new FirebasePersistenceAdapter();
  expect(mocked(initializeApp)).toHaveBeenCalled();
});

function mockCollection() {
  const collectionMock = mock<
    FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
  >();

  when(collectionMock.add(anything())).thenResolve(null);

  return collectionMock;
}

function mockCollectionFirestore(collectionPath?: string) {
  const collectionMock = mockCollection();

  const firestoreMock = mock<FirebaseFirestore.Firestore>();

  when(
    firestoreMock.collection(collectionPath ? collectionPath : anyString())
  ).thenCall(() => resolvableInstance(collectionMock));

  mocked(firestore).mockImplementation(() => instance(firestoreMock));
  return { firestoreMock, collectionMock };
}

function mockCollectionFromRef() {
  const collectionMock = mockCollection();

  const refMock = mock<
    FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
  >();

  when(refMock.collection(anyString())).thenCall(() =>
    resolvableInstance(collectionMock)
  );

  return { refMock, collectionMock };
}

function mockQuery({
  empty = false,
  collectionMock = mockCollectionFirestore().collectionMock,
}: {
  empty?: boolean;
  collectionMock?: FirebaseFirestore.CollectionReference<
    FirebaseFirestore.DocumentData
  >;
} = {}) {
  when(collectionMock.limit(anyNumber())).thenCall(() =>
    resolvableInstance(collectionMock)
  );

  when(collectionMock.orderBy(anyString())).thenCall(() =>
    resolvableInstance(collectionMock)
  );

  const querySnapshotMock = mock<
    FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
  >();

  when(querySnapshotMock.empty).thenReturn(empty);

  when(collectionMock.get()).thenCall(() =>
    Promise.resolve(resolvableInstance(querySnapshotMock))
  );

  when(collectionMock.where(anything(), anything(), anything())).thenCall(() =>
    instance(collectionMock)
  );

  return { queryMock: collectionMock, querySnapshotMock };
}

function mockUserRefId(id?: string) {
  const { querySnapshotMock } = mockQuery({
    collectionMock: mockCollectionFirestore(collectionNames.users)
      .collectionMock,
  });

  const queryDocumentSnapshotMock = mock<
    FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  >();

  when(queryDocumentSnapshotMock.id).thenReturn(id);

  when(querySnapshotMock.docs).thenCall(() => [
    instance(queryDocumentSnapshotMock),
  ]);

  return { querySnapshotMock, queryDocumentSnapshotMock };
}

async function createDatabaseHandler() {
  const persistenceAdapter = new FirebasePersistenceAdapter();

  const {
    mockedAttributesManager,
    instanceRequestEnvelope,
  } = await mockHandlerInput();

  const persistentAttributesHolder: { attributes?: UserData } = {};

  when(mockedAttributesManager.getPersistentAttributes()).thenCall(() =>
    persistentAttributesHolder.attributes
      ? persistentAttributesHolder.attributes
      : persistenceAdapter.getAttributes(instanceRequestEnvelope)
  );

  when(mockedAttributesManager.setPersistentAttributes(anything())).thenCall(
    (attributes) => {
      persistentAttributesHolder.attributes = attributes;
    }
  );

  when(mockedAttributesManager.savePersistentAttributes()).thenCall(() =>
    persistenceAdapter.saveAttributes(
      instanceRequestEnvelope,
      persistentAttributesHolder.attributes
    )
  );

  const attributesManager = instance(mockedAttributesManager);
  const databaseHandler = Database.use(attributesManager);

  return {
    mockedAttributesManager,
    attributesManager,
    persistentAttributesHolder,
    databaseHandler,
  };
}

function testIfAddedToCollectionFn<T>(
  expectedCollectionName: string,
  method: { (data: T): Promise<any> },
  recordModel: { [K in keyof T]: fc.Arbitrary<T[K]> }
) {
  return async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record<T, fc.RecordConstraints>(recordModel, {
          withDeletedKeys: false,
        }),
        async (data: T) => {
          clearState();

          const { firestoreMock, collectionMock } = mockCollectionFirestore();

          await method(data);

          const [collectionName] = capture(firestoreMock.collection).last();

          expect(collectionName).toEqual(expectedCollectionName);

          const [addedData] = capture(collectionMock.add).last();

          expect(addedData).toEqual(data);
        }
      )
    );
  };
}

test('setAuthCode sets the code in a document with the same id as the user in auth codes collection', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string(),
      fc.record<AuthCode, fc.RecordConstraints>(
        {
          code: fc.string(),
          expirationDate: fc.date({ min: new Date() }),
        },
        {
          withDeletedKeys: false,
        }
      ),
      async (userId, code) => {
        mockUserRefId(userId);

        const { collectionMock } = mockCollectionFirestore(
          collectionNames.authCodes
        );

        const documentReferenceMock = mock<
          FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
        >();

        when(collectionMock.doc(userId)).thenCall(() =>
          instance(documentReferenceMock)
        );

        const { databaseHandler } = await createDatabaseHandler();

        databaseHandler.setAuthCode(code);

        verify(documentReferenceMock.set(code)).once();
      }
    )
  );
});

test('getUserData throws an error if the user does not exist', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (userId) => {
      clearState();
      mockQuery({
        empty: true,
      });

      await expect(() =>
        Database.instance.getUserData(userId)
      ).rejects.toBeInstanceOf(NoUserDataError);
    })
  );
});

test('getUserData retrieves user data and ref if it exists', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record<UserData, fc.RecordConstraints>(
        { userId: fc.string() },
        { withDeletedKeys: false }
      ),
      async (expectedUserData: UserData) => {
        clearState();

        const { querySnapshotMock } = mockQuery({
          empty: false,
        });

        const queryDocumentSnapshotMock = mock<
          FirebaseFirestore.QueryDocumentSnapshot<
            FirebaseFirestore.DocumentData
          >
        >();

        const documentReferenceMock = mock<
          FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
        >();

        when(queryDocumentSnapshotMock.ref).thenReturn(documentReferenceMock);

        when(queryDocumentSnapshotMock.data()).thenReturn(expectedUserData);

        when(querySnapshotMock.docs).thenCall(() => [
          instance(queryDocumentSnapshotMock),
        ]);

        const { userData, userDataRef } = await Database.instance.getUserData(
          expectedUserData.userId
        );

        expect(userData).toStrictEqual(expectedUserData);

        /**
         * Equality check done this way because something like
         * 'expect(userDataRef).toBe(documentReferenceMock)'
         * throws a weird exception if it fails, due to the mock being a proxy
         * It seems to be an issue with jest, so this is a fine workaround
         */
        expect(userDataRef === documentReferenceMock).toBe(true);
      }
    )
  );
});

test(
  'Creating a new user adds user data to users collection',
  testIfAddedToCollectionFn<UserData>(
    collectionNames.users,
    (data) => Database.instance.createNewUser(data),
    { userId: fc.string() }
  )
);

test('getFeedsFromUser gets feeds and feedNames based on the name field', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom(
        ...(await allTranslationsFrom<string>('FEED_NAME_FIELD'))
      ),
      fc.array(feedRecord()),
      async (nameField, expectedFeeds) => {
        clearState();

        const feedSnapshots = expectedFeeds.map((feed) => {
          const { name, ...data } = feed;
          data[nameField] = name;

          const snapshot = mock<
            FirebaseFirestore.QueryDocumentSnapshot<
              FirebaseFirestore.DocumentData
            >
          >();

          when(snapshot.data()).thenReturn(data);

          return instance(snapshot);
        });

        const { refMock, collectionMock } = mockCollectionFromRef();

        const { queryMock, querySnapshotMock } = mockQuery({
          empty: false,
          collectionMock,
        });

        when(querySnapshotMock.forEach(anything())).thenCall((callback) =>
          feedSnapshots.forEach(callback)
        );

        const { feeds, feedNames } = await Database.instance.getFeedsFromUser(
          resolvableInstance(refMock),
          nameField
        );

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
```
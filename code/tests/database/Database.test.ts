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
  when,
} from 'ts-mockito';
import {
  AuthCode,
  collectionNames,
  Database,
  UserData,
} from '../../src/database/Database';
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
  // Reset the database instance to avoid passing state between tests
  // (it might not be the best way to do it, but it is the only one I have found for now)
  Database['_instance'] = undefined;
}

beforeEach(clearState);

test('Getting a Database instance initializes the database', () => {
  Database.instance;
  expect(mocked(initializeApp)).toHaveBeenCalled();
});

function mockCollection() {
  const collectionMock = mock<
    FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
  >();

  when(collectionMock.add(anything())).thenResolve(null);

  const firestoreMock = mock<FirebaseFirestore.Firestore>();

  when(firestoreMock.collection(anyString())).thenCall(() =>
    instance(collectionMock)
  );

  mocked(firestore).mockImplementation(() => instance(firestoreMock));
  return { firestoreMock, collectionMock };
}

function mockQuery({ empty }: { empty: boolean }) {
  const queryMock = mock<
    FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
  >();

  when(queryMock.limit(anyNumber())).thenCall(() => instance(queryMock));

  const querySnapshotMock = mock<
    FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
  >();

  when(querySnapshotMock.empty).thenReturn(empty);

  when(queryMock.get()).thenCall(() =>
    Promise.resolve(resolvableInstance(querySnapshotMock))
  );

  const { firestoreMock, collectionMock } = mockCollection();

  when(collectionMock.where(anything(), anything(), anything())).thenCall(() =>
    instance(queryMock)
  );

  return { firestoreMock, collectionMock, queryMock, querySnapshotMock };
}

function testIfAddedToCollectionFn<T>(
  expectedCollectionName: string,
  method: { (data: T): Promise<any> },
  recordModel: { [K in keyof T]: fc.Arbitrary<T[K]> }
) {
  return async () => {
    await fc.assert(
      fc.asyncProperty(fc.record<T>(recordModel), async (data) => {
        clearState();

        const { firestoreMock, collectionMock } = mockCollection();

        await method(data as T);

        const [collectionName] = capture(firestoreMock.collection).last();

        expect(collectionName).toEqual(expectedCollectionName);

        const [addedData] = capture(collectionMock.add).last();

        expect(addedData).toEqual(data);
      })
    );
  };
}

test(
  'addAuthCode adds code to auth codes collection',
  testIfAddedToCollectionFn<AuthCode>(
    collectionNames.authCodes,
    (data) => Database.instance.addAuthCode(data),
    {
      uid: fc.string(),
      code: fc.string(),
      expirationDate: fc.date({ min: new Date() }),
    }
  )
);

test('getUserData creates a new user if it does not exist', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (userId) => {
      clearState();
      mockQuery({ empty: true });

      const spyCreateNewUser = jest
        .spyOn(Database.instance, 'createNewUser')
        .mockImplementation();

      await Database.instance.getUserData(userId);

      expect(spyCreateNewUser).toHaveBeenLastCalledWith<UserData[]>({
        userId: userId,
      });
    })
  );
});

test('getUserData retrieves user data and ref if it exists', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record<UserData>({ userId: fc.string() }),
      async (expectedUserData) => {
        clearState();

        const { querySnapshotMock } = mockQuery({ empty: false });

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

        expect(userData).toStrictEqual(expectedUserData as UserData);

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

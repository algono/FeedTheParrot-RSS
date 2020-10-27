import fc from 'fast-check';
import { firestore, initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import { anyString, anything, capture, instance, mock, when } from 'ts-mockito';
import {
  AuthCode,
  collectionNames,
  Database,
  UserData,
} from '../../src/database/Database';

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

function testIfAddedToCollectionFn<T>(
  expectedCollectionName: string,
  method: { (data: T): Promise<any> },
  recordModel: { [K in keyof T]: fc.Arbitrary<T[K]> }
) {
  return async () => {
    await fc.assert(
      fc.asyncProperty(fc.record<T>(recordModel), async (data) => {
        clearState();

        const collectionMock = mock<
          FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
        >();

        when(collectionMock.add(anything())).thenResolve(null);

        const firestoreMock = mock<FirebaseFirestore.Firestore>();

        when(firestoreMock.collection(anyString())).thenCall(() =>
          instance(collectionMock)
        );

        mocked(firestore).mockImplementation(() => instance(firestoreMock));

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

test(
  'Creating a new user adds user data to users collection',
  testIfAddedToCollectionFn<UserData>(
    collectionNames.users,
    (data) => Database.instance.createNewUser(data),
    { userId: fc.string() }
  )
);

import { app, initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import { anything, instance, mock, when } from 'ts-mockito';
import { Database, DatabaseHandler } from '../../../src/database/Database';
import { FirebasePersistenceAdapter } from '../../../src/database/FirebasePersistenceAdapter';
import { UserData } from '../../../src/database/UserData';
import { mockHandlerInput } from './HandlerInputMocks';

export function mockDatabase() {
  const mockedDatabase = mock<DatabaseHandler>();
  jest
    .spyOn(Database, 'use')
    .mockImplementation(() => instance(mockedDatabase));
  return mockedDatabase;
}

export function createPersistenceAdapter() {
  const appMock = mock<app.App>();

  const firestoreMock = mock<FirebaseFirestore.Firestore>();
  when(appMock.firestore()).thenCall(() => instance(firestoreMock));

  mocked(initializeApp).mockImplementation(() => instance(appMock));

  return {
    persistenceAdapter: new FirebasePersistenceAdapter(),
    appMock,
    firestoreMock,
  };
}

export async function createDatabaseHandler() {
  const { persistenceAdapter } = createPersistenceAdapter();

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
